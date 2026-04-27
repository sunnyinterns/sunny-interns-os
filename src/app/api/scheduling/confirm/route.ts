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
  lang: z.enum(['fr', 'en']).optional().default('en'),
  // From apply form pre-fill
  prefill_case_id: z.string().uuid().optional(),
  source: z.string().optional().default('apply_form'),
  event_slug: z.string().optional().default('entretien'),
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

  // Fetch event type by slug
  const eventSlug = d.event_slug ?? 'entretien'
  const { data: et } = await admin.from('scheduling_event_types').select('*').eq('is_active', true).eq('slug', eventSlug).single()
  if (!et) return NextResponse.json({ error: 'No event type for slug: ' + eventSlug }, { status: 404 })

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

  // ── Idempotency: vérifier si un booking existe déjà pour ce (email + créneau) ──
  const { data: existingBooking } = await admin.from('bookings')
    .select('id, meet_link, start_at')
    .eq('invitee_email', d.email)
    .eq('start_at', d.start)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (existingBooking) {
    console.log('[confirm] Idempotency: booking already exists for', d.email, d.start)
    return NextResponse.json({
      booking_id: existingBooking.id as string,
      case_id: d.prefill_case_id ?? null,
      meet_link: existingBooking.meet_link as string,
      start: existingBooking.start_at as string,
      end: d.end,
      manager_name: mgr.name as string,
    })
  }

  // ── Google Calendar (try/catch — le booking est créé même si GCal échoue) ──
  let gcalResult: { meetLink: string; eventId: string | null } = { meetLink: '', eventId: null }
  try {
    gcalResult = await createMeetEvent({
    summary,
    description,
    startDateTime: d.start,
    endDateTime: d.end,
    attendeeEmail: d.email,
    attendeeName: inviteeName,
      calendarId: mgr.calendar_id as string,
      refreshToken: (mgr.google_refresh_token as string | null) ?? undefined,
    })
  } catch (gcalErr) {
    console.error('[confirm] Google Calendar error (continuing without Meet link):', gcalErr)
    // Le booking est quand même créé — le meet link sera ajouté manuellement si besoin
  }

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
  }).select('id, cancel_token, reschedule_token').single()

  if (bookingError || !booking) {
    console.error('[booking] DB error:', bookingError)
    return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 })
  }

  const bookingId = booking.id as string
  const origin = new URL(request.url).origin
  const cancelUrl = `${origin}/api/scheduling/cancel?token=${booking.cancel_token as string}`
  const rescheduleUrl = `${origin}/api/scheduling/reschedule?token=${booking.reschedule_token as string}`

  // Update case: lead → rdv_booked + date entretien
  if (d.prefill_case_id) {
    await admin.from('cases').update({
      status: 'rdv_booked',
      intern_first_meeting_date: d.start,
      intern_first_meeting_link: gcalResult.meetLink || null,
      intern_first_meeting_reschedule_link: rescheduleUrl,
      google_meet_cancel_link: cancelUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', d.prefill_case_id).in('status', ['lead', 'rdv_booked'])
    // .in('status', ...) : ne pas écraser si déjà plus avancé
  }

  // Email de confirmation via template booking_confirmation (EN)
  try {
    const { sendRdvConfirmation } = await import('@/lib/email/resend')
    const rdvDate = new Date(d.start).toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: d.timezone
    })
    // Récupérer le portal_token depuis le case si disponible
    let portalToken: string | null = null
    if (d.prefill_case_id) {
      const { data: caseRow } = await admin.from('cases').select('portal_token').eq('id', d.prefill_case_id).maybeSingle()
      portalToken = caseRow?.portal_token as string | null ?? null
    }
    await sendRdvConfirmation({
      internEmail: d.email,
      prenom: d.first_name,
      nom: d.last_name,
      rdvDate,
      meetLink: gcalResult.meetLink || undefined,
      portalToken: portalToken ?? undefined,
    })
  } catch (emailErr) {
    console.error('[booking] confirmation email error:', emailErr)
  }

  // ── Post-booking actions ──────────────────────────────────────────
  // bookingId already declared above
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

  // ── Créer le case automatiquement si pas de case_id (booking direct depuis /book) ──
  let finalCaseId = d.prefill_case_id ?? null
  if (!finalCaseId) {
    try {
      // Créer l'intern
      const { data: newIntern } = await admin.from('interns').insert({
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        whatsapp: d.phone ?? null,
      }).select('id').single()

      if (newIntern) {
        // Fetch default billing company + package
        const [{ data: bc }, { data: pkg }] = await Promise.all([
          admin.from('billing_companies').select('id').eq('is_default', true).single(),
          admin.from('packages').select('id, price_eur').eq('is_active', true).order('created_at').limit(1).single(),
        ])
        // Créer le case en rdv_booked
        const { data: newCase } = await admin.from('cases').insert({
          intern_id: newIntern.id,
          status: 'rdv_booked',
          billing_company_id: bc?.id ?? null,
          package_id: pkg?.id ?? null,
          payment_amount: pkg?.price_eur ?? null,
          portal_token: crypto.randomUUID(),
          intern_first_meeting_date: d.start,
          intern_first_meeting_link: gcalResult.meetLink,
          intern_first_meeting_reschedule_link: rescheduleUrl,
          google_meet_cancel_link: cancelUrl,
          form_language: d.lang,
        }).select('id').single()

        if (newCase) {
          finalCaseId = newCase.id as string
          // Update booking with case_id
          await admin.from('bookings').update({ case_id: finalCaseId }).eq('id', bookingId)
          // Admin notif
          await admin.from('admin_notifications').insert({
            type: 'new_candidate',
            title: `Nouveau candidat — ${d.first_name} ${d.last_name}`,
            message: `RDV planifié → ${rdvLabel}`,
            link: `/fr/cases/${finalCaseId}`,
          })
        }
      }
    } catch (err) { console.error('[confirm] auto-case error:', err) }
  }

  // Marquer le lead comme converti
  if (finalCaseId) {
    await admin.from('leads')
      .update({ status: 'converted', converted_case_id: finalCaseId, converted_at: new Date().toISOString() })
      .eq('email', d.email.toLowerCase().trim())
      .neq('status', 'converted')
  }

  // ── Notification email to team@ for employer/school bookings ──
  if (['employeur', 'ecole'].includes(d.event_slug ?? 'entretien')) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const timeDisplay = new Date(d.start).toLocaleString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
      })
      const typeLabel = d.event_slug === 'employeur' ? '🏢 Nouvel Employeur' : '🎓 Nouvelle École'
      await resend.emails.send({
        from: 'Bali Interns Booking <team@bali-interns.com>',
        to: 'team@bali-interns.com',
        subject: `${typeLabel} — RDV confirmé : ${inviteeName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2>${typeLabel}</h2>
          <p><strong>${inviteeName}</strong> vient de planifier un RDV.</p>
          <div style="background:#f9f7f2;border-radius:12px;padding:16px;margin:16px 0;">
            <p><strong>📅</strong> ${timeDisplay} (heure Bali)</p>
            <p><strong>📧</strong> ${d.email}</p>
            ${d.phone ? `<p><strong>📱</strong> ${d.phone}</p>` : ''}
            ${d.message ? `<p><strong>💬</strong> ${d.message}</p>` : ''}
          </div>
          ${gcalResult.meetLink ? `<p><a href="${gcalResult.meetLink}" style="background:#1a73e8;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">📹 Rejoindre Google Meet</a></p>` : ''}
        </div>`,
      })
    } catch (notifErr) {
      console.error('[booking] admin notif error:', notifErr)
    }
  }

  return NextResponse.json({
    booking_id: bookingId,
    case_id: finalCaseId,
    meet_link: gcalResult.meetLink,
    start: d.start,
    end: d.end,
    manager_name: mgr.name as string,
    google_event_id: gcalResult.eventId,
  })
}
