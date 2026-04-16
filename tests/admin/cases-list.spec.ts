import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C2: cases page shows at least 10 candidates', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForTimeout(5000)
  const names = await page.locator('a[href*="/fr/cases/"], [data-testid="case-item"], .case-card, .case-row').count()
  expect(names).toBeGreaterThanOrEqual(10)
})

test('C3: cases page shows Lead and Alumni filters or columns', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForTimeout(3000)
  const hasLead = await page.getByText('Lead').isVisible().catch(() => false)
  const hasAlumni = await page.getByText('Alumni').isVisible().catch(() => false)
  expect(hasLead).toBeTruthy()
  expect(hasAlumni).toBeTruthy()
})
