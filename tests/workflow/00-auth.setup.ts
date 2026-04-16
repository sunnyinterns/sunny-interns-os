import { test as setup } from '@playwright/test'
setup('authenticate', async ({ page }) => {
  await page.goto('/fr')
  await page.waitForTimeout(1000)
  const url = page.url()
  if (url.includes('login') || url.includes('auth')) {
    await page.fill('input[type=email]', 'sidney.ruby@gmail.com')
    await page.fill('input[type=password]', 'SunnyInterns2026!')
    await page.click('button[type=submit]')
    await page.waitForURL('**/fr/**', { timeout: 15000 })
  }
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})
