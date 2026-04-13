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
      .from('activity_feed')
      .select('id, type, title, description, metadata, created_at, source')
      .eq('case_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
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
  const body = await request.json() as { type?: string; action_type?: string; description: string; title?: string; author_name?: string }

  const actType = body.type ?? body.action_type ?? 'note_added'
  const authorName = body.author_name ?? user.email?.split('@')[0] ?? 'Utilisateur'
  const title = body.title ?? (actType === 'note_added' || actType === 'note' ? `Note de ${authorName}` : null)

  const { data, error } = await supabase
    .from('activity_feed')
    .insert({
      case_id: id,
      type: actType,
      title,
      description: body.description,
      source: 'user',
      status: 'done',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
