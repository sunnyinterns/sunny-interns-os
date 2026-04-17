import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function parseJsonbNum(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'number') return v
  return parseFloat(String(v)) || fallback
}
function parseJsonbStr(v: unknown, fallback: string): string {
  if (v === null || v === undefined) return fallback
  return String(v).replace(/^"|"$/g, '') // strip JSON quotes if any
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Settings (anon key OK, no RLS on settings usually)
  const { data: rows } = await supabase.from('settings').select('key,value')
  const sm = Object.fromEntries((rows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]))

  const settings = {
    fiscal_year_start: parseJsonbStr(sm.fiscal_year_start, '01-01'),
    default_currency:  parseJsonbStr(sm.default_currency, 'EUR'),
    idr_eur_rate:      parseJsonbNum(sm.idr_eur_rate, 16500),
    usd_eur_rate:      parseJsonbNum(sm.usd_eur_rate, 0.92),
    sgd_eur_rate:      parseJsonbNum(sm.sgd_eur_rate, 0.70),
    driver_cost_idr:   parseJsonbNum(sm.driver_cost_idr, 400000),
  }

  // Founders — use admin client to bypass RLS on app_users
  const admin = createAdminClient()
  const { data: users } = await admin
    .from('app_users')
    .select('id,full_name,email,payout_pct,payout_basis,payment_method,wise_email,iban')
    .order('created_at')

  const DEFAULT_FOUNDERS = [
    { id: 'sidney', name: 'Sidney Ruby',    email: 'sidney.ruby@gmail.com', role: 'CEO & Fondateur', payout_pct: 15, payout_basis: 'margin', payment_method: 'Wise', wise_email: 'sidney.ruby@gmail.com', iban: '' },
    { id: 'charly', name: 'Charly Gestede', email: 'charly@bali-interns.com', role: 'Co-fondateur',   payout_pct: 85, payout_basis: 'margin', payment_method: 'Wise', wise_email: 'charly@bali-interns.com', iban: '' },
  ]

  const founders = (users && users.length >= 2)
    ? users.map((u: Record<string, unknown>) => ({
        id: u.id,
        name: u.full_name ?? u.email,
        email: u.email,
        role: u.email === 'sidney.ruby@gmail.com' ? 'CEO & Fondateur' : 'Co-fondateur',
        payout_pct: parseFloat(String(u.payout_pct ?? 0)),
        payout_basis: u.payout_basis ?? 'margin',
        payment_method: u.payment_method ?? 'Wise',
        wise_email: u.wise_email ?? u.email,
        iban: u.iban ?? '',
      }))
    : DEFAULT_FOUNDERS

  return NextResponse.json({ settings, founders })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { settings?: Record<string, unknown>; founders?: Record<string, unknown>[] }
  const admin = createAdminClient()

  // Upsert settings
  if (body.settings && Object.keys(body.settings).length) {
    const upserts = Object.entries(body.settings).map(([key, value]) => ({ key, value }))
    await supabase.from('settings').upsert(upserts, { onConflict: 'key' })
  }

  // Update founders payout config via admin
  for (const f of (body.founders ?? [])) {
    if (!f.id || String(f.id).length < 10) continue // skip local placeholder IDs
    await admin.from('app_users').update({
      payout_pct: f.payout_pct,
      payout_basis: f.payout_basis,
      payment_method: f.payment_method,
      wise_email: f.wise_email,
      iban: f.iban,
    }).eq('id', String(f.id))
  }

  return NextResponse.json({ success: true })
}
