import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}
function isSameDay(a: Date, b: Date): boolean {
  return a.toISOString().split('T')[0] === b.toISOString().split('T')[0]
}

const REF_FIELD_MAP: Record<string, string> = {
  desired_start: 'desired_start_date',
  actual_start:  'actual_start_date',
  actual_end:    'actual_end_date',
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceClient()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'

  const { data: alertConfigs } = await supabase.from('alert_configs').select('*').eq('is_active', true)
  if (!alertConfigs?.length) return NextResponse.json({ processed: 0, message: 'No active alert configs' })

  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, actual_start_date, actual_end_date, desired_start_date, alert_sent_flags, interns(email, first_name, last_name)')
    .in('status', ['convention_signed','payment_pending','payment_received','visa_in_progress','visa_received','arrival_prep','active'])

  if (!cases?.length) return NextResponse.json({ processed: 0, message: 'No active cases' })

  const { Resend } = await import('resend')
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  let alertsSent = 0; const errors: string[] = []

  for (const c of cases) {
    const sentFlags = (c.alert_sent_flags ?? {}) as Record<string, boolean>
    const newFlags: Record<string, boolean> = {}

    for (const config of alertConfigs) {
      const alertKey = String((config as any).alert_key ?? '')
      if (!alertKey || sentFlags[alertKey]) continue

      const refField = REF_FIELD_MAP[(config as any).reference ?? ''] ?? null
      if (!refField) continue

      const refDate = (c as any)[refField] as string | null
      if (!refDate) continue

      const refDateObj = new Date(refDate); refDateObj.setHours(0, 0, 0, 0)
      const daysOffset = Number((config as any).days_offset ?? 0)
      const direction = String((config as any).direction ?? 'before')
      const targetDate = addDays(refDateObj, direction === 'after' ? daysOffset : -daysOffset)

      if (!isSameDay(today, targetDate)) continue

      const recipients: string[] = Array.isArray((config as any).recipient_emails)
        ? (config as any).recipient_emails : ['charly@bali-interns.com']
      const intern = c.interns as { first_name?: string; last_name?: string } | null
      const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
      const caseUrl = `${appUrl}/fr/cases/${c.id}`

      if (resend && recipients.length > 0) {
        try {
          await resend.emails.send({
            from: 'Bali Interns OS <team@bali-interns.com>',
            to: recipients,
            subject: `⚠️ ${(config as any).label} — ${internName}`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1918;">
  <div style="background:#1a1918;padding:20px 24px;">
    <p style="margin:0;font-size:11px;color:#c8a96e;font-weight:700;letter-spacing:2px;text-transform:uppercase;">BALI INTERNS — ALERTE OPÉRATIONNELLE</p>
  </div>
  <div style="padding:24px;">
    <h2 style="margin:0 0 8px;font-size:18px;">${(config as any).label}</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Stagiaire : <strong style="color:#1a1918;">${internName}</strong></p>
    <div style="background:#fdf8f0;border-left:3px solid #c8a96e;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#78350f;">
        Date de référence : <strong>${new Date(refDate).toLocaleDateString('fr-FR')}</strong><br/>
        Date cible : <strong>${targetDate.toLocaleDateString('fr-FR')}</strong>
      </p>
    </div>
    <a href="${caseUrl}" style="display:inline-block;background:#c8a96e;color:#1a1918;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
      Voir le dossier →
    </a>
    <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;">Alerte automatique Bali Interns OS · ${today.toLocaleDateString('fr-FR')}</p>
  </div>
</div>`,
          })
          alertsSent++
          newFlags[alertKey] = true
        } catch (e) {
          errors.push(`${alertKey}: ${String(e)}`)
        }
      }
    }

    if (Object.keys(newFlags).length > 0) {
      await supabase.from('cases').update({
        alert_sent_flags: { ...sentFlags, ...newFlags }
      }).eq('id', c.id)
    }
  }


  // ── J+7 no employer response ──────────────────────────────────────────────
  const j7ago = new Date(); j7ago.setDate(j7ago.getDate() - 7)
  const admin = getServiceClient()
  const { data: noResponseSubs } = await admin
    .from('job_submissions')
    .select('id, case_id, submitted_at, no_employer_response_alerted_at, jobs(title, public_title, companies(name))')
    .eq('status', 'sent')
    .eq('employer_decision', 'pending')
    .lt('submitted_at', j7ago.toISOString())
    .is('no_employer_response_alerted_at', null)
    .limit(50)

  for (const sub of noResponseSubs ?? []) {
    const job = sub.jobs as Record<string, unknown> | null
    await admin.from('admin_notifications').insert({
      type: 'no_employer_response',
      title: `⏰ No response — ${(job?.companies as Record<string,unknown> | null)?.name ?? 'Employer'} (7 days)`,
      body: `Position: ${job?.public_title ?? job?.title ?? 'Internship'}. Consider sending a WhatsApp follow-up.`,
      case_id: sub.case_id,
      priority: 'high',
      is_read: false,
    }).then(() => null, () => null)
    await admin.from('job_submissions').update({
      no_employer_response_alerted_at: new Date().toISOString()
    }).eq('id', sub.id)
  }

  return NextResponse.json({ processed: cases.length, alerts_sent: alertsSent, errors, date: today.toISOString().split('T')[0] })
}
