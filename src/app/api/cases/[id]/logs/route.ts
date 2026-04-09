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
    .from('case_logs')
    .select('id, author_name, action, field_label, old_value, new_value, description, created_at, metadata')
    .eq('case_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, field_name, field_label, old_value, new_value, description, metadata } = body

  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 })
  }

  // Get author name
  const { data: appUser } = await supabase
    .from('app_users')
    .select('full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const authorName = appUser?.full_name ?? user.email ?? 'Équipe'

  const { data, error } = await supabase.from('case_logs').insert({
    case_id: id,
    author_name: authorName,
    author_email: user.email,
    action,
    field_name: field_name ?? null,
    field_label: field_label ?? null,
    old_value: old_value ?? null,
    new_value: new_value ?? null,
    description: description ?? null,
    metadata: metadata ?? {},
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
