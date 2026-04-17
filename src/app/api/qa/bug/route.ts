import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    step_id: string
    step_title: string
    notes: string
    expected: string[]
    db_state?: Record<string, unknown>
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('qa_bugs').insert({
    step_id: body.step_id,
    step_title: body.step_title,
    notes: body.notes,
    expected: body.expected,
    db_state: body.db_state ?? null,
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, status: 'open' })
}
