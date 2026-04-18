import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/scheduling/cancel?token=XXX — public, candidate cancels their booking
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('*, scheduling_managers(calendar_id, google_refresh_token, name)')
    .eq('cancel_token', token)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found or already cancelled' }, { status: 404 })

  // Cancel Google Calendar event
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
      console.error('[cancel] GCal delete error:', err)
    }
  }

  // Update booking status
  await admin.from('bookings').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: 'invitee',
  }).eq('id', booking.id)

  // Update case
  if (booking.case_id) {
    await admin.from('cases').update({
      rdv_cancelled_by_intern_at: new Date().toISOString(),
      rdv_cancelled_reason: 'Annulé par le candidat',
      intern_first_meeting_date: null,
      intern_first_meeting_link: null,
    }).eq('id', booking.case_id)

    // Admin notification
    await admin.from('admin_notifications').insert({
      case_id: booking.case_id,
      type: 'rdv_cancelled_by_intern',
      title: `${booking.invitee_name} a annulé son RDV`,
      message: `Créneau annulé : ${new Date(booking.start_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`,
      is_read: false,
    })
  }

  // Redirect to confirmation page
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/book/cancelled?name=${encodeURIComponent(booking.invitee_name)}`)
}
