import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A1: cases page shows candidates', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /candidat/i })).toBeVisible({ timeout: 20000 })
})

test('A2: clicking a candidate loads without 500', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const rdvCase = findByStatus(cases, 'rdv_booked') ?? cases[0]
  expect(rdvCase).toBeTruthy()
  const name = getFirstName(rdvCase)

  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('A3: notifications page loads', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible({ timeout: 20000 })
})
