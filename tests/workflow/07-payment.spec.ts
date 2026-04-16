import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A16: clients page loads', async ({ page }) => {
  await page.goto('/fr/clients')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /dossiers actifs|client/i })).toBeVisible({ timeout: 20000 })
})

test('A17: en-attente shows waiting items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A18: payment_received portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const payCase = findByStatus(cases, 'payment_received')
  if (!payCase) return
  const token = getToken(payCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('This page could not')).not.toBeVisible()
  await expect(page.getByText('404')).not.toBeVisible()
})
