import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = (searchParams.get('category') || 'Guide').replace(/-/g, ' ')
  const fs = title.length > 55 ? 38 : title.length > 40 ? 46 : 54

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1918 0%, #2d2518 50%, #c8a96e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 64px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌴</div>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>Bali Interns</span>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 100, padding: '7px 16px' }}>
            <span style={{ color: '#fcd34d', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{category}</span>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
