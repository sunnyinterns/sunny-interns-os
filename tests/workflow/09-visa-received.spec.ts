import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A21: notifications page loads', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible({ timeout: 15000 })
})

test('A22: en-attente shows waiting items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A23: visa_received portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const visaCase = findByStatus(cases, 'visa_received')
  if (!visaCase) return
  const token = getToken(visaCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
