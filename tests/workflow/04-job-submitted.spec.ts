import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A10: avancer Test Workflow → job_submitted', async ({ page, request }) => {
  await advanceTestCase(request, 'job_submitted')
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/job|offre|submitt/i).first()).toBeVisible({ timeout: 10000 })
})

test('A11: /fr/en-attente → employer_response', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})
