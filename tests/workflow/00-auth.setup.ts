import { test as setup, expect } from '@playwright/test'
setup('authenticate', async ({ page }) => {
  await page.goto('/fr/login')
  await page.waitForLoadState('networkidle')

  // Fill login form
  await page.locator('#email').fill('sidney.ruby@gmail.com')
  await page.locator('#password').fill('SunnyInterns2026!')
  await page.getByRole('button', { name: /se connecter/i }).click()

  // Wait for redirect to authenticated page
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Verify we're authenticated
  await expect(page).not.toHaveURL(/login/)

  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
