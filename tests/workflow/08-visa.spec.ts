import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A19: en-attente page loads', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A20: visa_submitted portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const visaCase = findByStatus(cases, 'visa_submitted')
  if (!visaCase) return
  const token = getToken(visaCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
