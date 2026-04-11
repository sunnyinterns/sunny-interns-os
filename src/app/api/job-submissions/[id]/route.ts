import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Portal (intern) access: allow via x-portal-token header (no auth required)
  const portalToken = request.headers.get('x-portal-token')
  let supabase
  let isPortal = false

  if (portalToken) {
    supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    isPortal = true
  } else {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      status?: string
      intern_interested?: boolean
      intern_priority?: number
      cv_revision_requested?: boolean
      cv_revision_done?: boolean
      employer_response?: string
      notes_charly?: string
    }

    const { data: sub, error: fetchError } = await supabase
      .from('job_submissions')
      .select('case_id, job_id')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    // Build update payload
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.intern_interested !== undefined) {
      updatePayload.intern_interested = body.intern_interested
      updatePayload.intern_responded_at = new Date().toISOString()
    }

    if (body.status && !isPortal) {
      updatePayload.status = body.status
    }

    if (!isPortal) {
      if (body.intern_priority !== undefined) updatePayload.intern_priority = body.intern_priority
      if (body.cv_revision_requested !== undefined) updatePayload.cv_revision_requested = body.cv_revision_requested
      if (body.cv_revision_done !== undefined) updatePayload.cv_revision_done = body.cv_revision_done
      if (body.employer_response !== undefined) updatePayload.employer_response = body.employer_response
      if (body.notes_charly !== undefined) updatePayload.notes_charly = body.notes_charly
    }

    const { error } = await supabase
      .from('job_submissions')
      .update(updatePayload)
      .eq('id', id)
    if (error) throw error

    if (body.status === 'retained' && !isPortal) {
      // Cancel all other submissions for this case
      await supabase
        .from('job_submissions')
        .update({ status: 'rejected' })
        .eq('case_id', sub.case_id)
        .neq('id', id)

      // Advance case status
      await supabase
        .from('cases')
        .update({ status: 'job_retained', updated_at: new Date().toISOString() })
        .eq('id', sub.case_id)

      // Fetch job details for activity log
      const { data: jobDetails } = await supabase
        .from('jobs')
        .select('title, companies(name)')
        .eq('id', sub.job_id)
        .single()
      const jTitle = (jobDetails as Record<string, unknown>)?.title as string ?? 'Offre'
      const cName = ((jobDetails as Record<string, unknown>)?.companies as Record<string, unknown>)?.name as string ?? ''

      await logActivity({
        caseId: sub.case_id,
        type: 'job_retained',
        title: `Job retenu : ${jTitle}`,
        description: `Le poste "${jTitle}" chez ${cName} a été retenu`,
        priority: 'high',
        metadata: { job_id: sub.job_id, job_title: jTitle, company_name: cName },
      })

      console.log('[EMAIL] is the intern your next intern?', { submissionId: id, jobId: sub.job_id })
    }

    // If intern expressed interest, notify admin
    if (body.intern_interested === true) {
      console.log('[NOTIF] Intern interested in job submission', { submissionId: id, caseId: sub.case_id, jobId: sub.job_id })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
