import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, getToken, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A12: notifications page has content', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible({ timeout: 15000 })
})

test('A13: convention_signed case billing tab loads without 500', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const convCase = findByStatus(cases, 'convention_signed')
  expect(convCase).toBeTruthy()
  const name = getFirstName(convCase)

  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const billingTab = page.getByRole('tab', { name: /facturation|billing/i })
  if (await billingTab.isVisible().catch(() => false)) {
    await billingTab.click()
    await page.waitForTimeout(3000)
  }
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('A14: convention_signed portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const convCase = findByStatus(cases, 'convention_signed')
  expect(convCase).toBeTruthy()
  const token = getToken(convCase)
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
  await expect(page.getByText('This page could not')).not.toBeVisible()
})

test('A15: payment_pending portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const payCase = findByStatus(cases, 'payment_pending')
  if (!payCase) return
  const token = getToken(payCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
