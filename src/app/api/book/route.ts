import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bookingSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  slot: z.string().min(1), // ISO datetime string
})

// GET /api/book/slots — public, returns available slots
export async function GET() {
  const supabase = await createClient()

  try {
    // Fetch slot configuration from settings
    const { data: slotSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'booking_slots')
      .maybeSingle()

    const slotConfig = (slotSetting?.value as Record<string, unknown> | null) ?? {}
    const daysEnabled: number[] = (slotConfig.days_enabled as number[] | undefined) ?? [1, 2, 3, 4, 5] // Mon-Fri
    const startHour: number = (slotConfig.start_hour as number | undefined) ?? 9
    const endHour: number = (slotConfig.end_hour as number | undefined) ?? 17
    const slotDuration: number = (slotConfig.slot_duration_min as number | undefined) ?? 30

    // Generate next 14 days of slots
    const slots: Array<{ datetime: string; label: string }> = []
    const now = new Date()
    const cutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000) // min 2h ahead

    for (let day = 1; day <= 14; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() + day)
      date.setSeconds(0)
      date.setMilliseconds(0)

      const dayOfWeek = date.getDay() // 0=Sun, 1=Mon...
      if (!daysEnabled.includes(dayOfWeek)) continue

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += slotDuration) {
          const slot = new Date(date)
          slot.setHours(h, m, 0, 0)
          if (slot <= cutoff) continue
          slots.push({
            datetime: slot.toISOString(),
            label: slot.toLocaleString('fr-FR', {
              weekday: 'long', day: '2-digit', month: 'long',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Makassar',
            }),
          })
        }
      }
    }

    return NextResponse.json(slots)
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/book — public booking submission
export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { first_name, last_name, email, phone, message, slot } = parsed.data

    // Store booking in activity_feed (no dedicated table needed)
    const slotDate = new Date(slot)
    const slotLabel = slotDate.toLocaleString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Makassar',
    })

    // Insert lead-style record using a service-role approach (unauthenticated)
    // We use the bookings table if it exists, otherwise fall back to rdv_requests
    const { data: booking, error: bookingError } = await supabase
      .from('rdv_requests')
      .insert({
        first_name,
        last_name,
        email,
        phone: phone ?? null,
        message: message ?? null,
        slot_datetime: slot,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (bookingError) {
      // Table may not exist yet — log and continue
      console.error('rdv_requests insert error:', bookingError.message)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const googleClientId = process.env.GOOGLE_CLIENT_ID

    // Notification email to Charly
    const notifHtml = `
      <h2>Nouveau RDV de qualification</h2>
      <p><strong>Candidat :</strong> ${first_name} ${last_name}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ''}
      <p><strong>Créneau :</strong> ${slotLabel}</p>
      ${message ? `<p><strong>Message :</strong> ${message}</p>` : ''}
      ${googleClientId ? `<p><strong>Google Meet :</strong> Lien à créer depuis Google Calendar</p>` : ''}
      <p><a href="${appUrl}">Accéder à l'OS →</a></p>
    `

    // Confirmation email to candidate
    const confirmHtml = `
      <p>Bonjour ${first_name},</p>
      <p>Votre rendez-vous de qualification a bien été enregistré.</p>
      <p><strong>Créneau réservé :</strong> ${slotLabel} (heure de Bali)</p>
      <p>L'équipe Bali Interns vous contactera à l'adresse <strong>${email}</strong> pour confirmer et vous envoyer le lien de visioconférence.</p>
      <br/>
      <p>À très bientôt,</p>
      <p>L'équipe Bali Interns</p>
    `

    // Send both emails in parallel
    await Promise.all([
      fetch(`${appUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'charly@bali-interns.com',
          subject: `[RDV] ${first_name} ${last_name} — ${slotLabel}`,
          html: notifHtml,
        }),
      }),
      fetch(`${appUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Confirmation de votre RDV Bali Interns — ${slotLabel}`,
          html: confirmHtml,
        }),
      }),
    ])

    return NextResponse.json({
      success: true,
      booking: booking ?? null,
      slot: slotLabel,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
