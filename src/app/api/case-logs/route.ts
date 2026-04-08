import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('case_logs')
    .select(`
      id, author_name, action, field_label, old_value, new_value, description, created_at,
      cases(id, interns(first_name, last_name))
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { case_id, action, field_name, field_label, old_value, new_value, description, metadata } = body

  if (!case_id || !action) {
    return NextResponse.json({ error: 'case_id and action required' }, { status: 400 })
  }

  // Get author name
  const { data: appUser } = await supabase
    .from('app_users')
    .select('full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const authorName = appUser?.full_name ?? user.email ?? 'Équipe'

  const { data, error } = await supabase.from('case_logs').insert({
    case_id,
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
