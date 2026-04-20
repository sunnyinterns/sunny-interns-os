import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
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
  const supabase = getServiceClient()

  // Get case by portal token
  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('portal_token', token)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

  const { data, error } = await supabase
    .from('job_submissions')
    .select(`
      id,
      job_id,
      intern_interested,
      intern_priority,
      status,
      jobs (
        id,
        title,
        public_title,
        public_description,
        public_hook,
        public_vibe,
        public_perks,
        seo_slug,
        department,
        job_departments (name),
        companies (name)
      )
    `)
    .eq('case_id', caseData.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((sub) => {
    const job = (Array.isArray(sub.jobs) ? sub.jobs[0] : sub.jobs) as unknown as {
      id: string
      title?: string | null
      public_title?: string | null
      public_description?: string | null
      department?: string | null
      job_departments?: { name: string } | null
      companies?: { name: string } | null
    } | null

    return {
      submission_id: sub.id,
      job_id: sub.job_id,
      title: job?.public_title ?? job?.title ?? 'Offre sans titre',
      sector: (job?.job_departments as { name: string } | null)?.name ?? job?.department ?? null,
      public_description: job?.public_description ?? null,
      intern_interested: sub.intern_interested,
      intern_priority: (sub as unknown as { intern_priority?: number | null }).intern_priority ?? null,
      company_name: (job?.companies as { name?: string } | null)?.name ?? null,
      status: sub.status,
    }
  })

  return NextResponse.json(result)
}
