import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FALLBACK_URLS: Record<string, string> = {
  logo_principal: '/logo-dark.svg',
  logo_white: '/logo-white.svg',
  logo_favicon: '/favicon.svg',
  logo_email_signature: '/logo-dark.svg',
}

const DEFAULT_ASSETS = [
  { key: 'logo_principal', name: 'Logo principal', description: 'Logo couleur sur fond clair', url: FALLBACK_URLS.logo_principal, usage: ['invoice', 'portal_header', 'email_header'] },
  { key: 'logo_white', name: 'Logo blanc', description: 'Logo blanc sur fond sombre', url: FALLBACK_URLS.logo_white, usage: ['portal_employer', 'email_footer'] },
  { key: 'logo_favicon', name: 'Favicon', description: 'Icône 64x64px pour onglet navigateur', url: FALLBACK_URLS.logo_favicon, usage: ['browser_tab'] },
  { key: 'logo_email_signature', name: 'Signature email', description: 'Logo compact pour signature email', url: FALLBACK_URLS.logo_email_signature, usage: ['email_signature'] },
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
    // Apply fallback URLs for assets with null url
    const withFallbacks = data.map((asset: Record<string, unknown>) => ({
      ...asset,
      url: asset.url ?? FALLBACK_URLS[asset.key as string] ?? null,
    }))
    return NextResponse.json(withFallbacks)
  } catch {
    return NextResponse.json(DEFAULT_ASSETS)
  }
}
