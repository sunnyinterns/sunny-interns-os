import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = getAdmin()

  // Verify token + get company_id
  const { data: access } = await admin
    .from('employer_portal_access')
    .select('company_id')
    .eq('token', token)
    .single()

  if (!access?.company_id) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  // Get all job_submissions for this company's jobs
  const { data: submissions } = await admin
    .from('job_submissions')
    .select(`
      id, status, submitted_at,
      employer_decision, employer_decision_at,
      candidate_decision, candidate_decision_at,
      notes_charly,
      jobs!job_submissions_job_id_fkey(
        id, public_title, title, department,
        contacts!jobs_contact_id_fkey(first_name)
      ),
      cases!job_submissions_case_id_fkey(
        id, portal_token, cv_status,
        interns(
          first_name, last_name, email, whatsapp,
          nationality, date_of_birth, spoken_languages,
          desired_duration_months, desired_start_date,
          cv_url, local_cv_url, linkedin_url, stage_ideal
        )
      )
    `)
    .eq('jobs.companies.id', access.company_id)
    .not('status', 'eq', 'cancelled')
    .order('submitted_at', { ascending: false })

  // Filter + shape response — never expose company_name to employer (they know it's themselves)
  const shaped = (submissions ?? []).map(s => {
    const job = s.jobs as Record<string, unknown> | null
    const caseData = s.cases as Record<string, unknown> | null
    const internsRaw2 = caseData?.interns
    const intern = ((Array.isArray(internsRaw2) ? internsRaw2[0] : internsRaw2) as Record<string, unknown>) ?? {}
    const dob = intern.date_of_birth as string | null
    const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null

    return {
      submission_id: s.id,
      job_id: (job?.id ?? '') as string,
      job_title: (job?.public_title ?? job?.title ?? 'Internship') as string,
      department: (job?.department ?? null) as string | null,
      status: s.status,
      submitted_at: s.submitted_at,
      employer_decision: s.employer_decision,
      employer_decision_at: s.employer_decision_at,
      candidate_decision: s.candidate_decision,
      notes_for_employer: s.notes_charly ?? null, // Charly's note shown to employer
      // Intern info
      first_name: (intern.first_name ?? '') as string,
      last_name: (intern.last_name ?? '') as string,
      email: (intern.email ?? null) as string | null,
      whatsapp: (intern.whatsapp ?? null) as string | null,
      nationality: (intern.nationality ?? null) as string | null,
      age,
      spoken_languages: (intern.spoken_languages ?? []) as string[],
      desired_duration_months: (intern.desired_duration_months ?? null) as number | null,
      desired_start_date: (intern.desired_start_date ?? null) as string | null,
      cv_url: (intern.local_cv_url ?? intern.cv_url ?? null) as string | null,
      linkedin_url: (intern.linkedin_url ?? null) as string | null,
      motivation: (intern.stage_ideal ?? null) as string | null,
    }
  })

  return NextResponse.json(shaped)
}
