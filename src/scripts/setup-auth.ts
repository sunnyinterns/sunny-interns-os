/**
 * Configures Supabase Auth URL settings via the Management API.
 * Requires SUPABASE_ACCESS_TOKEN (personal access token from supabase.com/dashboard/account/tokens).
 * If token is not set, prints manual configuration instructions.
 */
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'djoqjgiyseobotsjqcgz'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

const SITE_URL = 'https://sunny-interns-os.vercel.app'
const REDIRECT_URLS = [
  'https://sunny-interns-os.vercel.app/auth/callback',
  'http://localhost:3000/auth/callback',
]

async function setupAuth() {
  if (!ACCESS_TOKEN) {
    console.log('⚠  SUPABASE_ACCESS_TOKEN not set.')
    console.log('   Get one at: https://supabase.com/dashboard/account/tokens')
    console.log('   Add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...')
    console.log('')
    console.log('Manual config — Supabase Dashboard > Authentication > URL Configuration:')
    console.log(`  Site URL:      ${SITE_URL}`)
    console.log(`  Redirect URLs: ${REDIRECT_URLS.join(', ')}`)
    process.exit(0)
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        site_url: SITE_URL,
        uri_allow_list: REDIRECT_URLS.join(','),
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    console.error(`Management API error (${response.status}):`, text)
    process.exit(1)
  }

  const data = await response.json()
  console.log('✓ Auth URLs configured')
  console.log('  site_url:', data.site_url ?? SITE_URL)
  console.log('  redirect_urls:', REDIRECT_URLS.join(', '))
  process.exit(0)
}

setupAuth()
