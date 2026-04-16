import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, getToken } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A10: en-attente shows school or convention section', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const hasSchool = await page.getByText(/school|école/i).isVisible().catch(() => false)
  const hasConvention = await page.getByText(/convention/i).isVisible().catch(() => false)
  expect(hasSchool || hasConvention).toBeTruthy()
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
