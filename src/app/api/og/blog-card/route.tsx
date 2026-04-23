import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = (searchParams.get('category') || 'Guide').replace(/-/g, ' ')

  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1918 0%, #2d2518 50%, #c8a96e 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '60px 70px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ background: '#f59e0b', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20 }}>🌴</span>
        </div>
        <span style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>Bali Interns</span>
        <span style={{ color: '#fcd34d', fontSize: 14, fontWeight: 700, marginLeft: 16, textTransform: 'uppercase', letterSpacing: 2 }}>{category}</span>
      </div>
      <div style={{ color: 'white', fontSize: title.length > 50 ? 42 : 54, fontWeight: 900, lineHeight: 1.1, maxWidth: 900 }}>
        {title}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginTop: 20 }}>bali-interns.com/blog</div>
    </div>,
    { width: 1200, height: 630 }
  )
}
