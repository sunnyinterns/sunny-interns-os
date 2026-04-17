import { createClient } from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await svc()
    .from('supplier_invoices')
    .select('*, visa_agent_invoice_lines(*)')
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc()
  const body = await request.json() as Record<string, unknown>
  const visaLines = (body.visa_lines as Array<{
    case_id?: string; intern_name?: string; visa_type?: string; amount_eur?: number
  }>) ?? []

  // Insert invoice
  const { data: inv, error } = await sb.from('supplier_invoices').insert({
    invoice_number:  body.invoice_number as string || null,
    supplier_name:   body.supplier_name as string,
    supplier_type:   body.supplier_type as string ?? 'other',
    category:        body.supplier_type as string ?? 'other',
    amount_eur:      body.amount_eur as number || null,
    amount_local:    body.amount_local as number || null,
    currency:        body.currency as string ?? 'IDR',
    exchange_rate:   body.exchange_rate as number || null,
    invoice_date:    body.invoice_date as string,
    due_date:        body.due_date as string || null,
    paid_at:         body.paid_at as string || null,
    payment_method:  body.payment_method as string || null,
    pdf_url:         body.pdf_url as string || null,
    notes:           body.notes as string || null,
  }).select().single()

  if (error || !inv) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })

  // Insert visa lines if any
  if (visaLines.length > 0) {
    const lines = visaLines
      .filter(l => l.case_id || l.intern_name)
      .map(l => ({
        supplier_invoice_id: inv.id,
        case_id:     l.case_id || null,
        intern_name: l.intern_name || null,
        visa_type:   l.visa_type || null,
        amount_eur:  l.amount_eur || null,
      }))
    if (lines.length > 0) {
      await sb.from('visa_agent_invoice_lines').insert(lines)

      // Create billing_entries (cost) for each case
      for (const l of lines) {
        if (!l.case_id || !l.amount_eur) continue
        await sb.from('billing_entries').insert({
          case_id:             l.case_id,
          type:                'cost',
          category:            'visa_agent',
          label:               `Agent visa ${l.visa_type ?? ''} — ${l.intern_name ?? ''}`,
          amount_eur:          l.amount_eur,
          supplier_invoice_id: inv.id,
        })
      }
    }
  }

  return NextResponse.json({ success: true, id: inv.id })
}
