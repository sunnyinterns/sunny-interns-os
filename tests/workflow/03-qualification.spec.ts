import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A5: en-attente shows Thomas or engagement', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasThomas = await page.getByText('Thomas').isVisible().catch(() => false)
  const hasEngagement = await page.getByText('engagement').isVisible().catch(() => false)
  expect(hasThomas || hasEngagement).toBeTruthy()
})

test('A6: Thomas portal loads via portal_token', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const thomas = cases.find((c: any) => c.intern?.first_name === 'Thomas' || c.intern_first_name === 'Thomas')
  expect(thomas).toBeTruthy()
  const token = thomas.portal_token || thomas.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
