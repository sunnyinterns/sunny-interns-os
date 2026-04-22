import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

// Paths that must NOT be prefixed with a locale
const PUBLIC_PATHS = [
  /^\/jobs\//,           // public job pages — standalone, no locale prefix
  /^\/apply/,            // apply form
  /^\/portal\//,         // candidate/employer/agent portals
  /^\/api\//,            // API routes
  /^\/verify\//,         // employer verify
  /^\/_next\//,          // Next.js internals
  /^\/favicon/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip intl and auth for public paths
  if (PUBLIC_PATHS.some(re => re.test(pathname))) {
    return NextResponse.next()
  }

  // Apply Supabase session refresh for authenticated routes
  const supabaseResponse = await updateSession(request)
  if (supabaseResponse) return supabaseResponse

  // Apply i18n routing for everything else
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
