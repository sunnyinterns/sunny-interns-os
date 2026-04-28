import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json() as {
    sub_id: string
    decision: 'interested' | 'not_interested' | 'no_show' | 'cannot_reach'
    comment?: string
  }

  const admin = getAdmin()

  // Verify token
  const { data: access } = await admin
    .from('employer_portal_access')
    .select('id, company_id, case_id')
    .eq('token', token)
    .single()
  if (!access) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  // Verify submission belongs to this company
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`
      id, case_id, employer_decision, status,
      jobs!job_submissions_job_id_fkey(title, public_title,
        contacts!jobs_contact_id_fkey(first_name, companies!contacts_company_id_fkey(name))
      ),
      cases!job_submissions_case_id_fkey(
        portal_token,
        interns(first_name, last_name)
      )
    `)
    .eq('id', body.sub_id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  // Idempotency — don't notify if decision unchanged
  if (sub.employer_decision === body.decision) {
    return NextResponse.json({ success: true, unchanged: true })
  }

  const job = sub.jobs as unknown as unknown as Record<string, unknown>
  const contact = (job?.contacts as unknown as unknown as Record<string, unknown> | null)
  const company = contact?.companies as unknown as unknown as Record<string, unknown> | null
  const caseData = sub.cases as unknown as unknown as Record<string, unknown> | null
  const intern = caseData?.interns as unknown as unknown as Record<string, unknown> | null

  // Update submission
  await admin.from('job_submissions').update({
    employer_decision: body.decision,
    employer_decision_at: new Date().toISOString(),
    employer_comment: body.comment ?? null,
    status: body.decision === 'interested' ? 'interview' : body.decision === 'not_interested' ? 'rejected' : sub.status,
    updated_at: new Date().toISOString(),
  }).eq('id', body.sub_id)

  const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
  const jobTitle = ((job?.title || job?.public_title) as string) ?? ''
  const companyName = (company?.name as string) ?? 'employer'
  const decisionLabel = body.decision === 'interested' ? 'Interested ✅' : body.decision === 'not_interested' ? 'Not a match ❌' : body.decision

  // ── Notify Charly ──────────────────────────────────────────────────────
  const managerEmail = process.env.MANAGER_EMAIL ?? 'team@bali-interns.com'
  void sendFromTemplate({
    slug: 'internal_notification',
    to: managerEmail,
    vars: {
      title: `Employer response: ${decisionLabel}`,
      message: `${companyName} responded "${decisionLabel}" for ${internName} — ${jobTitle}${body.comment ? `\n\nComment: ${body.comment}` : ''}`,
      action_url: `${process.env.NEXT_PUBLIC_APP_URL}/fr/cases/${sub.case_id}`,
    },
  }).catch(() => null)

  // Admin notification in OS
  await admin.from('admin_notifications').insert({
    type: 'employer_response',
    title: `Employer ${decisionLabel} — ${internName}`,
    message: `${companyName}: ${decisionLabel} for ${jobTitle}${body.comment ? ` — "${body.comment}"` : ''}`,
    case_id: sub.case_id as string,
    priority: body.decision === 'interested' ? 'high' : 'normal',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  await admin.from('activity_feed').insert({
    case_id: sub.case_id as string,
    type: 'employer_responded',
    title: `Employer responded: ${decisionLabel}`,
    description: `${companyName} — ${jobTitle}${body.comment ? ` — "${body.comment}"` : ''}`,
    source: 'portal_employer',
    status: 'completed',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  return NextResponse.json({ success: true, decision: body.decision })
}
