import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendJobSubmittedEmployer } from '@/lib/email/resend'

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

    await supabase.from('activity_feed').insert({
      case_id: body.case_id,
      action_type: 'job_submitted',
      description: `Job soumis: ${body.job_id}`,
      created_by: user.id,
    })

    // Email employeur
    void (async () => {
      try {
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('title, companies(name, email)')
          .eq('id', body.job_id)
          .single()
        const { data: caseRow } = await supabase
          .from('cases')
          .select('id, interns(first_name, last_name, cv_url)')
          .eq('id', body.case_id)
          .single()

        if (jobRow && caseRow) {
          const company = (jobRow as Record<string, unknown>).companies as Record<string, unknown> | null
          const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; cv_url?: string } | null
          if (company?.email) {
            await sendJobSubmittedEmployer({
              employerEmail: company.email as string,
              employerName: company.name as string | undefined,
              internFirstName: intern?.first_name ?? '',
              internLastName: intern?.last_name ?? '',
              jobTitle: (jobRow as Record<string, unknown>).title as string ?? 'Stage',
              cvUrl: intern?.cv_url ?? null,
              caseId: body.case_id,
            })
          }
        }
      } catch { /* non-blocking */ }
    })()

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
