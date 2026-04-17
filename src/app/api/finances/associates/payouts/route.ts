import { createClient } from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/finances/associates/payouts?period=2026-04
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const period = url.searchParams.get('period')

  let q = svc()
    .from('associate_payouts')
    .select('*, associates(name, assoc_role, share_pct, email)')
    .order('period_start', { ascending: false })

  if (period) q = q.ilike('period_label', `%${period}%`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/finances/associates/payouts — create payout or auto-generate for period
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc()
  const body = await request.json() as {
    mode?: 'auto' | 'manual'
    period_label?: string
    period_start?: string
    period_end?: string
    // manual fields
    associate_id?: string
    amount_due?: number
    amount_paid?: number
    paid_at?: string
    payment_method?: string
    payment_ref?: string
    notes?: string
  }

  // AUTO mode: compute revenue/costs from billing_entries for the period, split by share_pct
  if (body.mode === 'auto' && body.period_start && body.period_end) {
    // Revenue for period
    const { data: revenues } = await sb.from('billing_entries')
      .select('amount_eur')
      .eq('type', 'revenue')
      .gte('recorded_at', body.period_start)
      .lte('recorded_at', body.period_end)

    const { data: costs } = await sb.from('billing_entries')
      .select('amount_eur')
      .eq('type', 'cost')
      .gte('recorded_at', body.period_start)
      .lte('recorded_at', body.period_end)

    const { data: supplierCosts } = await sb.from('supplier_invoices')
      .select('amount_eur')
      .not('amount_eur', 'is', null)
      .gte('invoice_date', body.period_start)
      .lte('invoice_date', body.period_end)

    const grossRev = (revenues ?? []).reduce((s, r) => s + (r.amount_eur ?? 0), 0)
    const totalCosts = (costs ?? []).reduce((s, c) => s + (c.amount_eur ?? 0), 0)
      + (supplierCosts ?? []).reduce((s, c) => s + (c.amount_eur ?? 0), 0)
    const netProfit = grossRev - totalCosts

    // Get all active associates
    const { data: associates } = await sb.from('associates').select('*').eq('is_active', true)

    const payouts = []
    for (const assoc of associates ?? []) {
      const sharePct = assoc.share_pct ?? 0
      const amountDue = Math.round((netProfit * sharePct / 100) * 100) / 100

      const { data: payout } = await sb.from('associate_payouts').insert({
        associate_id: assoc.id,
        period_label: body.period_label ?? body.period_start,
        period_start: body.period_start,
        period_end: body.period_end,
        gross_revenue: grossRev,
        total_costs: totalCosts,
        net_profit: netProfit,
        share_pct: sharePct,
        amount_due: amountDue,
        amount_paid: 0,
        status: 'pending',
      }).select().single()

      payouts.push(payout)
    }

    return NextResponse.json({ created: payouts.length, net_profit: netProfit, payouts })
  }

  // MANUAL mode
  const { data, error } = await sb.from('associate_payouts').insert({
    associate_id: body.associate_id,
    period_label: body.period_label ?? '',
    period_start: body.period_start ?? new Date().toISOString().slice(0, 10),
    period_end: body.period_end ?? new Date().toISOString().slice(0, 10),
    amount_due: body.amount_due ?? 0,
    amount_paid: body.amount_paid ?? 0,
    paid_at: body.paid_at ?? null,
    payment_method: body.payment_method ?? null,
    payment_ref: body.payment_ref ?? null,
    notes: body.notes ?? null,
    status: body.paid_at ? 'paid' : 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/finances/associates/payouts — mark payout as paid
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id: string; amount_paid: number; payment_method?: string; payment_ref?: string }
  const { data, error } = await svc()
    .from('associate_payouts')
    .update({
      amount_paid: body.amount_paid,
      paid_at: new Date().toISOString(),
      payment_method: body.payment_method,
      payment_ref: body.payment_ref,
      status: 'paid',
    })
    .eq('id', body.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
