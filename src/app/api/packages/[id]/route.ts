import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json() as Record<string, unknown>
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => !['id', 'created_at', 'visa_types', 'visa_agents'].includes(k))
  )
  const { data, error } = await supabase
    .from('packages')
    .update(patch)
    .eq('id', id)
    .select('*, visa_types(id, code, name, validity_label, max_stay_days), visa_agents(id, name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data, error } = await supabase
    .from('packages')
    .select('*, visa_types(id, code, name), visa_agents(id, name)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
