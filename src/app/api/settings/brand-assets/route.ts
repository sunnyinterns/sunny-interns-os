import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_ASSETS = [
  { key: 'logo_principal', name: 'Logo principal', description: 'Logo couleur sur fond clair', url: null, usage: ['invoice', 'portal_header', 'email_header'] },
  { key: 'logo_white', name: 'Logo blanc', description: 'Logo blanc sur fond sombre', url: null, usage: ['portal_employer', 'email_footer'] },
  { key: 'logo_favicon', name: 'Favicon', description: 'Icône 64x64px pour onglet navigateur', url: null, usage: ['browser_tab'] },
  { key: 'logo_email_signature', name: 'Signature email', description: 'Logo compact pour signature email', url: null, usage: ['email_signature'] },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('brand_assets')
      .select('*')
      .order('created_at')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json(DEFAULT_ASSETS)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(DEFAULT_ASSETS)
  }
}
