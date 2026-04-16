import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C5: notifications page loads', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible({ timeout: 15000 })
})
