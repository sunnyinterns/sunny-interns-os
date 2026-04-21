import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Marketing settings — stockées dans la table `brand_settings` (key/value)
 * avec un préfixe `marketing_` pour ne pas polluer les settings de marque.
 *   • marketing_instagram_connected / linkedin / tiktok / facebook → 'true'|'false'
 *   • marketing_webhook_url → string
 *   • marketing_primary_color → hex
 *   • marketing_watermark_logo_url → url
 */

const KEYS = [
  'instagram_connected', 'linkedin_connected', 'tiktok_connected', 'facebook_connected',
  'webhook_url', 'primary_color', 'watermark_logo_url',
] as const

type Key = typeof KEYS[number]

function toClient(rows: { key: string; value: string | null }[]): Record<string, string | boolean | null> {
  const out: Record<string, string | boolean | null> = {}
  rows.forEach(r => {
    if (!r.key.startsWith('marketing_')) return
    const short = r.key.replace(/^marketing_/, '')
    if (short.endsWith('_connected')) {
      out[short] = r.value === 'true'
    } else {
      out[short] = r.value
    }
  })
  return out
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('brand_settings')
    .select('key, value')
    .like('key', 'marketing_%')

  return NextResponse.json(toClient(data ?? []))
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  for (const [key, value] of Object.entries(body)) {
    if (!KEYS.includes(key as Key)) continue
    const dbKey = `marketing_${key}`
    const dbValue = value === null || value === undefined ? null
                  : typeof value === 'boolean' ? (value ? 'true' : 'false')
                  : String(value)
    const { error } = await supabase
      .from('brand_settings')
      .upsert({ key: dbKey, value: dbValue, updated_at: new Date().toISOString() })
    if (error) {
      console.error('[settings/marketing] upsert failed', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
