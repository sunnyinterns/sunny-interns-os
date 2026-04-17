import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FOUNDER_KEYS = ['payout_pct','payout_basis','payment_method','wise_email','iban','notes']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load from settings table (key-value)
  const { data: rows } = await supabase.from('settings').select('key,value')
  const sm = Object.fromEntries((rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))

  const settings = {
    fiscal_year_start: sm.fiscal_year_start ?? '01-01',
    default_currency: sm.default_currency ?? 'EUR',
    idr_eur_rate: parseFloat(sm.idr_eur_rate ?? '16500'),
    usd_eur_rate: parseFloat(sm.usd_eur_rate ?? '0.92'),
    sgd_eur_rate: parseFloat(sm.sgd_eur_rate ?? '0.70'),
    auto_payout_calculation: sm.auto_payout_calculation === 'true',
    visa_cost_default_idr: parseFloat(sm.visa_cost_default_idr ?? '7500000'),
    tva_default_pct: parseFloat(sm.tva_default_pct ?? '0'),
  }

  // Load founders from app_users
  const { data: users } = await supabase.from('app_users').select('id,full_name,email,payout_pct,payout_basis,payment_method,wise_email,iban,notes').order('created_at')

  const founders = (users ?? []).map((u: Record<string, unknown>) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    role: (u.id as string).includes('sidney') ? 'CEO & Fondateur' : 'Co-fondateur',
    payout_pct: u.payout_pct ?? (u.email === 'sidney.ruby@gmail.com' ? 15 : 85),
    payout_basis: u.payout_basis ?? 'margin',
    payment_method: u.payment_method ?? 'Wise',
    wise_email: u.wise_email ?? u.email,
    iban: u.iban ?? '',
    notes: u.notes ?? '',
  }))

  return NextResponse.json({ settings, founders })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { settings: Record<string, unknown>; founders: Record<string, unknown>[] }

  // Upsert settings
  const settingsUpserts = Object.entries(body.settings ?? {}).map(([key, value]) => ({
    key, value: String(value),
  }))
  if (settingsUpserts.length) {
    await supabase.from('settings').upsert(settingsUpserts, { onConflict: 'key' })
  }

  // Update app_users payout config
  for (const f of (body.founders ?? [])) {
    const update: Record<string, unknown> = {}
    for (const k of FOUNDER_KEYS) if (k in f) update[k] = f[k]
    if (Object.keys(update).length && f.id) {
      await supabase.from('app_users').update(update).eq('id', f.id as string)
    }
  }

  return NextResponse.json({ success: true })
}
