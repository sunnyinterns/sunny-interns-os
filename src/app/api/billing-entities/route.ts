import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { data, error } = await supabase.from('billing_entities').select('*').order('is_default', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    // Fallback entities if table doesn't exist
    return NextResponse.json([
      { id: '1', name: 'Bali Interns C.G. Company', is_default: true, is_active: true },
      { id: '2', name: 'PT THE ABUNDANCE GUILD', is_default: false, is_active: false },
    ])
  }
}
