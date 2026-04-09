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

    // Extraire email depuis les URL params (passés par notre formulaire)
    const emailParam = payload.urlParameters?.find(p => p.name === 'email')?.value
    const nameParam = payload.urlParameters?.find(p => p.name === 'name')?.value

    // Extraire email depuis les questions du formulaire Fillout
    const emailQuestion = payload.questions?.find(q =>
      q.name?.toLowerCase().includes('email') || q.type === 'Email'
    )?.value

    const email = emailParam || emailQuestion

    if (!email) {
      // Payload de test Fillout sans email — on ignore gracieusement
      console.log('[Fillout webhook] Test payload received (no email) - webhook is connected!')
      return NextResponse.json({ ok: true, message: 'Webhook connected - test payload received' })
    }

    // Trouver le case associé à cet email
    const { data: intern } = await supabase
      .from('interns')
      .select('id')
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

    await supabase.from('cases').update(updateData).eq('id', caseRow.id)

    // Log dans case_logs
    await supabase.from('case_logs').insert({
      case_id: caseRow.id,
      author_name: nameParam || email,
      action: 'rdv_booked',
      description: `RDV de qualification planifié via Fillout${rdvStart ? ` : ${new Date(rdvStart).toLocaleString('fr-FR')}` : ''}`,
      metadata: { 
        fillout_submission_id: payload.submissionId,
        rdv_start: rdvStart,
        meet_link: meetLink 
      }
    })

    // Notification admin
    await supabase.from('admin_notifications').insert({
      type: 'rdv_booked',
      title: `🗓️ RDV planifié — ${nameParam || email}`,
      message: `${nameParam || email} a planifié son RDV de qualification${rdvStart ? ` pour le ${new Date(rdvStart).toLocaleString('fr-FR')}` : ''}`,
      link: `/fr/cases/${caseRow.id}?tab=process`,
      metadata: { case_id: caseRow.id, rdv_start: rdvStart, meet_link: meetLink }
    })

    return NextResponse.json({ ok: true, case_id: caseRow.id })
  } catch (err) {
    console.error('[Fillout webhook] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
