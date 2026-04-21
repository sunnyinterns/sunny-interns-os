import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getToken, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A5: en-attente page loads with pending items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible({ timeout: 15000 })
})

test('A6: qualification_done case portal loads via portal_token', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const qualCase = findByStatus(cases, 'qualification_done')
  expect(qualCase).toBeTruthy()
  const token = getToken(qualCase)
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
  await expect(page.getByText('This page could not')).not.toBeVisible()
})
