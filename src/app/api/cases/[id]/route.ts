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
  cv_status: 'Statut CV',
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

    // Activity logging for status change
    if (body.status && existingCase && body.status !== (existingCase as Record<string, unknown>).status) {
      await logActivity({
        caseId: id,
        type: 'status_changed',
        title: `Statut modifié → ${body.status}`,
        description: `Le dossier est passé au statut ${body.status}`,
        metadata: { old_status: (existingCase as Record<string, unknown>).status, new_status: body.status },
      })
    }

    // Activity logging for CV status change
    if (body.cv_status && existingCase && body.cv_status !== (existingCase as Record<string, unknown>).cv_status) {
      await logActivity({
        caseId: id,
        type: 'cv_status_changed',
        title: `CV ${body.cv_status === 'validated' ? 'validé' : body.cv_status === 'to_redo' ? 'à refaire' : String(body.cv_status)}`,
        description: `Statut CV mis à jour : ${body.cv_status}`,
        metadata: { cv_status: body.cv_status },
      })
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

    // Auto-triggers quand convention signée
    if (body.status === 'convention_signed' && existingCase && (existingCase as Record<string, unknown>).status !== 'convention_signed') {
      try {
        await supabase.from('activity_feed').insert({
          case_id: id,
          type: 'status_change',
          title: 'Convention signée → Client',
          description: 'Le dossier est maintenant en statut Client. Paiement et visa débloqués.',
        })
      } catch { /* non-blocking */ }

      // Envoyer contrat sponsor à l'employeur si pas encore fait
      try {
        const { data: caseForContract } = await supabase.from('cases').select('sponsor_contract_sent_at, employer_contact_id').eq('id', id).single()
        if (caseForContract && !caseForContract.sponsor_contract_sent_at) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
          void fetch(`${appUrl}/api/cases/${id}/send-sponsor-contract`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? 'internal'}` },
          }).catch(() => null)
        }
      } catch { /* non-blocking */ }
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
        id, intern_id, destination_id, status, case_type,
        desired_start_date, actual_start_date, actual_end_date,
        school_id, intern_level, diploma_track, desired_sectors, desired_duration_months,
        qualification_notes, qualification_notes_for_intern,
        intern_first_meeting_date, intern_first_meeting_link, google_meet_link, fillout_booking_link,
        portal_token, portal_sent_at, portal_activated_at,
        employer_contact_id, package_id, assigned_manager_name,
        payment_amount, payment_date, payment_type, payment_notified_by_intern_at,
        convention_signed, convention_signed_at, convention_pdf_url,
        engagement_letter_signed_at, engagement_letter_sent,
        sponsor_contract_sent_at, sponsor_contract_signed_at,
        flight_number, flight_departure_city, flight_arrival_time_local, flight_last_stopover,
        dropoff_address, driver_phone,
        billet_avion, papiers_visas, visa_recu, chauffeur_reserve,
        form_language, visa_submitted_to_agent_at, note_for_agent, visa_type_id,
        cv_feedback, cv_status, cv_revision_requested, cv_revision_notes,
        created_at, updated_at,
        interns(*),
        destinations(name,country),
        packages(name,price_eur),
        job_submissions(id,status,intern_interested,intern_priority,employer_response,jobs(id,title,public_title,location,companies(id,name,logo_url))),
        contacts(id,first_name,last_name,email,whatsapp,job_title,companies(id,name))
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
