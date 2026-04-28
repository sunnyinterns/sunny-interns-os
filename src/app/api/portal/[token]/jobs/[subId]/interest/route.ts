import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/portal/[token]/jobs/[subId]/interest
// Body: { decision: 'interested' | 'not_interested' }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const admin = getAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // Validate token via case
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, portal_token, interns(first_name, last_name)')
    .eq('portal_token', token)
    .single()
  if (!caseRow) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json() as { decision: string }
  const { decision } = body
  if (!['interested', 'not_interested'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  // Fetch submission — must belong to this case
  const { data: sub } = await admin
    .from('job_submissions')
    .select('id, case_id, candidate_decision, status, jobs(public_title, title, companies(name))')
    .eq('id', subId)
    .eq('case_id', caseRow.id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow decision when status = interview
  if (sub.status !== 'interview') {
    return NextResponse.json({ error: 'Decision only possible after interview stage' }, { status: 422 })
  }

  // Idempotency
  if (sub.candidate_decision === decision) {
    return NextResponse.json({ ok: true, decision, unchanged: true })
  }

  await admin.from('job_submissions').update({
    candidate_decision: decision,
    candidate_decision_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  const intern = (caseRow.interns ?? {}) as Record<string, unknown>
  const job = (sub.jobs ?? {}) as Record<string, unknown>
  const company = (job.companies ?? {}) as Record<string, unknown>
  const internName = `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim()
  const jobTitle = String(job.public_title ?? job.title ?? '')
  const companyName = String(company.name ?? '')

  // Admin notification
  await admin.from('admin_notifications').insert({
    type: decision === 'interested' ? 'candidate_interested' : 'candidate_not_interested',
    title: decision === 'interested'
      ? `🙋 ${internName} wants to join ${companyName}`
      : `❌ ${internName} declined ${companyName}`,
    message: `Job: ${jobTitle}`,
    case_id: caseRow.id,
    priority: decision === 'interested' ? 'high' : 'normal',
    read: false,
  }).then(() => null, () => null)

  // Email Charly
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Bali Interns OS <team@bali-interns.com>',
    to: 'team@bali-interns.com',
    subject: decision === 'interested'
      ? `[Action needed] ${internName} wants to join ${companyName}`
      : `[FYI] ${internName} declined ${companyName}`,
    html: `<p><strong>${internName}</strong> marked ${decision === 'interested' ? '<strong>I want to join</strong>' : '<strong>Not for me</strong>'} for:</p>
<p>Company: ${companyName} — Job: ${jobTitle}</p>
<p><a href="${appUrl}/fr/cases/${caseRow.id}">→ Open case in OS</a></p>`,
  }).catch(() => null)

  // Check if both sides are interested → suggest retain to Charly
  const { data: updatedSub } = await admin
    .from('job_submissions')
    .select('employer_decision, candidate_decision')
    .eq('id', subId)
    .single()

  if (updatedSub?.employer_decision === 'interested' && updatedSub?.candidate_decision === 'interested') {
    await admin.from('admin_notifications').insert({
      type: 'match_ready',
      title: `🎯 MATCH — ${internName} + ${companyName} — confirm as Retained`,
      message: `Both sides agreed. Open the case to confirm the placement.`,
      case_id: caseRow.id,
      priority: 'critical',
      read: false,
    }).then(() => null, () => null)
  }

  return NextResponse.json({ ok: true, decision })
}
