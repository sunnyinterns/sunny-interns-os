import { NextRequest, NextResponse } from 'next/server'

// next/og (Satori) is broken in this Next.js 16 + Turbopack + Sentry environment.
// Best approach: redirect to the cover image directly.
// Social platforms show the cover photo + title from OG meta tags = perfect card.
export const dynamic = 'force-dynamic'

const DEFAULT_OG = 'https://bali-interns.com/og-default.jpg'

export async function GET(req: NextRequest) {
  const bg = req.nextUrl.searchParams.get('bg')
  const target = bg || DEFAULT_OG
  return NextResponse.redirect(target, { status: 302 })
}
