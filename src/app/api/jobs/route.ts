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
      *,
      companies(id, name, contact_name, contact_email, contact_whatsapp, whatsapp_number, description, industry, location),
      contacts(id, first_name, last_name, job_title, email),
      job_submissions(id)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (departmentId) query = query.eq('department', departmentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (data ?? []).map(j => ({
    ...j,
    submissions_count: Array.isArray(j.job_submissions) ? j.job_submissions.length : 0,
    company_name: (j.companies as { name: string } | null)?.name ?? null,
    contact_name: j.contacts ? `${(j.contacts as { first_name: string; last_name: string | null }).first_name} ${(j.contacts as { first_name: string; last_name: string | null }).last_name ?? ''}`.trim() : null,
    department_name: j.department ?? null,
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
