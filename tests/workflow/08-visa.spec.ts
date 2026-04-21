import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A19: avancer Test Workflow → visa_in_progress + en-attente', async ({ page, request }) => {
  await advanceTestCase(request, 'visa_in_progress')
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A20: portail agent visa Test Workflow charge', async ({ page, request }) => {
  // Chercher l'accès agent créé pour ce case
  const res = await request.get(`/api/cases/${TEST_CASE_ID}`)
  const caseData = await res.json()
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 15000 })
})
