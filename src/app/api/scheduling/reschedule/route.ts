import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/scheduling/reschedule?token=XXX — public, candidate reschedules
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('*, scheduling_managers(calendar_id, google_refresh_token)')
    .eq('reschedule_token', token)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Cancel old Google Calendar event
  if (booking.google_event_id) {
    try {
      const { getCalendarClient } = await import('@/lib/google-calendar-client')
      const mgr = booking.scheduling_managers as Record<string, string> | null
      const g = await getCalendarClient(mgr?.google_refresh_token ?? undefined)
      if (g) {
        await g.cal.events.delete({
          calendarId: mgr?.calendar_id ?? 'charly@bali-interns.com',
          eventId: booking.google_event_id,
        })
      }
    } catch (err) {
      console.error('[reschedule] GCal delete error:', err)
    }
  }

  // Mark old booking as rescheduled
  await admin.from('bookings').update({ status: 'rescheduled' }).eq('id', booking.id)

  // Clear case meeting info
  if (booking.case_id) {
    await admin.from('cases').update({
      intern_first_meeting_date: null,
      intern_first_meeting_link: null,
      intern_first_meeting_reschedule_link: null,
    }).eq('id', booking.case_id)
  }

  // Redirect to /book with prefill
  const origin = new URL(request.url).origin
  const params = new URLSearchParams({
    first_name: booking.invitee_name.split(' ')[0] ?? '',
    last_name: booking.invitee_name.split(' ').slice(1).join(' ') ?? '',
    email: booking.invitee_email,
    ...(booking.invitee_phone ? { phone: booking.invitee_phone } : {}),
    ...(booking.case_id ? { case_id: booking.case_id } : {}),
    ...(booking.invitee_timezone ? { tz: booking.invitee_timezone } : {}),
    rescheduled: '1',
  })
  return NextResponse.redirect(`${origin}/book?${params.toString()}`)
}
