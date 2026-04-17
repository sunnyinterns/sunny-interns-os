import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED = [
  'company_name','contact_name','email','contact_emails','whatsapp','phone','website',
  'address','address_street','address_postal_code','address_city','address_country','address_google_place_id',
  'registration_number','tax_number',
  'bank_name','bank_account_number','bank_account_holder','bank_swift',
  'notes','is_active','is_default',
]

function sanitize(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) out[k] = body[k]
  return out
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const raw = await request.json() as Record<string, unknown>
  const body = sanitize(raw)
  if (Object.keys(body).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const { data, error } = await supabase.from('visa_agents').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Si défini comme par défaut, retirer les autres
  if (raw.is_default === true) {
    await supabase.from('visa_agents').update({ is_default: false }).neq('id', id)
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabase.from('visa_agents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
