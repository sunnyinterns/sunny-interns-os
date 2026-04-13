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
        *,
        jobs(id, title, public_title, wished_duration_months, wished_start_date, department, description, missions,
          companies(id, name, contact_name, contact_email, contact_whatsapp, whatsapp_number, contact_first_name, contact_last_name),
          contacts(id, first_name, last_name, email, whatsapp)
        )
      `)
      .eq('case_id', id)
      .order('sort_order', { ascending: true })
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
        status: 'pending',
      sort_order: 0,
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
