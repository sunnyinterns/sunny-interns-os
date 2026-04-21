import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A12: avancer Test Workflow → job_retained', async ({ page, request }) => {
  await advanceTestCase(request, 'job_retained')
  await page.goto(`/fr/notifications`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 15000 })
})
