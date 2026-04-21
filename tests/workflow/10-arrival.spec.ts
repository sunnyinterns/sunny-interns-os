import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A24: avancer Test Workflow → arrival_prep', async ({ page, request }) => {
  await advanceTestCase(request, 'arrival_prep')
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('A25: portail Test Workflow → arrivée Bali', async ({ page }) => {
  await page.goto(`/portal/${TEST_PORTAL_TOKEN}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
