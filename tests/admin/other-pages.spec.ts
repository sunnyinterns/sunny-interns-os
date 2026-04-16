import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C6: alumni page shows Julie', async ({ page }) => {
  await page.goto('/fr/alumni')
  await expect(page.getByText('Julie')).toBeVisible({ timeout: 15000 })
})

test('C7: jobs page shows at least 1 job', async ({ page }) => {
  await page.goto('/fr/jobs')
  await page.waitForTimeout(3000)
  const jobs = await page.locator('a[href*="/fr/jobs/"], [data-testid="job-item"], .job-card, .job-row, tr').count()
  expect(jobs).toBeGreaterThanOrEqual(1)
})

test('C8: contacts page shows Marcus', async ({ page }) => {
  await page.goto('/fr/contacts')
  await expect(page.getByText('Marcus')).toBeVisible({ timeout: 15000 })
})
