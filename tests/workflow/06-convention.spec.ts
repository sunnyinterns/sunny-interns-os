import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, advanceTestCase, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A13: avancer Test Workflow → convention_signed + onglet Facturation sans 500', async ({ page, request }) => {
  await advanceTestCase(request, 'convention_signed')
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const billingTab = page.getByRole('tab', { name: /facturation|billing/i })
  if (await billingTab.isVisible().catch(() => false)) {
    await billingTab.click()
    await page.waitForTimeout(3000)
  }
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('A14: portail Test Workflow au stade convention_signed', async ({ page }) => {
  await page.goto(`/portal/${TEST_PORTAL_TOKEN}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
  await expect(page.getByText(/Workflow/i).first()).toBeVisible({ timeout: 10000 })
})

test('A15: avancer Test Workflow → payment_pending', async ({ page, request }) => {
  await advanceTestCase(request, 'payment_pending')
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})
