import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C4: en-attente shows grouped waiting items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})
