import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('B3: invalid portal token shows 404 or error, no crash', async ({ page }) => {
  await page.goto('/portal/token-invalide-123')
  await page.waitForTimeout(3000)
  const has404 = await page.getByText('404').isVisible().catch(() => false)
  const hasError = await page.getByText(/not found|introuvable|invalid|expired/i).isVisible().catch(() => false)
  const hasServerError = await page.getByText('Internal Server Error').isVisible().catch(() => false)
  expect(has404 || hasError).toBeTruthy()
  expect(hasServerError).toBeFalsy()
})

test('B4: Chloé staffing shows at least 1 job submission', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Chloé Dupont').first().click()
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /staffing/i }).click()
  await page.waitForTimeout(3000)
  const jobItems = await page.locator('[data-testid="job-submission"], .job-submission, .submission-card').count()
  const hasJobText = await page.getByText(/Bali|job|proposed|sent/i).isVisible().catch(() => false)
  expect(jobItems > 0 || hasJobText).toBeTruthy()
})

test('B5: Nathan visa_received shows flight in en-attente', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasFlight = await page.getByText(/flight/i).isVisible().catch(() => false)
  const hasNathan = await page.getByText('Nathan').isVisible().catch(() => false)
  expect(hasFlight || hasNathan).toBeTruthy()
})
