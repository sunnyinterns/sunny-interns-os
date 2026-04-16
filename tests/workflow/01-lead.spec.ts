import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A1: cases page shows Emma Martin', async ({ page }) => {
  await page.goto('/fr/cases')
  await expect(page.getByText('Emma Martin')).toBeVisible({ timeout: 15000 })
})

test('A2: Emma Martin case loads without 500', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Emma Martin').first().click()
  await page.waitForTimeout(3000)
  await expect(page.getByText('500')).not.toBeVisible()
  await expect(page.getByText('Error')).not.toBeVisible()
})

test('A3: notifications show Emma Martin', async ({ page }) => {
  await page.goto('/fr/notifications')
  await expect(page.getByText('Emma Martin')).toBeVisible({ timeout: 15000 })
})
