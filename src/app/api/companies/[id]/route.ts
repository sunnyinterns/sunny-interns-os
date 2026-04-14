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
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id, name, description, industry, company_type, website, location, internship_city,
        logo_url, notes_internal, company_size, type, category, phone,
        contact_name, contact_email, contact_whatsapp, whatsapp_number,
        contacts(id, first_name, last_name, job_title, email, whatsapp),
        jobs(id, title, status),
        cases(id, status, interns(first_name, last_name))
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
      .from('companies')
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
    // Protection: check for active jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', id)
      .eq('status', 'open')
      .limit(1)
    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json({ error: 'HAS_ACTIVE_JOBS' }, { status: 409 })
    }
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
