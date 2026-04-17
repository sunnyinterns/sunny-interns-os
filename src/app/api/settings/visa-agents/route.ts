import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Champs autorisés - ne jamais envoyer 'name' (colonne inexistante)
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('visa_agents').select('*')
    .order('is_default', { ascending: false })
    .order('company_name', { ascending: true })
  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await request.json() as Record<string, unknown>
  const body = sanitize(raw)
  const { data, error } = await supabase.from('visa_agents').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (raw.is_default === true && data) {
    await supabase.from('visa_agents').update({ is_default: false }).neq('id', data.id)
  }
  return NextResponse.json(data, { status: 201 })
}
