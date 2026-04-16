import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C4: en-attente shows intern and school groups', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasIntern = await page.getByText(/intern/i).isVisible().catch(() => false)
  const hasSchool = await page.getByText(/school/i).isVisible().catch(() => false)
  expect(hasIntern).toBeTruthy()
  expect(hasSchool).toBeTruthy()
})
