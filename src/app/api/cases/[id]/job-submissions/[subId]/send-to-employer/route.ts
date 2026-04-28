import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendJobSubmittedEmployer, sendFromTemplate } from '@/lib/email/resend'

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, subId } = await params
  const admin = getAdmin()

  // Fetch submission + job + case + intern
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`
      id, status, job_id, employer_decision,
      jobs!job_submissions_job_id_fkey(
        id, title, public_title, public_description, job_monthly_pay,
        wished_starting_date, wished_internship_duration,
        contacts!jobs_contact_id_fkey(
          id, first_name, last_name, email, whatsapp,
          companies!contacts_company_id_fkey(id, name, internship_city)
        )
      )
    `)
    .eq('id', subId)
    .single()

  const { data: caseRow } = await admin
    .from('cases')
    .select(`
      id, status, cv_status, portal_token, desired_start_date, desired_duration,
      interns(id, first_name, last_name, email, whatsapp, cv_url, local_cv_url,
              nationality_id, birth_date, spoken_languages)
    `)
    .eq('id', id)
    .single()

  if (!sub || !caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Gate: CV must be validated
  if (caseRow.cv_status && caseRow.cv_status !== 'validated') {
    return NextResponse.json({
      error: 'CV must be validated before sending to employer',
      cv_status: caseRow.cv_status,
    }, { status: 422 })
  }

  const job = sub.jobs as unknown as Record<string, unknown>
  const contact = (job?.contacts as unknown) as Record<string, unknown> | null
  const company = (contact?.companies as unknown) as Record<string, unknown> | null
  const intern = caseRow.interns as unknown as Record<string, unknown> | null

  const employerEmail = contact?.email as string | null
  if (!employerEmail) {
    return NextResponse.json({ error: 'No employer email on file', emailSent: false }, { status: 422 })
  }

  // CV URL: use public URL if available, fallback to local_cv_url
  const cvUrl = (intern?.local_cv_url || intern?.cv_url) as string | null

  // ── Upsert employer portal access (1 per company) ──────────────────────
  const companyId = company?.id as string | null
  let portalToken: string | null = null

  if (companyId) {
    const { data: existing } = await admin
      .from('employer_portal_access')
      .select('id, token')
      .eq('company_id', companyId)
      .single()

    if (existing) {
      portalToken = existing.token as string
    } else {
      const newToken = crypto.randomUUID()
      await admin.from('employer_portal_access').insert({
        company_id: companyId,
        token: newToken,
        case_id: id, // kept for backward compat
        created_at: new Date().toISOString(),
      })
      portalToken = newToken
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const portalUrl = portalToken ? `${appUrl}/portal/employer/${portalToken}` : null

  // ── Send email ─────────────────────────────────────────────────────────
  try {
    await sendJobSubmittedEmployer({
      employerEmail,
      employerName: contact?.first_name as string ?? 'there',
      internFirstName: intern?.first_name as string ?? '',
      internLastName: intern?.last_name as string ?? '',
      jobTitle: (job?.title || job?.public_title) as string ?? '',
      cvUrl: cvUrl ?? '',
      caseId: id,
      portalUrl: portalUrl ?? undefined,
    })
  } catch (e) {
    console.error('[send-to-employer] email error:', e)
    return NextResponse.json({ error: 'Email send failed', emailSent: false }, { status: 500 })
  }

  // ── Update submission status ───────────────────────────────────────────
  await admin.from('job_submissions').update({
    status: 'sent',
    employer_decision: 'pending',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // ── Send "interview_imminent" email to intern ──────────────────────────
  if (intern?.email) {
    const deadline = new Date(); deadline.setDate(deadline.getDate() + 7)
    const deadlineStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const portalInternUrl = `${appUrl}/portal/${caseRow.portal_token}`
    void sendFromTemplate({
      slug: 'interview_imminent',
      to: intern.email as string,
      vars: {
        first_name: intern.first_name as string ?? 'there',
        contact_deadline: deadlineStr,
        portal_url: portalInternUrl,
      },
    })
  }

  // ── Admin notification ─────────────────────────────────────────────────
  await admin.from('admin_notifications').insert({
    type: 'cv_sent',
    title: `CV sent — ${intern?.first_name} ${intern?.last_name}`,
    message: `CV sent to ${company?.name ?? employerEmail} for ${(job?.title || job?.public_title) as string}`,
    case_id: id,
    priority: 'normal',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  // ── Activity log ──────────────────────────────────────────────────────
  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'cv_sent',
    title: 'CV sent to employer',
    description: `Sent to ${company?.name ?? employerEmail} — ${(job?.title || job?.public_title) as string}`,
    source: 'manual',
    status: 'completed',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  return NextResponse.json({ success: true, emailSent: true, portalToken, portalUrl })
}
