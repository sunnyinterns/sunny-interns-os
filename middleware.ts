import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

// next-intl middleware — only runs on routes that need locale handling
// /jobs/, /apply, /portal, /api, /verify are excluded from locale processing
export default createMiddleware(routing)

export const config = {
  matcher: [
    // Match localized paths explicitly
    '/(fr|en)/:path*',
    // Match everything EXCEPT public standalone routes and Next.js internals
    '/((?!jobs|apply|portal|api|verify|_next|_vercel|favicon|.*\\..*).*)',
  ],
}
