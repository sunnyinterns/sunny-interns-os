import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

const FIELD_LABELS: Record<string, string> = {
  status: 'Statut',
  qualification_notes: 'Commentaire entretien',
  note_for_agent: 'Note pour agent visa',
  payment_amount: 'Montant paiement',
  payment_date: 'Date paiement',
  payment_type: 'Type paiement',
  invoice_number: 'Numéro facture',
  actual_start_date: 'Date début stage',
  actual_end_date: 'Date fin stage',
  flight_number: 'Numéro de vol',
  flight_departure_city: 'Ville départ',
  flight_arrival_time_local: 'Heure arrivée locale',
  billet_avion: 'Billet avion',
  papiers_visas: 'Documents visa',
  visa_recu: 'Visa reçu',
  convention_signee_check: 'Convention signée',
  chauffeur_reserve: 'Chauffeur réservé',
  fazza_transfer_sent: 'Virement FAZZA',
  fazza_transfer_amount_idr: 'Montant FAZZA (IDR)',
  welcome_kit_sent_at: 'Welcome kit envoyé',
  driver_booked: 'Chauffeur réservé',
  discount_percentage: 'Remise %',
  intern_level: 'Niveau étude',
  diploma_track: 'Type diplôme',
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json() as Record<string, unknown>

    // Fetch existing case for change detection
    const { data: existingCase } = await supabase
      .from('cases')
      .select('*, interns(first_name, last_name)')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('cases')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Get author name
    const { data: appUser } = await supabase
      .from('app_users')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    const authorName = appUser?.full_name ?? user.email ?? 'Équipe'
    const internData = (existingCase as Record<string, unknown>)?.interns as { first_name?: string; last_name?: string } | null
    const internName = `${internData?.first_name ?? ''} ${internData?.last_name ?? ''}`.trim()

    // Log field changes to case_logs
    if (existingCase) {
      for (const key of Object.keys(body)) {
        if (!FIELD_LABELS[key]) continue
        const oldVal = (existingCase as Record<string, unknown>)[key]
        const newVal = body[key]
        if (oldVal === newVal) continue

        await supabase.from('case_logs').insert({
          case_id: id,
          author_name: authorName,
          author_email: user.email,
          action: key === 'status' ? 'status_changed' : 'field_edited',
          field_name: key,
          field_label: FIELD_LABELS[key],
          old_value: String(oldVal ?? ''),
          new_value: String(newVal ?? ''),
          description: key === 'status'
            ? `${authorName} a changé le statut de ${internName} : ${oldVal} → ${newVal}`
            : `${authorName} a modifié ${FIELD_LABELS[key]}`,
          metadata: { intern_name: internName },
        }).then(() => {}, () => {})
      }
    }

    // Activity logging for key field changes
    if (body.payment_date || body.status === 'payment_received') {
      await logActivity({
        caseId: id,
        type: 'payment_received',
        title: `Paiement reçu — ${body.payment_amount ?? ''}€`,
        description: `Paiement de ${body.payment_amount ?? '?'}€ confirmé par virement`,
        priority: 'high',
        metadata: { amount: body.payment_amount, payment_type: body.payment_type, invoice_number: body.invoice_number },
      })
    }
    if (body.fazza_transfer_sent === true) {
      await logActivity({
        caseId: id,
        type: 'fazza_transfer',
        title: 'Virement FAZZA envoyé',
        description: `Virement de ${body.fazza_transfer_amount_idr ?? '?'} IDR envoyé à l'agent visa`,
        metadata: { amount_idr: body.fazza_transfer_amount_idr },
      })
    }
    if (body.visa_recu === true) {
      await logActivity({
        caseId: id,
        type: 'visa_received',
        title: "Visa reçu de l'agent FAZZA",
        description: 'Le visa a été reçu et est prêt pour le départ',
        priority: 'high',
      })
    }
    if (body.welcome_kit_sent_at) {
      await logActivity({
        caseId: id,
        type: 'welcome_kit_sent',
        title: 'Welcome kit envoyé',
        description: 'Le welcome kit Bali Interns a été envoyé au stagiaire',
      })
    }
    if (body.driver_booked === true || body.chauffeur_reserve === true) {
      await logActivity({
        caseId: id,
        type: 'driver_booked',
        title: 'Chauffeur réservé',
        description: "Le chauffeur pour l'arrivée à l'aéroport a été confirmé",
      })
    }

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
          id, first_name, last_name, email, whatsapp, whatsapp_number, phone,
          nationality, nationalities, gender, birth_date,
          passport_number, passport_expiry, passport_issue_city, passport_issue_date,
          linkedin_url, avatar_url, cv_url, cv_en_url, local_cv_url, photo_id_url,
          spoken_languages, english_level,
          main_desired_job, desired_sectors, desired_jobs, stage_ideal, touchpoint, source,
          intern_level, education_level, intern_level_notes, diploma_track, qualification_debrief,
          school_contact_name, school_contact_email, school_country, school_name,
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
        packages ( id, name, price_eur, visa_cost_idr, validity_label, processing_days ),
        visa_types ( id, code, name ),
        destinations ( id, name ),
        activity_feed ( id, type, title, description, status, priority, created_at, due_date, actions ),
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
