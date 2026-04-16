import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('E1: email-templates page loads', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  // Page should show some templates
  await expect(page.getByText(/template|email|modèle/i).first()).toBeVisible({ timeout: 15000 })
})

test('E2: Agent section visible', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const hasAgent = await page.getByText('Agent').first().isVisible().catch(() => false)
  const hasVisa = await page.getByText(/visa_agent/i).first().isVisible().catch(() => false)
  expect(hasAgent || hasVisa).toBeTruthy()
})

test('E3: Pre-departure section visible', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const hasPreDeparture = await page.getByText(/pre-departure|pré-départ/i).first().isVisible().catch(() => false)
  const hasIndonesia = await page.getByText(/indonesia/i).first().isVisible().catch(() => false)
  expect(hasPreDeparture || hasIndonesia).toBeTruthy()
})
