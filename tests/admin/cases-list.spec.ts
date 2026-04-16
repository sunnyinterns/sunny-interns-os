import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C2: cases page shows candidates', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // Sidebar shows candidate count, page shows list
  await expect(page.getByRole('heading', { name: /candidat/i })).toBeVisible({ timeout: 15000 })
})

test('C3: cases page shows status filters', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // Check for filter buttons
  const hasFilters = await page.getByText(/qualifié|rdv|convention|matché/i).first().isVisible().catch(() => false)
  const hasTous = await page.getByText('Tous').isVisible().catch(() => false)
  expect(hasFilters || hasTous).toBeTruthy()
})
