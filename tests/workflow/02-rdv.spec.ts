import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A4: rdv_booked case loads and shows profile', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const rdvCase = findByStatus(cases, 'rdv_booked')
  expect(rdvCase).toBeTruthy()
  const name = getFirstName(rdvCase)

  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // Verify case page loaded (shows name in header or profile)
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})
