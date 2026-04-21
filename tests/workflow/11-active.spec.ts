import { test, expect } from '@playwright/test'
import { fetchCases, findByStatus, getFirstName, uploadScreenshot } from './helpers'
test.use({ storageState: 'playwright/.auth/user.json' })

test.afterEach(async ({ page }, testInfo) => {
  await uploadScreenshot(page, testInfo.title)
})

test('A26: clients page shows active clients', async ({ page, request }) => {
  const cases = await fetchCases(request)
  const activeCase = findByStatus(cases, 'active')
  if (!activeCase) return
  const name = getFirstName(activeCase)

  await page.goto('/fr/clients')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(name)).toBeVisible({ timeout: 20000 })
})
