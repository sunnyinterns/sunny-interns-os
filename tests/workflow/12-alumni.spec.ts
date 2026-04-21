import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A27: avancer Test Workflow → alumni + /fr/alumni', async ({ page, request }) => {
  await advanceTestCase(request, 'alumni')
  await page.goto('/fr/alumni')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Workflow').first()).toBeVisible({ timeout: 15000 })
})

test('A28: portail Test Workflow → vue alumni', async ({ page }) => {
  await page.goto(`/portal/${TEST_PORTAL_TOKEN}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
  await expect(page.getByText(/Workflow/i).first()).toBeVisible({ timeout: 10000 })
})
