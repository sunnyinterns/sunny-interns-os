import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'djoqjgiyseobotsjqcgz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/en/apply', destination: '/apply', permanent: true },
      { source: '/en/apply/:path*', destination: '/apply/:path*', permanent: true },
    ]
  },
}

export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    silent: true,
    org: 'sunny-interns',
    project: 'sunny-interns-os',
    sourcemaps: { disable: true },
    disableLogger: true,
    excludeServerRoutes: ['/api/og'],
    tunnelRoute: undefined,
  }
)
