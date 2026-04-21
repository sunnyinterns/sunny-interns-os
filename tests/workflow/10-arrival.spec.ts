import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, getToken, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A24: arrival_prep case shows flight or arrival info', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const arrCase = findByStatus(cases, 'arrival_prep')
  if (!arrCase) return
  const name = getFirstName(arrCase)

  await page.goto('/fr/clients')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const hasFlight = await page.getByText(/AF095|flight|vol|CDG/i).isVisible().catch(() => false)
  const hasArrival = await page.getByText(/arriv/i).isVisible().catch(() => false)
  expect(hasFlight || hasArrival).toBeTruthy()
})

test('A25: arrival_prep portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const arrCase = findByStatus(cases, 'arrival_prep')
  if (!arrCase) return
  const token = getToken(arrCase)
  if (!token) return
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
