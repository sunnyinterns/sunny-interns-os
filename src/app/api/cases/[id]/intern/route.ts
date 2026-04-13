import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Récupérer l'intern_id du case
  const { data: caseRow } = await admin.from('cases').select('intern_id').eq('id', id).single()
  if (!caseRow?.intern_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Allowed mutable fields on interns
  const ALLOWED = new Set([
    'first_name', 'last_name', 'email', 'whatsapp', 'nationality', 'nationalities',
    'birth_date', 'passport_expiry', 'linkedin_url', 'school_country', 'school_name',
    'cv_url', 'local_cv_url', 'photo_id_url', 'passport_page4_url',
    'bank_statement_url', 'return_plane_ticket_url',
    'school_contact_first_name', 'school_contact_last_name', 'school_contact_phone',
    'emergency_contact_email', 'emergency_contact_name', 'emergency_contact_phone',
    'flight_departure_date', 'flight_return_date', 'flight_departure_city', 'flight_number',
    'spoken_languages', 'main_desired_job', 'stage_ideal', 'touchpoint', 'touchpoints',
    'preferred_language', 'source', 'referred_by_code',
    'commitment_price_accepted', 'commitment_budget_accepted', 'commitment_terms_accepted',
    'bali_phone', 'bali_address', 'dropoff_address',
  ])

  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.has(k))
  )

  const { data, error } = await admin
    .from('interns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', caseRow.intern_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
