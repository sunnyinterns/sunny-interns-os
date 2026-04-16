import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A16: notifications show Inès', async ({ page }) => {
  await page.goto('/fr/notifications')
  await expect(page.getByText('Inès')).toBeVisible({ timeout: 15000 })
})

test('A17: en-attente shows visa or Inès', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasVisa = await page.getByText('visa').isVisible().catch(() => false)
  const hasInes = await page.getByText('Inès').isVisible().catch(() => false)
  expect(hasVisa || hasInes).toBeTruthy()
})

test('A18: Inès portal loads without error', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const ines = cases.find((c: any) => c.intern?.first_name === 'Inès' || c.intern_first_name === 'Inès')
  expect(ines).toBeTruthy()
  const token = ines.portal_token || ines.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  await expect(page.getByText('This page could not')).not.toBeVisible()
  await expect(page.getByText('404')).not.toBeVisible()
})
