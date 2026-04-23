import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOGO_URL = 'https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png'

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.slice(i, i + 8192))
  }
  return btoa(bin)
}

async function safeFetch(url: string, ms = 6000): Promise<string | null> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), ms)
    const r = await fetch(url, { signal: ac.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    const ct = r.headers.get('content-type') ?? 'image/png'
    return `data:${ct};base64,${toB64(buf)}`
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const title = sp.get('title') || 'Bali Interns Blog'
  const category = (sp.get('category') || 'Guide').replace(/-/g, ' ')
  const bg = sp.get('bg') || ''

  const [logoData, bgData] = await Promise.all([
    safeFetch(LOGO_URL, 4000),
    bg ? safeFetch(bg.includes('supabase.co/storage/v1/object/public/')
      ? bg.replace('/object/public/', '/render/image/public/') + '?width=1200&quality=60&format=jpeg'
      : bg, 5000) : Promise.resolve(null),
  ])

  const fs = title.length > 55 ? 38 : title.length > 40 ? 46 : 54

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '50px 62px', fontFamily: 'system-ui, sans-serif', background: bgData ? 'transparent' : 'linear-gradient(135deg,#1a1918 0%,#2d2518 50%,#c8a96e 100%)' }}>
        
        {/* Background image layer */}
        {bgData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgData} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} />
        )}
        {/* Scrim */}
        {bgData && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, background: 'linear-gradient(to top,rgba(26,25,24,.95) 38%,rgba(26,25,24,.4) 68%,rgba(0,0,0,.1) 100%)' }} />
        )}

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
            {logoData
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoData} height={22} style={{ objectFit: 'contain' }} />
              : <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>Bali Interns</span>
            }
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 100, padding: '7px 16px' }}>
            <span style={{ color: '#fcd34d', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{category}</span>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <div style={{ color: 'white', fontSize: fs, fontWeight: 900, lineHeight: 1.1, maxWidth: 880 }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: 5, background: '#f59e0b' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>bali-interns.com/blog</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
