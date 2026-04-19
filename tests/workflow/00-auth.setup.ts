import { test as setup, expect } from '@playwright/test'

const SECRET = 'e2e-sunny-interns-2026'

setup('authenticate', async ({ page, context }) => {
  await page.goto(`/api/tests/auth-setup?secret=${SECRET}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  const url = page.url()
  console.log('Post-auth URL:', url)

  if (url.includes('/login')) {
    await page.screenshot({ path: 'auth-failure.png' })
    throw new Error(`Auth failed Ñ still on login: ${url}`)
  }

  await expect(page).not.toHaveURL(/login/)
  await context.storageState({ path: 'playwright/.auth/user.json' })
  console.log('Auth saved OK')
})
