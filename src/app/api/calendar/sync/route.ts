import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  hangoutLink?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  organizer?: { email: string }
  htmlLink?: string
  myResponseStatus?: string
  numAttendees?: number
}

export async function POST(request: Request) {
  const supabase = getServiceClient()
  const body = await request.json() as { event: GCalEvent; calendarId: string }
  const { event, calendarId } = body

  if (!event?.id) return NextResponse.json({ error: 'No event ID' }, { status: 400 })

  // Extraire le nom du candidat depuis le titre "Team Bali Interns and [Name]"
  const internNameMatch = event.summary?.match(/(?:Team Bali Interns and |Bali Interns - 1er Entretien - )(.+)/i)
  const internName = internNameMatch?.[1]?.trim() ?? null

  // Extraire le lien cancel/reschedule depuis la description
  const rescheduleMatch = event.description?.match(/Cancel or reschedule: (https:\/\/\S+)/i)
  const cancelRescheduleLink = rescheduleMatch?.[1] ?? null

  // Email du candidat (non Bali Interns)
  const internEmail = event.attendees?.find(a =>
    !a.email.includes('bali-interns.com')
  )?.email ?? null

  // Meet link
  const meetLink = event.hangoutLink ?? null

  const { error } = await supabase
    .from('calendar_events')
    .upsert({
      id: event.id,
      google_calendar_id: calendarId,
      summary: event.summary ?? null,
      status: event.status ?? 'confirmed',
      start_datetime: event.start?.dateTime ?? event.start?.date ?? null,
      end_datetime: event.end?.dateTime ?? event.end?.date ?? null,
      meet_link: meetLink,
      cancel_reschedule_link: cancelRescheduleLink,
      intern_name: internName,
      intern_email: internEmail,
      my_response_status: event.myResponseStatus ?? null,
      organizer_email: event.organizer?.email ?? calendarId,
      case_id: null,
    }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si le status est 'cancelled', créer une notification admin
  if (event.status === 'cancelled' && internName) {
    await supabase.from('admin_notifications').insert({
      type: 'rdv_cancelled',
      title: `RDV annulé — ${internName}`,
      message: `Le RDV avec ${internName} a été annulé`,
      metadata: { event_id: event.id, intern_name: internName }
    }).then(() => null, () => null)
  }

  return NextResponse.json({ ok: true, synced: event.id })
}
