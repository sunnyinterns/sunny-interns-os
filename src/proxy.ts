import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip ALL API routes, static files and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/book') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth') ||
    pathname === '/favicon.ico'
  ) {
    return
  }

  // App routes that need auth
  const isAppRoute = /^\/(fr|en)\/(feed|pipeline|cases|jobs|settings|companies|contacts|leads|schools|agenda)/.test(pathname)

  if (isAppRoute) {
    return updateSession(request)
  }

  return intlMiddleware(request)
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
