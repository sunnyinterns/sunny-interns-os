import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const W = 1200
const H = 630

// Safe base64 for large buffers (avoids call stack overflow)
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return btoa(binary)
}

async function fetchBgSafe(url: string): Promise<string | null> {
  try {
    // Use Supabase image transform for smaller size
    const smallUrl = url.includes('supabase.co/storage/v1/object/public/')
      ? url.replace('/object/public/', '/render/image/public/') + '?width=1200&quality=70&format=jpeg'
      : url

    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    const res = await fetch(smallUrl, { signal: ac.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:image/jpeg;base64,${toBase64(buf)}`
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

  // Satori requires explicit px dimensions — no percentage widths/heights
  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', background: '#1a1918', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

        {/* Background layer */}
        {bgDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgDataUri} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(135deg, #1a1918 0%, #2d2518 50%, #c8a96e 100%)' }} />
        )}

        {/* Gradient scrim */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(to top, rgba(26,25,24,0.96) 40%, rgba(26,25,24,0.45) 70%, rgba(0,0,0,0.15) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '50px 62px' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Logo pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌴</div>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>Bali Interns</span>
            </div>
            {/* Category */}
            <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 100, padding: '7px 16px' }}>
              <span style={{ color: '#fcd34d', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{category}</span>
            </div>
          </div>

          {/* Bottom: title + url */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ color: 'white', fontSize, fontWeight: 900, lineHeight: 1.1, maxWidth: 880 }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: 5, background: '#f59e0b' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>bali-interns.com/blog</span>
            </div>
          </div>

        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
