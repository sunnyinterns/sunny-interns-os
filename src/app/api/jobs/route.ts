import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const departmentId = searchParams.get('department_id')

  let query = supabase
    .from('jobs')
    .select(`
      id, title, public_title, department, status, wished_duration_months,
      wished_start_date, required_level, created_at, updated_at, job_department_id, is_active,
      remote_ok, remote_work, is_remote, location, description,
      companies(id, name, contact_name, contact_email, contact_whatsapp, whatsapp_number),
      contacts(id, first_name, last_name),
      job_submissions(id, status),
      job_departments(id, name, slug)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (departmentId) query = query.eq('job_department_id', departmentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (data ?? []).map(j => ({
    ...j,
    submissions_count: Array.isArray(j.job_submissions)
      ? j.job_submissions.filter((s: Record<string, unknown>) => !['rejected', 'cancelled'].includes(s.status as string)).length
      : 0,
    company_name: (j.companies as unknown as { name: string } | null)?.name ?? null,
    contact_name: j.contacts ? `${(j.contacts as unknown as { first_name: string; last_name: string | null }).first_name} ${(j.contacts as unknown as { first_name: string; last_name: string | null }).last_name ?? ''}`.trim() : null,
    department_name: (j.job_departments as unknown as { name: string } | null)?.name ?? j.department ?? null,
  }))

  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>

  // Auto-fill company_id from contact if not provided
  if (body.contact_id && !body.company_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('company_id')
      .eq('id', body.contact_id as string)
      .single()
    if (contact?.company_id) body.company_id = contact.company_id
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(body)
    .select('*, companies(id, name), contacts(id, first_name, last_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
