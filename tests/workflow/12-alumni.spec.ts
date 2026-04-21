import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A27: alumni page loads', async ({ page }) => {
  await page.goto('/fr/alumni')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Alumni' })).toBeVisible({ timeout: 20000 })
})

test('A28: alumni portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const alumniCase = findByStatus(cases, 'alumni')
  if (!alumniCase) return
  const token = getToken(alumniCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
