import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * Candidate marks their interest/decision on a job from their portal
 * POST /api/portal/[token]/jobs/[subId]/interest
 * Body: { decision: 'interested' | 'not_interested' }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const body = await req.json() as { decision: 'interested' | 'not_interested' }

  if (!['interested', 'not_interested'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  const sb = svc()

  // Verify token belongs to this candidate's case
  const { data: caseRow } = await sb
    .from('cases')
    .select('id, status, interns(first_name, last_name, email)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Get the submission
  const { data: sub } = await sb
    .from('job_submissions')
    .select('id, case_id, employer_decision, candidate_decision, jobs(id, public_title, title)')
    .eq('id', subId)
    .eq('case_id', caseRow.id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Idempotency
  if (sub.candidate_decision === body.decision) {
    return NextResponse.json({ ok: true, unchanged: true })
  }

  // Must be in interview status to declare interest
  if (sub.candidate_decision === 'pending' && !['interview', 'sent', 'proposed', 'pending'].includes(sub.candidate_decision)) {
    return NextResponse.json({ error: 'Cannot declare interest at this stage' }, { status: 422 })
  }

  // Update decision
  await sb.from('job_submissions').update({
    candidate_decision: body.decision,
    candidate_decision_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = (Array.isArray((sub as any).jobs) ? (sub as any).jobs[0] : (sub as any).jobs) as Record<string, unknown> | null
  const intern = caseRow.interns as Record<string, unknown> | null
  const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
  const jobTitle = String(job?.public_title ?? job?.title ?? 'Internship')
  const caseId = caseRow.id as string
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // Activity log
  await sb.from('activity_feed').insert({
    case_id: caseId,
    type: 'candidate_decision',
    title: `Candidate: ${body.decision === 'interested' ? 'Wants to join ✅' : 'Not interested ❌'}`,
    description: `${internName} marked "${jobTitle}" as ${body.decision}`,
    source: 'portal_intern',
    status: 'completed',
  }).then(() => null, () => null)

  // Admin notification → Charly (always: candidate has the last word)
  await sb.from('admin_notifications').insert({
    type: body.decision === 'interested' ? 'candidate_interested' : 'candidate_not_interested',
    title: body.decision === 'interested'
      ? `🙋 ${intern?.first_name ?? 'Candidate'} wants to join — action required`
      : `❌ ${intern?.first_name ?? 'Candidate'} is not interested in this position`,
    body: `Position: ${jobTitle}\n${body.decision === 'interested' ? 'Both sides must agree for the match to be confirmed. Check employer decision.' : ''}`,
    case_id: caseId,
    priority: body.decision === 'interested' ? 'high' : 'normal',
    is_read: false,
  }).then(() => null, () => null)

  // Check mutual interest → auto-retain
  if (body.decision === 'interested' && sub.employer_decision === 'interested') {
    // Both interested → trigger retain
    const { data: existing } = await sb.from('job_submissions').select('status').eq('id', subId).single()
    if (existing?.status !== 'retained') {
      await sb.from('job_submissions').update({ status: 'retained', updated_at: new Date().toISOString() }).eq('id', subId)
      await sb.from('job_submissions').update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('case_id', caseId).neq('id', subId).neq('status', 'retained')
      await sb.from('cases').update({ status: 'job_retained', updated_at: new Date().toISOString() }).eq('id', caseId)
      await sb.from('admin_notifications').insert({
        type: 'mutual_match',
        title: `🎉 Mutual match — ${internName}`,
        body: `Both sides agreed on "${jobTitle}". Case → Job Retained. Send cancellation emails to other employers.`,
        case_id: caseId,
        priority: 'critical',
        is_read: false,
      }).then(() => null, () => null)
      await sb.from('activity_feed').insert({
        case_id: caseId,
        type: 'mutual_match',
        title: '🎉 Mutual match confirmed',
        description: `${internName} and employer both agreed on "${jobTitle}". Action required: send cancellation emails to other employers.`,
        source: 'system',
        status: 'action_required',
      }).then(() => null, () => null)
    }
  }

  return NextResponse.json({ ok: true, decision: body.decision })
}
