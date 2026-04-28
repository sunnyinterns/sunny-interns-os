import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const admin = getAdmin()
  const body = await req.json() as { candidate_decision?: 'interested' | 'not_interested'; intern_interested?: boolean; intern_priority?: number }

  // Verify portal token
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, interns(first_name, last_name)')
    .eq('portal_token', token)
    .single()
  if (!caseRow) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.intern_interested !== undefined) updateData.intern_interested = body.intern_interested
  if (body.intern_priority !== undefined) updateData.intern_priority = body.intern_priority

  if (body.candidate_decision) {
    if (!['interested', 'not_interested'].includes(body.candidate_decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }
    updateData.candidate_decision = body.candidate_decision
    updateData.candidate_decision_at = new Date().toISOString()

    // Load submission for notification
    const { data: sub } = await admin.from('job_submissions')
      .select('*, jobs(public_title, title, companies!jobs_company_id_fkey(name))')
      .eq('id', subId).single()

    if (sub) {
      const job = sub.jobs as unknown as Record<string, unknown> | null
      const title = (job?.public_title ?? job?.title ?? 'internship') as string
      const intern = (caseRow.interns as unknown as unknown as Record<string, unknown>) ?? {}
      const internName = `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim()
      const decisionLabel = body.candidate_decision === 'interested' ? '🙋 Wants to join' : '❌ Not interested'

      await admin.from('admin_notifications').insert({
        type: 'candidate_decision',
        title: `Candidate ${decisionLabel} — ${internName}`,
        message: `${internName} responded "${decisionLabel}" for "${title}". ${body.candidate_decision === 'interested' ? 'Check if the employer is also interested — if so, confirm the RETAINED status.' : 'Mark this submission as not retained.'}`,
        case_id: caseRow.id,
        priority: body.candidate_decision === 'interested' ? 'high' : 'normal',
        read: false,
      }).then(() => null, () => null)

      await admin.from('activity_feed').insert({
        case_id: caseRow.id,
        type: 'candidate_decision',
        title: `Candidate: ${decisionLabel}`,
        description: `${internName} responded "${body.candidate_decision}" for "${title}"`,
        source: 'intern_portal',
        status: 'completed',
      }).then(() => null, () => null)
    }
  }

  await admin.from('job_submissions').update(updateData).eq('id', subId)
  return NextResponse.json({ ok: true })
}
