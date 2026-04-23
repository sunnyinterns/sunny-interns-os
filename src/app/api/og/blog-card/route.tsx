import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = searchParams.get('category') || 'Guide'
  const bg = searchParams.get('bg') || '' // optional background image URL

  return new ImageResponse(
    (
      <div style={{
        height: '100%', width: '100%', display: 'flex', position: 'relative',
        fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
      }}>
        {/* Background: either custom image or gradient */}
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1918 0%, #2d2d2b 100%)' }} />
        )}

        {/* Dark overlay for readability */}
        <div style={{ position: 'absolute', inset: 0, background: bg ? 'linear-gradient(to top, rgba(26,25,24,0.95) 40%, rgba(26,25,24,0.3) 100%)' : 'transparent' }} />

        {/* Content */}
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Logo pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '100px', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌴</div>
              <span style={{ color: 'white', fontSize: '17px', fontWeight: 800 }}>Bali Interns</span>
            </div>
            {/* Category badge */}
            <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '100px', padding: '8px 16px' }}>
              <span style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>{category}</span>
            </div>
          </div>

          {/* Bottom: title + url */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'white', fontSize: title.length > 60 ? '42px' : '52px', fontWeight: 900, lineHeight: 1.1, maxWidth: '880px' }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', fontWeight: 500 }}>bali-interns.com/blog</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
