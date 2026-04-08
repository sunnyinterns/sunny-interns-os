import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().split('T')[0] === b.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  // Verify cron secret
  const secret = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch active alert configs
  const { data: alertConfigs } = await supabase
    .from('alert_configs')
    .select('*')
    .eq('is_active', true)

  if (!alertConfigs || alertConfigs.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No active alert configs' })
  }

  // Fetch active cases with dates
  const { data: cases } = await supabase
    .from('cases')
    .select('id, first_name, last_name, status, arrival_date, alert_sent_flags, interns(email, first_name, last_name)')
    .in('status', ['convention_signed', 'payment_pending', 'payment_received', 'visa_in_progress', 'visa_received', 'arrival_prep', 'active'])

  if (!cases || cases.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No active cases' })
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  let alertsSent = 0

  for (const c of cases) {
    const sentFlags = (c.alert_sent_flags ?? {}) as Record<string, boolean>
    const newFlags: Record<string, boolean> = {}
    let updated = false

    for (const config of alertConfigs) {
      const alertKey = config.key
      if (sentFlags[alertKey]) continue // Already sent

      // Get reference date
      const refDate = c[config.reference_field as keyof typeof c] as string | null
      if (!refDate) continue

      // Calculate target date: referenceDate + days_offset
      const refDateObj = new Date(refDate)
      refDateObj.setHours(0, 0, 0, 0)
      const targetDate = addDays(refDateObj, config.days_offset)

      if (!isSameDay(today, targetDate)) continue

      // Alert is due today
      const recipients: string[] = Array.isArray(config.email_recipients) ? config.email_recipients : ['charly@bali-interns.com']
      const internName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()

      if (resend && recipients.length > 0) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'noreply@bali-interns.com',
            to: recipients,
            subject: `⚠ Alerte : ${config.label} — ${internName}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px">
                <h2 style="color:#c8a96e">Alerte Bali Interns</h2>
                <p><strong>${config.label}</strong></p>
                <p>Stagiaire : <strong>${internName}</strong></p>
                <p>Date de référence : <strong>${new Date(refDate).toLocaleDateString('fr-FR')}</strong></p>
                <p>Date cible : <strong>${targetDate.toLocaleDateString('fr-FR')}</strong></p>
                <hr/>
                <p style="color:#6b7280;font-size:12px">Alerte automatique Bali Interns OS</p>
              </div>
            `,
          })
          alertsSent++
        } catch (e) {
          console.error('[CRON] Email send error:', e)
        }
      } else {
        // Log only if no Resend
        console.log(`[CRON ALERT] ${config.label} pour ${internName} — ${targetDate.toISOString()}`)
        alertsSent++
      }

      newFlags[alertKey] = true
      updated = true
    }

    if (updated) {
      await supabase
        .from('cases')
        .update({ alert_sent_flags: { ...sentFlags, ...newFlags } })
        .eq('id', c.id)
    }
  }

  return NextResponse.json({
    processed: cases.length,
    alerts_sent: alertsSent,
    date: today.toISOString().split('T')[0],
  })
}
