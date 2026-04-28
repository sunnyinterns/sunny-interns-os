import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendFromTemplate(opts: {
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
    subject = subject.replace(re, v ?? '')
    html = html.replace(re, v ?? '')
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, subId } = await params
  const admin = getAdmin()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // --- Load submission + job + company + contact
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`
      *,
      jobs(
        id, title, public_title, department,
        companies!jobs_company_id_fkey(id, name, email),
        contacts!jobs_contact_id_fkey(id, first_name, last_name, email, whatsapp)
      )
    `)
    .eq('id', subId)
    .single()

  const { data: caseRow } = await admin
    .from('cases')
    .select(`
      *,
      interns(first_name, last_name, email, cv_url, local_cv_url,
        nationality, date_of_birth, spoken_languages, desired_duration_months,
        desired_start_date, linkedin_url, stage_ideal),
      scheduling_managers!cases_assigned_manager_id_fkey(id, first_name, email, whatsapp)
    `)
    .eq('id', id)
    .single()

  if (!sub || !caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Gate: CV must be validated
  const cvStatus = (caseRow as Record<string, unknown>).cv_status as string | null
  if (cvStatus && cvStatus !== 'validated') {
    return NextResponse.json({
      error: 'CV must be validated before sending to employer',
      cv_status: cvStatus,
    }, { status: 422 })
  }

  const job = (sub.jobs ?? {}) as Record<string, unknown>
  const company = (job.companies ?? {}) as Record<string, unknown>
  const contact = (job.contacts ?? {}) as Record<string, unknown>
  const intern = (caseRow.interns ?? {}) as Record<string, unknown>
  const managersArr = (caseRow as Record<string, unknown>).scheduling_managers
  const manager = Array.isArray(managersArr) ? managersArr[0] as Record<string, unknown> | null : managersArr as Record<string, unknown> | null
  const companyId = company.id as string | null
  const cvUrl = (intern.local_cv_url ?? intern.cv_url) as string | null
  const contactEmail = (contact.email ?? company.email) as string | null

  // --- Upsert employer_portal_access (1 per company)
  let portalToken: string | null = null
  if (companyId) {
    const { data: existing } = await admin
      .from('employer_portal_access')
      .select('token')
      .eq('company_id', companyId)
      .single()

    if (existing?.token) {
      portalToken = existing.token
      // Update sent_at
      await admin.from('employer_portal_access').update({
        sent_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      }).eq('company_id', companyId)
    } else {
      // Create new portal access
      const newToken = crypto.randomUUID()
      await admin.from('employer_portal_access').insert({
        company_id: companyId,
        contact_id: contact.id ?? null,
        token: newToken,
        sent_at: new Date().toISOString(),
        case_id: id, // first case — used for context
        company_info_validated: false,
      })
      portalToken = newToken
    }
  }

  const portalUrl = portalToken
    ? `${APP_URL}/portal/employer/${portalToken}`
    : null

  // --- Send email to employer
  let emailSent = false
  if (contactEmail) {
    try {
      // Calculate intern age
      const dob = intern.date_of_birth as string | null
      const age = dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null

      const langs = (intern.spoken_languages as string[] | null)?.join(', ') ?? '—'
      const duration = intern.desired_duration_months
        ? `${intern.desired_duration_months} month${(intern.desired_duration_months as number) > 1 ? 's' : ''}`
        : '—'
      const startDate = intern.desired_start_date
        ? new Date(intern.desired_start_date as string).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '—'

      await sendFromTemplate({
        slug: 'job_submitted_employer',
        to: contactEmail,
        vars: {
          employer_first_name: (contact.first_name ?? 'there') as string,
          intern_first_name: (intern.first_name ?? '') as string,
          intern_last_name: (intern.last_name ?? '') as string,
          job_title: (job.public_title ?? job.title ?? '') as string,
          cv_url: cvUrl ?? '',
          intern_nationality: (intern.nationality ?? '—') as string,
          intern_age: age ? String(age) : '—',
          intern_languages: langs,
          intern_duration: duration,
          intern_start_date: startDate,
          intern_linkedin: (intern.linkedin_url ?? '') as string,
          intern_motivation: (intern.stage_ideal ?? '') as string,
          charly_notes: '', // set via notes_charly on submission if exists
          portal_url: portalUrl ?? '',
          manager_first_name: (manager?.first_name ?? 'The Bali Interns team') as string,
          manager_whatsapp: (manager?.whatsapp ?? '') as string,
        },
      })
      emailSent = true
    } catch (e) {
      console.error('[send-to-employer] email error:', e)
    }
  }

  // --- Update job_submission: status sent + employer_notified_at
  await admin.from('job_submissions').update({
    status: 'sent',
    submitted_at: new Date().toISOString(),
    employer_notified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // --- Log activity
  await logActivity({
    caseId: id,
    type: 'job_sent_employer',
    title: `Application sent to ${company.name ?? 'employer'}`,
    description: `"${job.public_title ?? job.title}" — ${emailSent ? 'email sent' : 'email failed'} — portal: ${portalUrl ?? 'none'}`,
    metadata: { job_id: job.id, employer: company.name, email_sent: emailSent, portal_url: portalUrl },
  })

  // --- Admin notification if email failed
  if (!emailSent && contactEmail) {
    await admin.from('admin_notifications').insert({
      type: 'email_failed',
      title: `⚠️ Email failed — ${company.name}`,
      message: `CV for ${intern.first_name} ${intern.last_name} could not be sent to ${contactEmail}. Check the email address in the company profile.`,
      case_id: id,
      priority: 'high',
      read: false,
    }).then(() => null, () => null)
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    portalUrl,
    warning: !emailSent ? 'Email could not be sent — check employer email address' : null,
  })
}
