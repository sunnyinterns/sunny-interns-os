import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'
import { sendJobSubmittedEmployer } from '@/lib/email/resend'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, subId } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sub } = await admin
    .from('job_submissions')
    .select('*, jobs(id, title, public_title, companies(id, name, email))')
    .eq('id', subId)
    .single()

  const { data: caseRow } = await admin
    .from('cases')
    .select('*, interns(first_name, last_name, email, cv_url, local_cv_url, linkedin_url)')
    .eq('id', id)
    .single()

  if (!sub || !caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Gate: CV must be validated before sending to employer
  const cvStatus = (caseRow as Record<string, unknown>).cv_status as string | null
  if (cvStatus && cvStatus !== 'validated') {
    return NextResponse.json({
      error: 'CV must be validated before sending to employer',
      cv_status: cvStatus,
      hint: 'Validate the CV first in the case detail (CV tab)',
    }, { status: 422 })
  }

  const intern = (caseRow.interns ?? {}) as Record<string, unknown>
  const job = (sub.jobs ?? {}) as Record<string, unknown>
  const company = ((job.companies ?? {}) as Record<string, unknown>)
  const cvUrl = (intern.local_cv_url ?? intern.cv_url) as string | null
  const contactEmail = company.email as string | null

  let emailSent = false
  if (contactEmail) {
    try {
      await sendJobSubmittedEmployer({
        employerEmail: contactEmail,
        employerName: company.name as string | undefined,
        internFirstName: String(intern.first_name ?? ''),
        internLastName: String(intern.last_name ?? ''),
        jobTitle: String(job.public_title ?? job.title ?? ''),
        cvUrl: cvUrl ?? undefined,
        caseId: id,
      })
      emailSent = true
    } catch (e) {
      console.error('[send-to-employer] email error:', e)
    }
  }

  await admin
    .from('job_submissions')
    .update({ status: 'sent', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', subId)

  await logActivity({
    caseId: id,
    type: 'job_sent_employer',
    title: `Application sent to ${company.name ?? 'employer'}`,
    description: `Application for "${job.public_title ?? job.title}" sent by email`,
    metadata: { job_id: job.id, employer: company.name },
  })

  return NextResponse.json({ ok: true, emailSent })
}
