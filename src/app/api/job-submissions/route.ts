import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as { case_id: string; job_id: string }

    const { data, error } = await supabase
      .from('job_submissions')
      .insert({ case_id: body.case_id, job_id: body.job_id, status: 'submitted', submitted_by: user.id })
      .select()
      .single()
    if (error) throw error

    // Log activity
    await supabase.from('activity_feed').insert({
      case_id: body.case_id,
      action_type: 'job_submitted',
      description: `Job soumis: ${body.job_id}`,
      created_by: user.id,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
