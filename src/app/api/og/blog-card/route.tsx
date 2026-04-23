import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Node runtime — edge runtime has issues with next/og in Next.js 16 + Turbopack
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const W = 1200
const H = 630

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk))
  }
  return btoa(binary)
}

async function fetchBg(url: string): Promise<string | null> {
  try {
    const smallUrl = url.includes('supabase.co/storage/v1/object/public/')
      ? url.replace('/object/public/', '/render/image/public/') + '?width=1200&quality=65&format=jpeg'
      : url
    const res = await fetch(smallUrl, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:image/jpeg;base64,${toBase64(buf)}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = (searchParams.get('category') || 'Guide').replace(/-/g, ' ')
  const bg = searchParams.get('bg') || ''

  const bgDataUri = bg ? await fetchBg(bg) : null
  const fontSize = title.length > 55 ? 38 : title.length > 40 ? 46 : 54

  const bgStyle = bgDataUri
    ? { backgroundImage: `url(${bgDataUri})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #1a1918 0%, #2d2518 50%, #c8a96e 100%)' }

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px', ...bgStyle }}>
        {/* Dark scrim */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, background: 'linear-gradient(to top, rgba(26,25,24,0.95) 38%, rgba(26,25,24,0.4) 68%, transparent 100%)' }} />

        {/* Top: logo + category */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌴</div>
            <span style={{ color: 'white', fontSize: 17, fontWeight: 800 }}>Bali Interns</span>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 100, padding: '8px 18px' }}>
            <span style={{ color: '#fcd34d', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{category}</span>
          </div>
        </div>

        {/* Bottom: title + url */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'white', fontSize, fontWeight: 900, lineHeight: 1.1, maxWidth: 880 }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 6, background: '#f59e0b' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>bali-interns.com/blog</span>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
