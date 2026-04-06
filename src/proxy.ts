import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static files et API — laisse passer
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  // Applique i18n (redirection / → /fr, etc.)
  const response = intlMiddleware(request)

  // Vérifie auth pour les routes app
  const isAppRoute = /\/(fr|en)\/(feed|pipeline|cases|jobs|companies|settings)/.test(pathname)

  if (isAppRoute) {
    const hasSession =
      request.cookies.get('sb-djoqjgiyseobotsjqcgz-auth-token.0') ||
      request.cookies.get('sb-djoqjgiyseobotsjqcgz-auth-token') ||
      request.cookies.get('sb-access-token')

    if (!hasSession) {
      const locale = pathname.startsWith('/en') ? 'en' : 'fr'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return response ?? NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
