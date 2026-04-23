import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Pre-fetch external image as base64 data URI for use in Edge Runtime
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    const b64 = Buffer.from(buf).toString('base64')
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

  // Pre-fetch background image if provided
  let bgDataUri: string | null = null
  if (bg) {
    bgDataUri = await fetchImageAsDataUri(bg)
  }

  return new ImageResponse(
    (
      <div style={{
        height: '100%', width: '100%', display: 'flex', position: 'relative',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden', background: '#1a1918',
      }}>
        {/* Background */}
        {bgDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgDataUri} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1918 0%, #2a2518 40%, #c8a96e 100%)' }} />
        )}

        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: bgDataUri
          ? 'linear-gradient(to top, rgba(26,25,24,0.95) 38%, rgba(26,25,24,0.5) 65%, rgba(26,25,24,0.25) 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 100%)'
        }} />

        {/* Content */}
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px' }}>
          {/* Top: logo + category */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.12)', borderRadius: '100px', padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌴</div>
              <span style={{ color: 'white', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px' }}>Bali Interns</span>
            </div>
            <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: '100px', padding: '8px 18px' }}>
              <span style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>{category}</span>
            </div>
          </div>

          {/* Bottom: title + url */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'white', fontSize: title.length > 55 ? '40px' : title.length > 40 ? '48px' : '56px', fontWeight: 900, lineHeight: 1.1, maxWidth: '880px', marginBottom: '20px' }}>
              {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: 500 }}>bali-interns.com/blog</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
