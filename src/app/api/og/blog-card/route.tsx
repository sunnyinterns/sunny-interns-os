import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
export const runtime = 'edge'
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') || 'Bali Interns Blog'
  const category = searchParams.get('category') || 'guide'
  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 70px', background: 'linear-gradient(135deg, #F5A623 0%, #E8930A 40%, #1A1918 100%)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🌴</div>
          <span style={{ color: 'white', fontSize: '22px', fontWeight: 800 }}>Bali Interns</span>
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>{category}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'white', fontSize: '56px', fontWeight: 900, lineHeight: 1.1, maxWidth: '900px' }}>{title}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', fontWeight: 500, marginTop: '20px' }}>bali-interns.com/blog</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
