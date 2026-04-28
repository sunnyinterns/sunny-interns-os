/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const body = await req.json() as { decision: 'interested' | 'not_interested'; comment?: string }
  if (!['interested','not_interested'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }
  const sb = svc()
  const { data: access } = await sb.from('employer_portal_access').select('id,company_id').eq('token', token).single()
  if (!access) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: sub } = await sb.from('job_submissions').select('id,case_id,employer_decision,candidate_decision').eq('id', subId).single()
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.employer_decision === body.decision) return NextResponse.json({ ok: true, unchanged: true })

  const { data: jobRow } = await sb.from('job_submissions').select('jobs(id,public_title,title,companies(id,name))').eq('id', subId).single()
  const job = (jobRow as any)?.jobs as any
  const caseRow = await sb.from('cases').select('id,status,portal_token,interns(first_name,last_name,email)').eq('id', sub.case_id).single()
  const c = caseRow.data as any
  const intern = (Array.isArray(c?.interns) ? c.interns[0] : c?.interns) as any
  const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
  const jobTitle = String(job?.public_title ?? job?.title ?? 'Internship')
  const companyName = String((Array.isArray(job?.companies) ? job.companies[0] : job?.companies)?.name ?? 'Employer')
  const caseId = sub.case_id

  await sb.from('job_submissions').update({ employer_decision: body.decision, employer_decision_at: new Date().toISOString(), employer_comment: body.comment ?? null, updated_at: new Date().toISOString() }).eq('id', subId)
  await sb.from('employer_portal_access').update({ last_active_at: new Date().toISOString() }).eq('token', token)

  await sb.from('activity_feed').insert({ case_id: caseId, type: 'employer_decision', title: `Employer: ${body.decision === 'interested' ? 'Interested ✅' : 'Not a match ❌'}`, description: `${companyName} marked "${jobTitle}" as ${body.decision}${body.comment ? ` — "${body.comment}"` : ''}`, source: 'portal_employer', status: 'completed' }).then(() => null, () => null)

  await sb.from('admin_notifications').insert({ type: body.decision === 'interested' ? 'employer_interested' : 'employer_not_interested', title: body.decision === 'interested' ? `🔔 ${companyName} interested in ${internName}` : `❌ ${companyName} not interested in ${internName}`, body: `Position: ${jobTitle}${body.comment ? `\nComment: ${body.comment}` : ''}`, case_id: caseId, priority: body.decision === 'interested' ? 'high' : 'normal', is_read: false }).then(() => null, () => null)

  if (body.decision === 'interested') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
    const { sendFromTemplate } = await import('@/lib/email/resend')
    void sendFromTemplate({ slug: 'employer_interested_charly', to: 'team@bali-interns.com', vars: { manager_name: 'Charly', company_name: companyName, intern_name: internName, intern_first_name: String(intern?.first_name ?? ''), job_title: jobTitle, employer_comment: body.comment ?? '', case_url: `${appUrl}/fr/cases/${caseId}` } }).catch(() => null)
  }

  if (body.decision === 'interested' && sub.candidate_decision === 'interested') {
    const { data: ex } = await sb.from('job_submissions').select('status').eq('id', subId).single()
    if (ex?.status !== 'retained') {
      await sb.from('job_submissions').update({ status: 'retained', updated_at: new Date().toISOString() }).eq('id', subId)
      await sb.from('job_submissions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('case_id', caseId).neq('id', subId).neq('status', 'retained')
      await sb.from('cases').update({ status: 'job_retained', updated_at: new Date().toISOString() }).eq('id', caseId)
      await sb.from('admin_notifications').insert({ type: 'mutual_match', title: `🎉 Mutual match — ${internName}`, body: `Both sides agreed on "${jobTitle}". Case → Job Retained. Send cancellation emails to other employers.`, case_id: caseId, priority: 'critical', is_read: false }).then(() => null, () => null)
    }
  }

  return NextResponse.json({ ok: true, decision: body.decision })
}
