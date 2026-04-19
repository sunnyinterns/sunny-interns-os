import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const step_id = req.nextUrl.searchParams.get('step_id')
  const run_id  = req.nextUrl.searchParams.get('run_id')
  const q = supabase.from('test_comments').select('*').order('created_at', { ascending: true })
  if (step_id) q.eq('step_id', step_id)
  else if (run_id) q.eq('run_id', run_id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { step_id, run_id, test_id, comment, severity = 'bug' } = body
  if (!comment?.trim()) return NextResponse.json({ error: 'Comment required' }, { status: 400 })
  const { data, error } = await supabase.from('test_comments').insert({
    step_id, run_id, test_id,
    comment: comment.trim(),
    severity,
    created_by: user.email ?? 'Sidney',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
