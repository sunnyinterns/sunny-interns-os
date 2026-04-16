import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C1: feed page loads without 500', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  await expect(page.getByText('500')).not.toBeVisible()
})
