import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A1: /fr/cases → Test Workflow visible', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Test').first()).toBeVisible({ timeout: 15000 })
})

test('A2: fiche Test Workflow charge sans 500', async ({ page }) => {
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  await expect(page.getByText('Test Workflow')).toBeVisible({ timeout: 10000 })
})

test('A3: /fr/notifications → page accessible', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 15000 })
})
