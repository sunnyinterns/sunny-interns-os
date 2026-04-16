import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A12: notifications show Léa', async ({ page }) => {
  await page.goto('/fr/notifications')
  await expect(page.getByText('Léa')).toBeVisible({ timeout: 15000 })
})

test('A13: Léa Petit billing tab loads without 500', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Léa Petit').first().click()
  await page.waitForTimeout(2000)
  const billingTab = page.getByRole('tab', { name: /facturation|billing/i })
  await billingTab.click()
  await page.waitForTimeout(3000)
  await expect(page.getByText('500')).not.toBeVisible()
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
})

test('A14: Léa portal shows 1490 or IBAN', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const lea = cases.find((c: any) =>
    (c.intern?.first_name === 'Léa' || c.intern_first_name === 'Léa') &&
    (c.intern?.last_name === 'Petit' || c.intern_last_name === 'Petit')
  )
  expect(lea).toBeTruthy()
  const token = lea.portal_token || lea.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const has1490 = await page.getByText('1490').isVisible().catch(() => false)
  const hasIBAN = await page.getByText('IBAN').isVisible().catch(() => false)
  expect(has1490 || hasIBAN).toBeTruthy()
})

test('A15: employer portal loads without 404', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const lea = cases.find((c: any) =>
    (c.intern?.first_name === 'Léa' || c.intern_first_name === 'Léa') &&
    (c.intern?.last_name === 'Petit' || c.intern_last_name === 'Petit')
  )
  expect(lea).toBeTruthy()
  const employerToken = lea.employer_portal_token || lea.employer?.portal_token
  if (employerToken) {
    await page.goto(`/portal/${employerToken}`)
    await page.waitForTimeout(3000)
    await expect(page.getByText('404')).not.toBeVisible()
  }
})
