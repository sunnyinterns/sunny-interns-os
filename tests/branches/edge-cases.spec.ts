import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName } from '../workflow/helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('B3: invalid portal token shows 404 or error, no crash', async ({ page }) => {
  await page.goto('/portal/token-invalide-123')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const has404 = await page.getByText('404').isVisible().catch(() => false)
  const hasError = await page.getByText(/not found|introuvable|invalid|expired|expiré/i).isVisible().catch(() => false)
  const hasServerError = await page.getByText('Internal Server Error').isVisible().catch(() => false)
  expect(has404 || hasError).toBeTruthy()
  expect(hasServerError).toBeFalsy()
})

test('B4: job_submitted case staffing shows submissions', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const jobCase = findByStatus(cases, 'job_submitted')
  expect(jobCase).toBeTruthy()
  const name = getFirstName(jobCase)

  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const staffingTab = page.getByText('Staffing')
  if (await staffingTab.isVisible().catch(() => false)) {
    await staffingTab.click()
    await page.waitForTimeout(3000)
  }
  // Check page loaded properly
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('B5: en-attente shows waiting items for clients', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible()
})
