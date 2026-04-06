import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FALLBACK_PROVIDERS = [
  { id: '1', name: 'Artur', phone: '+6281234567890', is_default: true, notes: 'Chauffeur principal — fiable, anglophone' },
  { id: '2', name: 'Wayan', phone: '+6281234567891', is_default: false, notes: 'Backup Artur, disponible 24h/24' },
  { id: '3', name: 'Made', phone: '+6281234567892', is_default: false, notes: 'Spécialiste transferts aéroport' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase.from('transport_providers').select('*').order('is_default', { ascending: false })
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json(FALLBACK_PROVIDERS)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(FALLBACK_PROVIDERS)
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as { id: string; is_default: boolean }
    // Reset all to false, then set the selected one
    await supabase.from('transport_providers').update({ is_default: false }).neq('id', '')
    const { data, error } = await supabase
      .from('transport_providers')
      .update({ is_default: true })
      .eq('id', body.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
