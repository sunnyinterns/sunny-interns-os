import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A10: en-attente shows convention or Hugo under school', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasConvention = await page.getByText('convention').isVisible().catch(() => false)
  const hasHugo = await page.getByText('Hugo').isVisible().catch(() => false)
  expect(hasConvention || hasHugo).toBeTruthy()
})

test('A11: Hugo portal shows upload or convention', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const hugo = cases.find((c: any) => c.intern?.first_name === 'Hugo' || c.intern_first_name === 'Hugo')
  expect(hugo).toBeTruthy()
  const token = hugo.portal_token || hugo.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const hasUpload = await page.getByText(/upload/i).isVisible().catch(() => false)
  const hasConvention = await page.getByText(/convention/i).isVisible().catch(() => false)
  expect(hasUpload || hasConvention).toBeTruthy()
})
