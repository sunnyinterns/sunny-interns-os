import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

// Routes that must NOT get a locale prefix
const BYPASS = [
  /^\/jobs\//,
  /^\/apply/,
  /^\/portal\//,
  /^\/api\//,
  /^\/verify\//,
  /^\/_next\//,
  /^\/favicon/,
  /^\/__/,
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (BYPASS.some(re => re.test(pathname))) {
    return NextResponse.next()
  }
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
