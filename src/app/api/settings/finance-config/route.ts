import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FOUNDER_KEYS = ['payout_pct','payout_basis','payment_method','wise_email','iban','notes']

// jsonb can be number, string (with quotes), boolean — normalize to JS primitive
function fromJsonb(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'boolean') return v
  // string with JSON quotes like '"01-01"' → '01-01'
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); if (typeof p === 'string' || typeof p === 'number') return p } catch { /* */ }
    return v
  }
  return String(v)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase.from('settings').select('key,value')
  const sm: Record<string, unknown> = {}
  for (const r of (rows ?? [])) sm[r.key] = fromJsonb(r.value)

  const settings = {
    fiscal_year_start:       String(sm.fiscal_year_start ?? '01-01'),
    default_currency:        String(sm.default_currency ?? 'EUR'),
    idr_eur_rate:            Number(sm.idr_eur_rate ?? 16500),
    usd_eur_rate:            Number(sm.usd_eur_rate ?? 0.92),
    sgd_eur_rate:            Number(sm.sgd_eur_rate ?? 0.70),
    auto_payout_calculation: sm.auto_payout_calculation === true || sm.auto_payout_calculation === 'true',
    visa_cost_default_idr:   Number(sm.visa_cost_default_idr ?? 7500000),
    tva_default_pct:         Number(sm.tva_default_pct ?? 0),
  }

  const { data: users } = await supabase
    .from('app_users')
    .select('id,full_name,email,payout_pct,payout_basis,payment_method,wise_email,iban,notes,whatsapp')
    .order('created_at')

  const founders = (users ?? []).map((u: Record<string, unknown>) => ({
    id:             u.id,
    name:           u.full_name ?? '',
    email:          u.email ?? '',
    role:           (u.email as string)?.includes('sidney') ? 'CEO & Fondateur' : 'Co-fondateur',
    payout_pct:     Number(u.payout_pct ?? 0),
    payout_basis:   String(u.payout_basis ?? 'margin'),
    payment_method: String(u.payment_method ?? 'Wise'),
    wise_email:     String(u.wise_email ?? u.email ?? ''),
    iban:           String(u.iban ?? ''),
    notes:          String(u.notes ?? ''),
  }))

  return NextResponse.json({ settings, founders })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { settings?: Record<string, unknown>; founders?: Record<string, unknown>[] }

  // Upsert settings as jsonb
  if (body.settings) {
    const upserts = Object.entries(body.settings).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? JSON.stringify(value) : value,
    }))
    if (upserts.length) {
      await supabase.from('settings').upsert(upserts, { onConflict: 'key' })
    }
  }

  // Update founders
  for (const f of (body.founders ?? [])) {
    if (!f.id) continue
    const update: Record<string, unknown> = {}
    for (const k of FOUNDER_KEYS) if (k in f) update[k] = f[k]
    if (Object.keys(update).length) {
      await supabase.from('app_users').update(update).eq('id', f.id as string)
    }
  }

  return NextResponse.json({ success: true })
}
