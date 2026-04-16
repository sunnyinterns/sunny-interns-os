import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C6: alumni page loads', async ({ page }) => {
  await page.goto('/fr/alumni')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Alumni' })).toBeVisible({ timeout: 15000 })
})

test('C7: jobs page shows offers', async ({ page }) => {
  await page.goto('/fr/jobs')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /offre|stage|job/i })).toBeVisible({ timeout: 15000 })
})

test('C8: contacts page loads', async ({ page }) => {
  await page.goto('/fr/contacts')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible({ timeout: 15000 })
})
