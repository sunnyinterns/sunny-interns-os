import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json() as { status: string }

    const { data: sub, error: fetchError } = await supabase
      .from('job_submissions')
      .select('case_id, job_id')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('job_submissions')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    if (body.status === 'retained') {
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

      // Email log
      console.log('[EMAIL] is the intern your next intern?', { submissionId: id, jobId: sub.job_id })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
