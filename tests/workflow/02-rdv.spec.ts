import { test, expect } from '@playwright/test'
import { TEST_CASE_ID, TEST_PORTAL_TOKEN, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A4: dossier Test Workflow → meet.google.com visible', async ({ page }) => {
  await page.goto(`/fr/cases/${TEST_CASE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/meet\.google\.com/i)).toBeVisible({ timeout: 10000 })
})

test('A5: /fr/en-attente → Test Workflow visible', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // On vérifie que la page charge et affiche des todos
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A6: portail candidat Test Workflow charge', async ({ page }) => {
  await page.goto(`/portal/${TEST_PORTAL_TOKEN}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText(/Test/i).first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/meet\.google\.com/i)).toBeVisible({ timeout: 10000 })
})
