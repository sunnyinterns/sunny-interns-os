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
      .from('cv_feedback_history')
      .select('id, feedback, created_at, created_by')
      .eq('case_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
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
    const body = await request.json() as { feedback: string }
    if (!body.feedback?.trim()) return NextResponse.json({ error: 'feedback requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('cv_feedback_history')
      .insert({ case_id: id, feedback: body.feedback.trim(), created_by: user.email ?? 'manager' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
