import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json() as Record<string, unknown>
    const { data, error } = await supabase
      .from('cases')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        interns (
          id, first_name, last_name, email, whatsapp, nationality, gender, birth_date,
          passport_number, passport_expiry, passport_issue_city, passport_issue_date,
          linkedin_url, cv_url, photo_id_url, spoken_languages, english_level,
          main_desired_job, desired_sectors, stage_ideal, touchpoint, source,
          intern_level, diploma_track, qualification_debrief,
          school_contact_name, school_contact_email,
          emergency_contact_name, emergency_contact_phone, insurance_company,
          intern_address, intern_signing_city, mother_first_name, mother_last_name,
          housing_budget, housing_city, wants_scooter, intern_bank_name, intern_bank_iban,
          return_plane_ticket_url, bank_statement_url, passport_page4_url,
          private_comment_for_employer, referred_by_code, preferred_language,
          commitment_price_accepted, commitment_budget_accepted,
          commitment_terms_accepted, commitment_accepted_at, desired_end_date,
          portfolio_url, intern_bali_bank_name, intern_bali_bank_number
        ),
        schools ( id, name ),
        packages ( id, name, price_eur, visa_cost_idr ),
        visa_types ( id, code, name ),
        visa_agents ( id, company_name, email, whatsapp ),
        destinations ( id, name ),
        activity_feed ( id, action_type, description, created_at, created_by ),
        job_submissions (
          id, status, intern_interested, cv_revision_requested, notes_charly,
          jobs ( id, title, public_title, wished_start_date, wished_duration_months,
            companies ( id, name ),
            contacts ( id, first_name, last_name, email, whatsapp )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
