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
      .select('*, contacts(id, first_name, last_name, job_title, email, whatsapp, phone, linkedin_url, gender), jobs(id, title, status)')
      .eq('id', id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[GET /api/companies/[id]]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
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
