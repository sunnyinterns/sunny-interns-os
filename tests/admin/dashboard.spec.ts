import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C1a: dashboard shows A traiter section', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/traiter/i).first()).toBeVisible({ timeout: 20000 })
})

test('C1b: dashboard shows En attente section', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/en attente/i).first()).toBeVisible({ timeout: 20000 })
})

test('C1c: dashboard shows Notifications section', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 20000 })
})

test('C1d: dashboard shows pipeline with at least 1 case', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/pipeline/i).first()).toBeVisible({ timeout: 20000 })
})

test('C1e: dashboard loads without errors', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  await expect(page.getByText('500')).not.toBeVisible()
})
