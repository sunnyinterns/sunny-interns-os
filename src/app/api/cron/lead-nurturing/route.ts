import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Cron lead-nurturing — runs daily at 8h UTC
 *
 * Population 1 — Apply form abandon (case status=lead, no meeting date)
 *   Sequence: J+2 / J+5 / J+10 / J+21
 *   Tracked via: cases.alert_sent_flags (apply_followup_1/2/3/4)
 *
 * Population 2 — Simulator leads (leads table, deadline_to_apply set)
 *   Sequence: J-30 / J-14 / J-7 relative to deadline_to_apply
 *   Tracked via: leads.r1_at / r2_at / r3_at
 */

const APPLY_SEQUENCE = [
  { key: 'apply_followup_1', slug: 'apply_followup_1', daysAfterCreation: 2 },
  { key: 'apply_followup_2', slug: 'apply_followup_2', daysAfterCreation: 5 },
  { key: 'apply_followup_3', slug: 'apply_followup_3', daysAfterCreation: 10 },
  { key: 'apply_followup_4', slug: 'apply_followup_4', daysAfterCreation: 21 },
] as const

const SIMULATOR_SEQUENCE = [
  { key: 'r1_at', slug: 'simulator_urgency_j30', daysBeforeDeadline: 30 },
  { key: 'r2_at', slug: 'simulator_urgency_j14', daysBeforeDeadline: 14 },
  { key: 'r3_at', slug: 'simulator_urgency_j7',  daysBeforeDeadline: 7  },
] as const

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendViaTemplate(opts: {
  slug: string; to: string; vars: Record<string, string>
}) {
  const admin = getAdmin()
  const { data: tmpl } = await admin
    .from('email_templates')
    .select('subject, body_html')
    .eq('slug', opts.slug)
    .eq('is_active', true)
    .single()

  if (!tmpl) throw new Error(`Template not found: ${opts.slug}`)

  let subject = tmpl.subject as string
  let html = tmpl.body_html as string
  for (const [k, v] of Object.entries(opts.vars)) {
    const re = new RegExp(`{{${k}}}`, 'g')
    subject = subject.replace(re, v)
    html = html.replace(re, v)
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Bali Interns <team@bali-interns.com>',
    to: opts.to,
    subject,
    html,
  })
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const vitrine = process.env.NEXT_PUBLIC_VITRINE_URL ?? 'https://bali-interns.com'
  const sent: string[] = []
  const errors: string[] = []

  // ── POPULATION 1 — Apply form abandon ─────────────────────────────────────
  const cutoff1 = new Date(today); cutoff1.setDate(cutoff1.getDate() - 1)
  const { data: abandonedCases } = await admin
    .from('cases')
    .select('id, created_at, alert_sent_flags, interns(first_name, email)')
    .eq('status', 'lead')
    .is('intern_first_meeting_date', null)
    .lt('created_at', cutoff1.toISOString())
    .limit(100)

  for (const c of abandonedCases ?? []) {
    const intern = c.interns as { first_name?: string; email?: string } | null
    if (!intern?.email) continue

    const flags = (c.alert_sent_flags ?? {}) as Record<string, boolean>
    const createdAt = new Date(c.created_at as string); createdAt.setHours(0, 0, 0, 0)
    const daysSince = daysBetween(createdAt, today)
    const newFlags: Record<string, boolean> = {}

    for (const step of APPLY_SEQUENCE) {
      if (flags[step.key]) continue
      if (daysSince < step.daysAfterCreation) continue

      try {
        await sendViaTemplate({
          slug: step.slug,
          to: intern.email,
          vars: {
            first_name: intern.first_name ?? 'there',
            booking_url: `${vitrine}/fr/apply`,
          },
        })
        newFlags[step.key] = true
        sent.push(`[abandon] ${intern.email} → ${step.slug}`)
        break // one email per day per lead
      } catch (e) {
        errors.push(`[abandon] ${intern.email}: ${String(e)}`)
      }
    }

    if (Object.keys(newFlags).length > 0) {
      await admin.from('cases').update({
        alert_sent_flags: { ...flags, ...newFlags },
        updated_at: new Date().toISOString(),
      }).eq('id', c.id)
    }

    // J+21 sent + 4 days grace → archive
    if (flags['apply_followup_4'] && daysSince > 25) {
      await admin.from('cases')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', c.id)
        .eq('status', 'lead')
    }
  }

  // ── POPULATION 2 — Simulator leads ─────────────────────────────────────────
  const { data: simulatorLeads } = await admin
    .from('leads')
    .select('id, email, first_name, deadline_to_apply, r1_at, r2_at, r3_at, months_selected, desired_start_date')
    .not('deadline_to_apply', 'is', null)
    .not('email', 'is', null)
    .or('applied.is.null,applied.eq.false')
    .or('unsubscribed.is.null,unsubscribed.eq.false')
    .limit(500)

  for (const lead of simulatorLeads ?? []) {
    const email = lead.email as string
    const firstName = (lead.first_name as string | null) ?? 'there'
    const deadline = new Date(lead.deadline_to_apply as string); deadline.setHours(0, 0, 0, 0)
    const daysLeft = daysBetween(today, deadline)

    if (daysLeft < 0) continue // deadline passed

    const months = lead.months_selected as string[] | null
    const departureMonth = months?.[0] ?? (lead.desired_start_date
      ? new Date(lead.desired_start_date as string).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : 'your target month')

    for (const step of SIMULATOR_SEQUENCE) {
      const sentKey = step.key as 'r1_at' | 'r2_at' | 'r3_at'
      if (lead[sentKey]) continue // already sent
      // Trigger if we're within ±1 day of the target
      if (daysLeft > step.daysBeforeDeadline + 1) continue
      if (daysLeft < step.daysBeforeDeadline - 1) continue

      try {
        await sendViaTemplate({
          slug: step.slug,
          to: email,
          vars: {
            first_name: firstName,
            departure_month: departureMonth,
            apply_url: `${vitrine}/fr/apply`,
          },
        })
        await admin.from('leads').update({
          [sentKey]: new Date().toISOString(),
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', lead.id)
        sent.push(`[simulator] ${email} → ${step.slug}`)
        break
      } catch (e) {
        errors.push(`[simulator] ${email}: ${String(e)}`)
      }
    }
  }

  return NextResponse.json({
    date: today.toISOString().split('T')[0],
    sent: sent.length,
    errors: errors.length,
    detail: sent,
    ...(errors.length ? { error_detail: errors } : {}),
  })
}
