import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json() as { email: string; role: string }
    console.log('[INVITE]', body.email, body.role)
    return NextResponse.json({ success: true, message: 'Invitation envoyée (simulation)' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
