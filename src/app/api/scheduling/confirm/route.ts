import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createMeetEvent } from '@/lib/google-calendar'
import { z } from 'zod'

const schema = z.object({
  start: z.string(),
  end: z.string(),
  manager_id: z.string().uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  timezone: z.string().optional().default('Europe/Paris'),
  lang: z.enum(['fr', 'en']).optional().default('fr'),
  // From apply form pre-fill
  prefill_case_id: z.string().uuid().optional(),
  source: z.string().optional().default('apply_form'),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const admin = createAdminClient()

  // Fetch manager
  const { data: mgr } = await admin.from('scheduling_managers').select('*').eq('id', d.manager_id).single()
  if (!mgr) return NextResponse.json({ error: 'Manager not found' }, { status: 404 })

  // Fetch event type
  const { data: et } = await admin.from('scheduling_event_types').select('*').eq('is_active', true).single()
  if (!et) return NextResponse.json({ error: 'No event type' }, { status: 404 })

  const inviteeName = `${d.first_name} ${d.last_name}`
  const summary = `${et.title as string} — ${inviteeName}`

  const startFr = new Date(d.start).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: d.timezone })

  const description = [
    d.lang === 'fr'
      ? `Entretien de qualification Bali Interns avec ${inviteeName}`
      : `Bali Interns qualification call with ${inviteeName}`,
    '',
    d.message ? `Message : ${d.message}` : '',
    '',
    d.lang === 'fr'
      ? `Créneau sélectionné : ${startFr} (heure France)`
      : `Selected slot: ${startFr}`,
  ].filter(l => l !== undefined).join('\n')

  // Create Google Calendar event on manager's calendar (+ team@ as attendee)
  const gcalResult = await createMeetEvent({
    summary,
    description,
    startDateTime: d.start,
    endDateTime: d.end,
    attendeeEmail: d.email,
    attendeeName: inviteeName,
    calendarId: mgr.calendar_id as string,
    refreshToken: (mgr.google_refresh_token as string | null) ?? undefined,
  })

  // Save booking to DB
  const { data: booking, error: bookingError } = await admin.from('bookings').insert({
    event_type_id: et.id,
    manager_id: d.manager_id,
    google_event_id: gcalResult.eventId,
    meet_link: gcalResult.meetLink,
    start_at: d.start,
    end_at: d.end,
    invitee_name: inviteeName,
    invitee_email: d.email,
    invitee_phone: d.phone ?? null,
    invitee_message: d.message ?? null,
    invitee_timezone: d.timezone,
    status: 'confirmed',
    case_id: d.prefill_case_id ?? null,
    source: d.source,
  }).select().single()

  if (bookingError) {
    console.error('[booking] DB error:', bookingError)
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 })
  }

  // Update case with meeting info if case_id provided
  if (d.prefill_case_id) {
    await admin.from('cases').update({
      intern_first_meeting_date: d.start,
      intern_first_meeting_link: gcalResult.meetLink,
      intern_first_meeting_reschedule_link: gcalResult.htmlLink,
    }).eq('id', d.prefill_case_id)
  }

  // Send confirmation email to invitee
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const timeDisplay = new Date(d.start).toLocaleString(d.lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: d.timezone
    })
    await resend.emails.send({
      from: 'Bali Interns <team@bali-interns.com>',
      to: d.email,
      subject: d.lang === 'fr'
        ? `✅ Votre entretien Bali Interns est confirmé`
        : `✅ Your Bali Interns call is confirmed`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a1918;">Bonjour ${d.first_name} ! 👋</h2>
        <p style="color:#374151;">${d.lang === 'fr' ? 'Votre entretien est confirmé.' : 'Your call is confirmed.'}</p>
        <div style="background:#fdf8f0;border:1px solid #c8a96e40;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-weight:bold;color:#1a1918;">📅 ${timeDisplay}</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">${et.duration_minutes as number} min · Google Meet</p>
        </div>
        ${gcalResult.meetLink ? `<a href="${gcalResult.meetLink}" style="display:inline-block;background:#1a73e8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">📹 ${d.lang === 'fr' ? 'Rejoindre Google Meet' : 'Join Google Meet'}</a>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Bali Interns · team@bali-interns.com</p>
      </div>`,
    })
  } catch (emailErr) {
    console.error('[booking] email error:', emailErr)
  }

  // ── Post-booking actions ──────────────────────────────────────────
  const bookingId = booking.id as string
  const rdvLabel = new Date(d.start).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
  })

  // Case logs + activity + admin notif (non-blocking)
  if (d.prefill_case_id) {
    await Promise.allSettled([
      admin.from('case_logs').insert({
        case_id: d.prefill_case_id,
        author_name: `${d.first_name} ${d.last_name}`,
        action: 'rdv_booked',
        description: `RDV planifié → ${rdvLabel}`,
        metadata: { booking_id: bookingId, meet_link: gcalResult.meetLink },
      }),
      admin.from('activity_feed').insert({
        case_id: d.prefill_case_id,
        type: 'rdv_booked',
        title: `RDV planifié → ${rdvLabel}`,
        description: `${d.first_name} ${d.last_name} a planifié son entretien`,
        priority: 'normal',
        status: 'done',
        source: 'scheduling_native',
        metadata: { booking_id: bookingId, meet_link: gcalResult.meetLink },
      }),
      admin.from('admin_notifications').insert({
        type: 'rdv_booked',
        title: `RDV planifié — ${d.first_name} ${d.last_name}`,
        message: `${d.first_name} ${d.last_name} a planifié son RDV → ${rdvLabel}`,
        link: `/fr/cases/${d.prefill_case_id}`,
        metadata: { case_id: d.prefill_case_id, booking_id: bookingId },
      }),
    ])
  }

  // Marquer le lead comme converti si un case existe
  if (d.prefill_case_id) {
    await admin.from('leads')
      .update({ status: 'converted', converted_case_id: d.prefill_case_id, converted_at: new Date().toISOString() })
      .eq('email', d.email.toLowerCase().trim())
      .neq('status', 'converted')
  }

  return NextResponse.json({
    booking_id: bookingId,
    meet_link: gcalResult.meetLink,
    start: d.start,
    end: d.end,
    manager_name: mgr.name as string,
    google_event_id: gcalResult.eventId,
  })
}
