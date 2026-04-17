import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin
    .from('driver_invoices')
    .select('*, driver_suppliers(name), driver_invoice_lines(*, cases(id, interns(first_name, last_name)))')
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const body = await request.json() as { lines?: Record<string, unknown>[]; [k: string]: unknown }
  const lines = body.lines ?? []
  const invBody = { ...body }
  delete invBody.lines

  const { data: inv, error } = await admin.from('driver_invoices').insert(invBody).select().single()
  if (error || !inv) return NextResponse.json({ error: error?.message }, { status: 500 })

  if (lines.length > 0) {
    const lineRows = lines.map(l => ({ ...l, driver_invoice_id: inv.id }))
    await admin.from('driver_invoice_lines').insert(lineRows)
  }

  return NextResponse.json({ success: true, id: inv.id })
}
