import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A19: en-attente shows Baptiste or agent', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasBaptiste = await page.getByText('Baptiste').isVisible().catch(() => false)
  const hasAgent = await page.getByText('agent').isVisible().catch(() => false)
  expect(hasBaptiste || hasAgent).toBeTruthy()
})

test('A20: Baptiste agent portal loads', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const baptiste = cases.find((c: any) => c.intern?.first_name === 'Baptiste' || c.intern_first_name === 'Baptiste')
  expect(baptiste).toBeTruthy()
  const token = baptiste.portal_token || baptiste.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  await expect(page.getByText('404')).not.toBeVisible()
})
