import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('cases')
      .update({
        visa_submitted_to_agent_at: now,
        status: 'visa_submitted',
        updated_at: now,
      })
      .eq('id', id)

    if (error) throw error

    try {
      await supabase.from('activity_feed').insert({
        case_id: id,
        type: 'visa_sent_to_agent',
        title: 'Visa envoyé à Agent Visa',
        description: "Dossier visa envoyé à l'agent visa",
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, sent_at: now })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
