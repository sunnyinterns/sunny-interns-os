import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/portal/employer/[token]/candidature/[subId]
// Body: { decision: 'interested' | 'not_interested', comment?: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const admin = getAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // Validate token
  const { data: access } = await admin
    .from('employer_portal_access')
    .select('id, company_id, viewed_at, viewed_at_notified_at')
    .eq('token', token)
    .single()
  if (!access) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json() as { decision: string; comment?: string }
  const { decision, comment } = body
  if (!['interested', 'not_interested'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  // Fetch submission to verify it belongs to this company
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`id, case_id, employer_decision, status,
      jobs(public_title, title, companies(id, name)),
      cases(interns(first_name, last_name))`)
    .eq('id', subId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify company matches
  const jobCompanyId = ((sub.jobs as Record<string, unknown>)?.companies as Record<string, unknown>)?.id
  if (jobCompanyId !== access.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Idempotency: if already same decision, return ok
  if (sub.employer_decision === decision) {
    return NextResponse.json({ ok: true, decision, unchanged: true })
  }

  // Update job_submission
  await admin.from('job_submissions').update({
    employer_decision: decision,
    employer_decision_at: new Date().toISOString(),
    employer_comment: comment ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // Fetch intern + job info for notifications
  const internData = (Array.isArray((sub.cases as Record<string,unknown>)?.interns) ? ((sub.cases as Record<string,unknown>).interns as Record<string,unknown>[])[0] : ((sub.cases as Record<string,unknown>)?.interns ?? {})) as Record<string,unknown>
  const jobData = (sub.jobs ?? {}) as Record<string,unknown>
  const companyData = (jobData.companies ?? {}) as Record<string,unknown>
  const internName = `${internData.first_name ?? ''} ${internData.last_name ?? ''}`.trim()
  const jobTitle = String(jobData.public_title ?? jobData.title ?? '')
  const employerName = String(companyData.name ?? '')
  const caseId = sub.case_id as string

  // Admin notification → Charly
  await admin.from('admin_notifications').insert({
    type: decision === 'interested' ? 'employer_interested' : 'employer_not_interested',
    title: decision === 'interested'
      ? `✅ ${employerName} is interested in ${internName}`
      : `❌ ${employerName} is not interested in ${internName}`,
    message: `Job: ${jobTitle}${comment ? ` — Comment: ${comment}` : ''}`,
    case_id: caseId,
    priority: decision === 'interested' ? 'high' : 'normal',
    read: false,
  }).then(() => null, () => null)

  // Internal alert email to Charly if interested
  if (decision === 'interested') {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Bali Interns OS <team@bali-interns.com>',
      to: 'team@bali-interns.com',
      subject: `[Action needed] ${employerName} is interested in ${internName}`,
      html: `<p><strong>${employerName}</strong> marked <strong>${internName}</strong> as <strong>Interested</strong>.</p>
<p>Job: ${jobTitle}</p>
${comment ? `<p>Employer comment: ${comment}</p>` : ''}
<p><a href="${appUrl}/fr/cases/${caseId}">→ Open case in OS</a></p>`,
    }).catch(() => null)
  }

  // Update portal last_active
  await admin.from('employer_portal_access').update({
    last_active_at: new Date().toISOString(),
  }).eq('token', token)

  return NextResponse.json({ ok: true, decision })
}
