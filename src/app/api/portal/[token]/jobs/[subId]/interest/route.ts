import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const body = await req.json() as { decision: 'interested' | 'not_interested' }

  const admin = getAdmin()

  // Verify portal token
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, status, interns(first_name, last_name, email)')
    .eq('portal_token', token)
    .single()
  if (!caseRow) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  // Verify submission belongs to this case
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`
      id, case_id, job_id, status, candidate_decision, employer_decision,
      jobs!job_submissions_job_id_fkey(title, public_title,
        contacts!jobs_contact_id_fkey(first_name, companies!contacts_company_id_fkey(name))
      )
    `)
    .eq('id', subId)
    .eq('case_id', caseRow.id)
    .single()
  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  if (sub.candidate_decision === body.decision) {
    return NextResponse.json({ success: true, unchanged: true })
  }

  const job = sub.jobs as unknown as unknown as Record<string, unknown>
  const contact = job?.contacts as unknown as unknown as Record<string, unknown> | null
  const company = contact?.companies as unknown as unknown as Record<string, unknown> | null
  const intern = caseRow.interns as unknown as unknown as Record<string, unknown> | null

  // Update candidate decision
  await admin.from('job_submissions').update({
    candidate_decision: body.decision,
    candidate_decision_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
  const jobTitle = ((job?.title || job?.public_title) as string) ?? ''
  const companyName = (company?.name as string) ?? 'employer'
  const decisionLabel = body.decision === 'interested' ? 'wants to join ✅' : 'not interested ❌'

  // ── Check for mutual match → auto-retain ──────────────────────────────
  const isMutualMatch = body.decision === 'interested' && sub.employer_decision === 'interested'

  if (isMutualMatch) {
    // Mark this submission as retained
    await admin.from('job_submissions').update({
      status: 'retained',
      updated_at: new Date().toISOString(),
    }).eq('id', subId)

    // Get all other active submissions for this intern
    const { data: otherSubs } = await admin
      .from('job_submissions')
      .select('id, job_id, jobs!job_submissions_job_id_fkey(title, contacts!jobs_contact_id_fkey(first_name, email, companies!contacts_company_id_fkey(name)))')
      .eq('case_id', caseRow.id)
      .neq('id', subId)
      .in('status', ['sent', 'interview', 'pending'])

    // Cancel all others + flag for Charly manual notification
    for (const os of otherSubs ?? []) {
      await admin.from('job_submissions').update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('id', os.id)
    }

    // Store cancellation list in alert_sent_flags for To-Do
    const { data: existingCase } = await admin.from('cases').select('alert_sent_flags').eq('id', caseRow.id).single()
    const flags = (existingCase?.alert_sent_flags ?? {}) as unknown as unknown as Record<string, unknown>
    const cancelList = (otherSubs ?? []).map(os => {
      const j = os.jobs as unknown as unknown as Record<string, unknown>
      const c = j?.contacts as unknown as unknown as Record<string, unknown> | null
      const co = c?.companies as unknown as unknown as Record<string, unknown> | null
      return {
        sub_id: os.id,
        job_title: (j?.title || j?.public_title) as string ?? '',
        employer_name: (co?.name as string) ?? '',
        employer_email: (c?.email as string) ?? '',
        employer_first_name: (c?.first_name as string) ?? '',
      }
    })

    await admin.from('cases').update({
      status: 'job_retained',
      alert_sent_flags: {
        ...flags,
        pending_cancellation_emails: cancelList.length > 0,
        cancellation_list: cancelList,
        retained_job_id: sub.job_id,
        retained_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }).eq('id', caseRow.id)

    // Notify Charly of match
    await admin.from('admin_notifications').insert({
      type: 'match_retained',
      title: `🎉 MATCH — ${internName} ↔ ${companyName}`,
      message: `Mutual match confirmed for ${jobTitle}. ${cancelList.length} other submission(s) cancelled — employer notifications pending your review.`,
      case_id: caseRow.id as string,
      priority: 'critical',
      created_at: new Date().toISOString(),
    }).then(() => null, () => null)

    await admin.from('activity_feed').insert({
      case_id: caseRow.id as string,
      type: 'job_retained',
      title: `🎉 Match confirmed — ${jobTitle}`,
      description: `${internName} + ${companyName} — both sides agreed. ${cancelList.length} other submission(s) cancelled.`,
      source: 'portal_intern',
      status: 'completed',
      created_at: new Date().toISOString(),
    }).then(() => null, () => null)

    // Send confirmation emails
    const managerEmail = process.env.MANAGER_EMAIL ?? 'team@bali-interns.com'
    void sendFromTemplate({ slug: 'job_retenu', to: intern?.email as string ?? '', vars: { first_name: intern?.first_name as string ?? 'there', job_title: jobTitle, portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}` } }).catch(() => null)

    return NextResponse.json({ success: true, decision: body.decision, match: true, case_status: 'job_retained' })
  }

  // ── Notify Charly (no match yet) ──────────────────────────────────────
  await admin.from('admin_notifications').insert({
    type: 'candidate_response',
    title: `Candidate ${decisionLabel} — ${internName}`,
    message: `${internName} ${decisionLabel} for ${jobTitle} @ ${companyName}`,
    case_id: caseRow.id as string,
    priority: body.decision === 'interested' ? 'high' : 'normal',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  await admin.from('activity_feed').insert({
    case_id: caseRow.id as string,
    type: 'candidate_responded',
    title: `Candidate decision: ${decisionLabel}`,
    description: `${jobTitle} @ ${companyName}`,
    source: 'portal_intern',
    status: 'completed',
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  return NextResponse.json({ success: true, decision: body.decision, match: false })
}
