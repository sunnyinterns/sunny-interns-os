import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('contact_templates')
      .select('*')
      .order('created_at')
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
