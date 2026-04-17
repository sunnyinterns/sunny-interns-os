import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULTS: Record<string, unknown> = {
  retroplanning_delays: {
    billet: 40,
    paiement: 30,
    visa_soumis: 30,
    visa_recu: 7,
    chauffeur_notif: 2,
  },
  vat_rate: 20,
  notifications: {
    email_new_lead: true,
    email_payment_received: true,
    web_push_enabled: false,
  },
  app_name: 'Bali Interns OS',
  timezone: 'Asia/Makassar',
  default_locale: 'fr',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key } = await params
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ key, value: data?.value ?? DEFAULTS[key] ?? null })
  } catch {
    return NextResponse.json({ key, value: DEFAULTS[key] ?? null })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key } = await params
  try {
    const body = await request.json() as { value: unknown }
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value: body.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
