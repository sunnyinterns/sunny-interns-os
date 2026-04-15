import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  try {
    const { count } = await supabase
      .from('en_attente')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null)
    return NextResponse.json({ count: count ?? 0 })
  } catch {
    // Table might not exist yet
    return NextResponse.json({ count: 0 })
  }
}
