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
  const { data, error } = await supabase
    .from('contacts')
    .select('*, companies!company_id(id, name), jobs(id, title, status)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

const ALLOWED_PATCH_FIELDS = ['first_name','last_name','job_title','email','whatsapp','phone','nationality','is_primary','linkedin_url','gender','notes','left_company','left_company_at','company_id','temperature','last_contacted_at','linked_job_id']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as Record<string, unknown>
  const u: Record<string, unknown> = {}
  for (const k of ALLOWED_PATCH_FIELDS) if (k in body) u[k] = body[k]
  const { data, error } = await supabase
    .from('contacts')
    .update(u)
    .eq('id', id)
    .select('*, companies!company_id(id, name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
