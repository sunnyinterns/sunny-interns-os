import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {}

export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    silent: true,
    org: 'sunny-interns',
    project: 'sunny-interns-os',
    sourcemaps: { disable: true },
    disableLogger: true,
  }
)
