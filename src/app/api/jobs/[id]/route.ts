import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const [{ data, error }, { data: submissions }] = await Promise.all([
      supabase
        .from('jobs')
        .select(`
          id, title, public_title, job_private_name, description, public_description,
          department, missions, status, location, remote_ok, remote_work,
          required_languages, required_level, wished_start_date, wished_end_date,
          wished_duration_months, is_recurring, parent_job_id, notes_internal, is_active,
          job_department_id, max_candidates, compensation_type, compensation_amount,
          skills_required, profile_sought, actual_end_date, company_type,
          tools_required, background_image_url,
          created_at, updated_at,
          companies(id, name, contact_name, contact_email, contact_whatsapp, whatsapp_number, industry, location),
          contacts(id, first_name, last_name, job_title, email, whatsapp),
          job_departments(id, name, slug, categories)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('job_submissions')
        .select('id, status, cv_sent, intern_interested, sort_order, cases!inner(id, interns!inner(first_name, last_name))')
        .eq('job_id', id)
        .order('created_at', { ascending: false }),
    ])
    if (error) {
      console.error('[jobs/[id]] GET error:', error)
      return NextResponse.json({ error: 'Job introuvable' }, { status: 404 })
    }
    return NextResponse.json({ ...data, job_submissions: submissions ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json() as Record<string, unknown>
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
