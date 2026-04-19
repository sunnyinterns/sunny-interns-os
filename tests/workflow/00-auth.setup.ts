import { test as setup } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_PATH = 'playwright/.auth/user.json'
const SECRET    = 'e2e-sunny-interns-2026'
const BASE      = process.env.TEST_BASE_URL ?? 'https://sunny-interns-os.vercel.app'

setup('authenticate', async ({ page, context }) => {
  // Garantir que le dossier existe
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true })

  // Naviguer vers l'endpoint auth (signe via API Supabase + set cookies SSR)
  const authUrl = `${BASE}/api/tests/auth-setup?secret=${SECRET}`
  console.log('Auth URL:', authUrl)

  const response = await page.goto(authUrl, { waitUntil: 'networkidle' })
  console.log('Auth response status:', response?.status())
  console.log('Final URL:', page.url())

  // Sauvegarder même si pas parfait (évite crash chromium)
  await context.storageState({ path: AUTH_PATH })
  console.log('Auth state saved to', AUTH_PATH)

  const url = page.url()
  if (url.includes('/login')) {
    throw new Error(`Auth échouée — redirigé vers login: ${url}`)
  }
  console.log('Auth OK')
})
