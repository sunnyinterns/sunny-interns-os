import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const { lead_id } = (await req.json().catch(() => ({}))) as { lead_id?: string }
    if (!lead_id || !UUID_RE.test(lead_id)) {
      return NextResponse.json({ error: 'Invalid lead_id' }, { status: 400 })
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    const { error } = await supabase
      .from('leads')
      .update({
        form_step: 99,
        applied_at: new Date().toISOString(),
        status: 'applied',
      })
      .eq('id', lead_id)
    if (error) {
      console.error('leads/complete update error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('leads/complete fatal:', e)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
