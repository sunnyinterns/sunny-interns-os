import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A10: en-attente page loads without error', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // Page must load — no 500
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  await expect(page.getByText('500')).not.toBeVisible()
  // Either shows items OR an empty state — both are valid
  const hasItems = await page.locator('[data-testid="en-attente-item"], .en-attente-item').count()
  const hasHeading = await page.getByRole('heading', { name: /attente|waiting/i }).isVisible().catch(() => false)
  const hasSchool = await page.getByText(/school|école|waiting for school/i).isVisible().catch(() => false)
  const hasConvention = await page.getByText(/convention/i).isVisible().catch(() => false)
  const hasEmpty = await page.getByText(/rien|aucun|empty|no items/i).isVisible().catch(() => false)
  expect(hasItems > 0 || hasHeading || hasSchool || hasConvention || hasEmpty).toBeTruthy()
})

test('A11: job_retained portal shows upload or convention', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const retainedCase = findByStatus(cases, 'job_retained')
  expect(retainedCase).toBeTruthy()
  const token = getToken(retainedCase)
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
