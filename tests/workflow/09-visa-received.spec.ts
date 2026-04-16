import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A21: notifications show Nathan', async ({ page }) => {
  await page.goto('/fr/notifications')
  await expect(page.getByText('Nathan')).toBeVisible({ timeout: 15000 })
})

test('A22: en-attente shows flight or Nathan', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasFlight = await page.getByText('flight').isVisible().catch(() => false)
  const hasNathan = await page.getByText('Nathan').isVisible().catch(() => false)
  expect(hasFlight || hasNathan).toBeTruthy()
})

test('A23: Nathan portal shows visa or download', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const nathan = cases.find((c: any) => c.intern?.first_name === 'Nathan' || c.intern_first_name === 'Nathan')
  expect(nathan).toBeTruthy()
  const token = nathan.portal_token || nathan.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const hasVisa = await page.getByText(/visa/i).isVisible().catch(() => false)
  const hasDownload = await page.getByText(/download/i).isVisible().catch(() => false)
  expect(hasVisa || hasDownload).toBeTruthy()
})
