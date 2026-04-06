import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  status: z.string(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { error } = await supabase
    .from('cases')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await supabase.from('activity_feed').insert({
      case_id: id,
      action_type: 'status_changed',
      description: `Statut → ${parsed.data.status}`,
      created_by: user.id,
    })
  } catch {
    // activity_feed table may not exist yet — non-blocking
  }

  return NextResponse.json({ success: true })
}
