import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A26: avancer Test Workflow → active + /fr/cases', async ({ page, request }) => {
  await advanceTestCase(request, 'active')
  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Workflow').first()).toBeVisible({ timeout: 15000 })
})
