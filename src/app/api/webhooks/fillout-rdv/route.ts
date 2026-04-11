import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Fillout webhook payload
interface FilloutWebhookPayload {
  formId: string
  submissionId: string
  submissionTime: string
  questions: Array<{
    id: string
    name: string
    type: string
    value: string | null
  }>
  // Scheduling specific
  scheduling?: {
    startTime?: string
    endTime?: string
    meetLink?: string
    eventId?: string
    calendarId?: string
  }
  urlParameters?: Array<{ id: string; name: string; value: string }>
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as FilloutWebhookPayload
    const supabase = getServiceClient()

    // Extraire email — plusieurs sources par ordre de fiabilité
    let email: string | null = null
    const urlParams = payload.urlParameters

    // 1. URL parameters (les plus fiables car on les set nous-mêmes)
    if (urlParams) {
      const emailParam = urlParams.find(p => p.id === 'email' || p.name === 'email')
      if (emailParam?.value) email = emailParam.value
    }

    // 2. Questions/réponses du formulaire
    if (!email && payload.questions) {
      for (const q of payload.questions) {
        const name = (q.name ?? '').toLowerCase()
        if ((name.includes('email') || q.type === 'Email') && typeof q.value === 'string' && q.value) {
          email = q.value
          break
        }
      }
    }

    // 3. Top-level email
    const payloadAny = payload as unknown as Record<string, unknown>
    if (!email && typeof payloadAny.email === 'string') {
      email = payloadAny.email
    }

    const nameParam = urlParams?.find(p => p.id === 'name' || p.name === 'name')?.value

    if (!email) {
      // Payload de test Fillout sans email — on ignore gracieusement
      console.log('[Fillout webhook] Test payload received (no email) - webhook is connected!')
      return NextResponse.json({ ok: true, message: 'Webhook connected - test payload received' })
    }

    // Trouver le case associé à cet email
    const { data: intern } = await supabase
      .from('interns')
      .select('id, first_name, last_name, preferred_language')
      .eq('email', email)
      .maybeSingle()

    if (!intern) {
      console.log('[Fillout webhook] No intern found for email:', email)
      return NextResponse.json({ ok: true, message: 'No intern found' })
    }

    const { data: caseRow } = await supabase
      .from('cases')
      .select('id, status')
      .eq('intern_id', intern.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!caseRow) {
      return NextResponse.json({ ok: true, message: 'No case found' })
    }

    // Extraire les infos du RDV
    const rdvStart = payload.scheduling?.startTime
    const rdvEnd = payload.scheduling?.endTime
    const meetLink = payload.scheduling?.meetLink
    const gcalEventId = payload.scheduling?.eventId

    // Mettre à jour le case
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (rdvStart) {
      updateData.intern_first_meeting_date = rdvStart
      // Passer au statut rdv_booked si encore en lead
      if (caseRow.status === 'lead') {
        updateData.status = 'rdv_booked'
      }
    }
    if (meetLink) updateData.google_meet_link = meetLink
    if (gcalEventId) updateData.google_calendar_event_id = gcalEventId

    // Chercher un event GCal correspondant pour récupérer meet/cancel links enrichis
    const { data: calEvent } = await supabase
      .from('calendar_events')
      .select('id, meet_link, cancel_reschedule_link, start_datetime')
      .eq('intern_email', email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let cancelLink: string | null = null
    let finalMeetLink: string | null = meetLink ?? null
    if (calEvent) {
      if (calEvent.meet_link) {
        updateData.google_meet_link = calEvent.meet_link
        finalMeetLink = calEvent.meet_link
      }
      if (calEvent.cancel_reschedule_link) {
        updateData.google_meet_cancel_link = calEvent.cancel_reschedule_link
        cancelLink = calEvent.cancel_reschedule_link
      }
      if (calEvent.id) updateData.google_calendar_event_id = calEvent.id
      if (calEvent.start_datetime) updateData.intern_first_meeting_date = calEvent.start_datetime
    }

    await supabase.from('cases').update(updateData).eq('id', caseRow.id)

    // Marquer le lead comme converti s'il existe
    await supabase.from('leads')
      .update({
        status: 'converted' as never,
        converted_case_id: caseRow.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', email.toLowerCase().trim())
      .neq('status', 'converted')

    // Format la date du RDV
    const rdvDate = rdvStart ? new Date(rdvStart) : null
    const rdvLabel = rdvDate
      ? rdvDate.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
        })
      : 'date non précisée'

    // Log dans case_logs
    await supabase.from('case_logs').insert({
      case_id: caseRow.id,
      author_name: nameParam || email,
      action: 'rdv_booked',
      description: `RDV planifié → ${rdvLabel}`,
      metadata: {
        fillout_submission_id: payload.submissionId,
        rdv_start: rdvStart,
        meet_link: meetLink
      }
    })

    // Log dans activity_feed
    await supabase.from('activity_feed').insert({
      case_id: caseRow.id,
      type: 'rdv_booked',
      title: `RDV planifié → ${rdvLabel}`,
      description: `${nameParam || email} a planifié son entretien de qualification`,
      priority: 'normal',
      status: 'done',
      source: 'fillout_webhook',
      metadata: { rdv_start: rdvStart, meet_link: meetLink },
    }).then(() => null, () => null)

    // Notification admin
    await supabase.from('admin_notifications').insert({
      type: 'rdv_booked',
      title: `RDV planifié — ${nameParam || email}`,
      message: `${nameParam || email} a planifié son RDV → ${rdvLabel}`,
      link: `/fr/cases/${caseRow.id}?tab=process`,
      metadata: { case_id: caseRow.id, rdv_start: rdvStart, meet_link: meetLink }
    })

    // Sync l'event dans notre table calendar_events
    const internName = nameParam || email
    if (rdvStart && internName) {
      await supabase.from('calendar_events').upsert({
        id: payload.submissionId,
        google_calendar_id: 'team@bali-interns.com',
        summary: `Team Bali Interns and ${internName}`,
        status: 'confirmed',
        start_datetime: rdvStart,
        end_datetime: rdvEnd ?? new Date(new Date(rdvStart).getTime() + 45 * 60000).toISOString(),
        meet_link: meetLink ?? null,
        intern_name: internName,
        intern_email: email,
        case_id: caseRow.id,
        my_response_status: 'accepted',
        organizer_email: 'team@bali-interns.com',
      }, { onConflict: 'id' }).then(() => null, () => null)
    }

    // Envoyer email de confirmation (sera actif dès que Resend est vérifié)
    try {
      const { sendRdvConfirmation } = await import('@/lib/email/resend')
      await sendRdvConfirmation({
        internEmail: email,
        internFirstName: intern?.first_name ?? '',
        rdvDate: rdvStart ?? (updateData.intern_first_meeting_date as string | undefined) ?? new Date().toISOString(),
        meetLink: finalMeetLink,
        cancelLink,
        lang: intern?.preferred_language ?? 'fr',
      })
    } catch (e) {
      console.error('[webhook] sendRdvConfirmation failed:', e)
    }

    return NextResponse.json({ ok: true, case_id: caseRow.id })
  } catch (err) {
    console.error('[Fillout webhook] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
