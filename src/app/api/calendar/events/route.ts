import { NextResponse } from 'next/server'
import { createMeetEvent, listUpcomingEvents } from '@/lib/google-calendar'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const events = await listUpcomingEvents()
  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const { caseId, internEmail, internName, startDateTime, endDateTime } = await request.json() as {
    caseId: string
    internEmail: string
    internName: string
    startDateTime: string
    endDateTime: string
  }

  const result = await createMeetEvent({
    summary: 'Entretien Bali Interns x ' + internName,
    startDateTime,
    endDateTime,
    attendeeEmail: internEmail,
    attendeeName: internName,
  })

  if (caseId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase
      .from('cases')
      .update({
        google_meet_link: result.meetLink,
        google_meet_cancel_link: result.cancelLink,
        intern_first_meeting_date: startDateTime,
        status: 'rdv_booked',
      })
      .eq('id', caseId)
  }

  return NextResponse.json(result)
}
