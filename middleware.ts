import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

// next-intl v4 — export default (not named export)
export default createMiddleware(routing)

export const config = {
  // ONLY match explicitly localized routes — /fr/... and /en/...
  // /jobs/, /apply, /portal, /api etc. are NOT in this matcher
  // and therefore bypass next-intl entirely → served by app/jobs/[slug]/page.tsx directly
  matcher: ['/(fr|en)/:path*'],
}
