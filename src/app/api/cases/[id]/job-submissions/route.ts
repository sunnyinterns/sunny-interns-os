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
      .from('job_submissions')
      .select(`
        id, status, intern_interested, intern_priority, cv_revision_requested, cv_revision_done, employer_response, notes_charly, created_at, submitted_at,
        jobs(id, title, public_title, wished_duration_months, wished_start_date, department, description,
          companies(id, name, contact_name, contact_whatsapp, contact_email),
          contacts(id, first_name, last_name, email, whatsapp)
        )
      `)
      .eq('case_id', id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json() as { job_id: string }
    if (!body.job_id) return NextResponse.json({ error: 'job_id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('job_submissions')
      .insert({
        case_id: id,
        job_id: body.job_id,
        status: 'proposed',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
