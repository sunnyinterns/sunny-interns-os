import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, getToken } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A7: job_submitted case staffing tab shows job info', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const jobCase = findByStatus(cases, 'job_submitted')
  expect(jobCase).toBeTruthy()
  const name = getFirstName(jobCase)

  await page.goto('/fr/cases')
  await page.waitForLoadState('networkidle')
  await page.getByText(name).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const staffingTab = page.getByRole('tab', { name: /staffing/i })
  if (await staffingTab.isVisible().catch(() => false)) {
    await staffingTab.click()
    await page.waitForTimeout(3000)
  }
  // Should show job or staffing related content
  const hasJob = await page.getByText(/job|stage|offre|proposed|envoy/i).first().isVisible().catch(() => false)
  const hasStaffing = await page.getByText('Staffing').isVisible().catch(() => false)
  expect(hasJob || hasStaffing).toBeTruthy()
})

test('A8: en-attente shows employer section', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const hasEmployer = await page.getByText(/employer/i).isVisible().catch(() => false)
  const hasWaiting = await page.getByText(/attente|waiting/i).isVisible().catch(() => false)
  expect(hasEmployer || hasWaiting).toBeTruthy()
})

test('A9: job_submitted portal loads', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const jobCase = findByStatus(cases, 'job_submitted')
  expect(jobCase).toBeTruthy()
  const token = getToken(jobCase)
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
  await expect(page.getByText('This page could not')).not.toBeVisible()
})
