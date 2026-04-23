import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Fetch with hard timeout — Edge Runtime has limited time budget
async function fetchBgSafe(url: string): Promise<string | null> {
  try {
    // Use Supabase image transform to get a small version if possible
    const smallUrl = url.includes('supabase.co/storage')
      ? url.replace('/object/public/', '/render/image/public/') + '?width=1200&quality=60'
      : url

    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 4000) // 4s max
    const res = await fetch(smallUrl, { signal: ac.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!res.ok) throw new Error('fetch failed')
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = (searchParams.get('category') || 'Guide').replace(/-/g, ' ')
  const bg = searchParams.get('bg') || ''

  const bgDataUri = bg ? await fetchBgSafe(bg) : null

  const fontSize = title.length > 55 ? 38 : title.length > 40 ? 46 : 54

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', position: 'relative', background: '#1a1918', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
        {bgDataUri
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={bgDataUri} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1918 0%, #2a2518 50%, #c8a96e 100%)' }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,25,24,0.95) 40%, rgba(26,25,24,0.4) 75%, rgba(0,0,0,0.1) 100%)' }} />
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '50px 62px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.12)', borderRadius: '100px', padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🌴</div>
              <span style={{ color: 'white', fontSize: '16px', fontWeight: 800 }}>Bali Interns</span>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '100px', padding: '7px 16px' }}>
              <span style={{ color: '#fcd34d', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>{category}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'white', fontSize: `${fontSize}px`, fontWeight: 900, lineHeight: 1.1, maxWidth: '880px' }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>bali-interns.com/blog</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
