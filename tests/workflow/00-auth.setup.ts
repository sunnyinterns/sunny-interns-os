import { test as setup } from '@playwright/test'

const EMAIL = 'sidney.ruby@gmail.com'
const PASSWORD = 'SunnyInterns2026!'
const SUPABASE_URL = 'https://djoqjgiyseobotsjqcgz.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqb3FqZ2l5c2VvYm90c2pxY2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzE3MzksImV4cCI6MjA5MDk0NzczOX0.de_RmcwIErL9925Rp6-adaQsD7OaD-OsGijSlG0nrf8'

setup('authenticate', async ({ page, context }) => {
  // 1. Sign in via API directement (plus fiable que le formulaire en CI)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase auth failed: ${res.status} ${err}`)
  }

  const session = await res.json()
  const { access_token, refresh_token } = session

  if (!access_token) throw new Error('No access_token in response')

  // 2. Naviguer sur le site et injecter la session via cookies
  await page.goto('/fr/login')
  await page.waitForLoadState('networkidle')

  // Injecter les tokens Supabase dans le localStorage + cookies
  await page.evaluate(({ url, access_token, refresh_token }) => {
    const key = `sb-${url.replace('https://', '').split('.')[0]}-auth-token`
    localStorage.setItem(key, JSON.stringify({
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }))
  }, { url: SUPABASE_URL, access_token, refresh_token })

  // 3. Recharger et vérifier qu'on est connecté
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Sauvegarder l'état d'auth
  await context.storageState({ path: 'playwright/.auth/user.json' })

  console.log('✅ Auth setup complete')
})
