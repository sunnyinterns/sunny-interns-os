import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * Employer marks their decision on a candidature from their portal
 * POST /api/portal/employer/[token]/candidature/[subId]/respond
 * Body: { decision: 'interested' | 'not_interested', comment?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const body = await req.json() as { decision: 'interested' | 'not_interested'; comment?: string }

  if (!['interested', 'not_interested'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  const sb = svc()

  // Verify token belongs to this employer
  const { data: access } = await sb
    .from('employer_portal_access')
    .select('id, company_id')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Get the submission + case + intern + job info
  const { data: sub } = await sb
    .from('job_submissions')
    .select(`
      id, case_id, employer_decision, candidate_decision,
      jobs(id, public_title, title,
        companies(id, name)
      ),
      cases(id, status, portal_token,
        interns(first_name, last_name, email)
      )
    `)
    .eq('id', subId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Idempotency: if already same decision, ignore
  if (sub.employer_decision === body.decision) {
    return NextResponse.json({ ok: true, unchanged: true })
  }

  // Update decision
  await sb.from('job_submissions').update({
    employer_decision: body.decision,
    employer_decision_at: new Date().toISOString(),
    employer_comment: body.comment ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // Mark portal as active
  await sb.from('employer_portal_access').update({
    last_active_at: new Date().toISOString(),
  }).eq('token', token)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = sub as any
  const job = (Array.isArray(subAny.jobs) ? subAny.jobs[0] : subAny.jobs) as Record<string, unknown> | null
  const caseRow = (Array.isArray(subAny.cases) ? subAny.cases[0] : subAny.cases) as Record<string, unknown> | null
  const intern = (Array.isArray(caseRow?.interns) ? (caseRow.interns as unknown[])[0] : caseRow?.interns) as Record<string, unknown> | null
  const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
  const jobTitle = String(job?.public_title ?? job?.title ?? 'Internship')
  const caseId = sub.case_id

  // Activity log
  await sb.from('activity_feed').insert({
    case_id: caseId,
    type: 'employer_decision',
    title: `Employer: ${body.decision === 'interested' ? 'Interested ✅' : 'Not a match ❌'}`,
    description: `${(job?.companies as Record<string,unknown> | null)?.name ?? 'Employer'} marked "${jobTitle}" as ${body.decision}${body.comment ? ` — "${body.comment}"` : ''}`,
    source: 'portal_employer',
    status: 'completed',
  }).then(() => null, () => null)

  // Admin notification for Charly
  await sb.from('admin_notifications').insert({
    type: body.decision === 'interested' ? 'employer_interested' : 'employer_not_interested',
    title: body.decision === 'interested'
      ? `🔔 ${(job?.companies as Record<string,unknown> | null)?.name ?? 'Employer'} interested in ${internName}`
      : `❌ ${(job?.companies as Record<string,unknown> | null)?.name ?? 'Employer'} not interested in ${internName}`,
    body: `Position: ${jobTitle}${body.comment ? `\nComment: ${body.comment}` : ''}`,
    case_id: caseId,
    priority: body.decision === 'interested' ? 'high' : 'normal',
    is_read: false,
  }).then(() => null, () => null)

  // Email Charly if employer is interested
  if (body.decision === 'interested') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
    const { sendFromTemplate } = await import('@/lib/email/resend')
    void sendFromTemplate({
      slug: 'employer_interested_charly',
      to: 'team@bali-interns.com',
      vars: {
        manager_name: 'Charly',
        company_name: String((job?.companies as Record<string,unknown> | null)?.name ?? 'The employer'),
        intern_name: internName,
        intern_first_name: String(intern?.first_name ?? ''),
        job_title: jobTitle,
        employer_comment: body.comment ?? '',
        case_url: `${appUrl}/fr/cases/${caseId}`,
      },
    }).catch(() => null)
  }

  // Check for mutual interest → auto-retain
  const updatedCandidateDecision = sub.candidate_decision
  if (body.decision === 'interested' && updatedCandidateDecision === 'interested') {
    await triggerRetain(sb, subId, caseId, jobTitle, internName)
  }

  return NextResponse.json({ ok: true, decision: body.decision })
}

async function triggerRetain(
  sb: ReturnType<typeof svc>,
  subId: string,
  caseId: string,
  jobTitle: string,
  internName: string
) {
  // Check not already retained (idempotency)
  const { data: existing } = await sb
    .from('job_submissions')
    .select('id, status')
    .eq('id', subId)
    .single()

  if (existing?.status === 'retained') return

  // Mark this submission as retained
  await sb.from('job_submissions').update({
    status: 'retained',
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // Cancel all OTHER submissions for this intern
  await sb.from('job_submissions').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('case_id', caseId).neq('id', subId).neq('status', 'retained')

  // Update case status
  await sb.from('cases').update({
    status: 'job_retained',
    updated_at: new Date().toISOString(),
  }).eq('id', caseId)

  // Admin notification: mutual match
  await sb.from('admin_notifications').insert({
    type: 'mutual_match',
    title: `🎉 Mutual match — ${internName}`,
    body: `Both employer and candidate agreed on "${jobTitle}". Case moved to Job Retained. Other submissions cancelled — please send cancellation emails.`,
    case_id: caseId,
    priority: 'critical',
    is_read: false,
  }).then(() => null, () => null)

  // To-Do: flag cancellations pending
  await sb.from('activity_feed').insert({
    case_id: caseId,
    type: 'mutual_match',
    title: '🎉 Mutual match confirmed',
    description: `Both sides agreed on "${jobTitle}". Other candidatures cancelled. Action required: send cancellation emails to other employers.`,
    source: 'system',
    status: 'action_required',
  }).then(() => null, () => null)
}
