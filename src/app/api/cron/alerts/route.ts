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
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) {
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
    .select('id, status, actual_start_date, actual_end_date, desired_start_date, alert_j7_sent, alert_j4_sent, interns(email, first_name, last_name)')
    .in('status', ['convention_signed', 'payment_pending', 'payment_received', 'visa_in_progress', 'visa_received', 'arrival_prep', 'active'])

  if (!cases || cases.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No active cases' })
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  let alertsSent = 0

  for (const c of cases) {
    const sentFlags = { j7: c.alert_j7_sent ?? false, j4: c.alert_j4_sent ?? false } as Record<string, boolean>
    const newFlags: Record<string, boolean> = {}
    let updated = false

    for (const config of alertConfigs) {
      const alertKey = (config as any).alert_key
      if (sentFlags[alertKey]) continue // Already sent

      // Get reference date
      // Map reference to actual case column
      const refFieldMap: Record<string, string> = {
        desired_start: 'desired_start_date',
        actual_start: 'actual_start_date',
        actual_end: 'actual_end_date',
      }
      const refField = refFieldMap[(config as any).reference] ?? 'actual_start_date'
      const refDate = (c as any)[refField] as string | null
      if (!refDate) continue

      // Calculate target date: referenceDate + days_offset
      const refDateObj = new Date(refDate)
      refDateObj.setHours(0, 0, 0, 0)
      const targetDate = addDays(refDateObj, config.days_offset)

      if (!isSameDay(today, targetDate)) continue

      // Alert is due today
      const recipients: string[] = Array.isArray((config as any).recipient_emails) ? (config as any).recipient_emails : ['charly@bali-interns.com']
      const intern = c.interns as { first_name?: string; last_name?: string } | null
      const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()

      if (resend && recipients.length > 0) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'team@bali-interns.com',
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
      // Update individual alert flags (alert_sent_flags col created via migration)
      const flagUpdate: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(newFlags)) {
        flagUpdate[`alert_${k}_sent`] = v
      }
      // Only update known columns to avoid DB errors
      const safeUpdate: Record<string, boolean> = {}
      if (flagUpdate['alert_j7_sent']) safeUpdate['alert_j7_sent'] = true
      if (flagUpdate['alert_j4_sent']) safeUpdate['alert_j4_sent'] = true
      if (Object.keys(safeUpdate).length > 0) {
        await supabase.from('cases').update(safeUpdate).eq('id', c.id)
      }
    }
  }

  return NextResponse.json({
    processed: cases.length,
    alerts_sent: alertsSent,
    date: today.toISOString().split('T')[0],
  })
}
