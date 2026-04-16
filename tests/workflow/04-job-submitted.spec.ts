import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A7: Chloé Dupont staffing tab shows Bali Digital Hub or job', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Chloé Dupont').first().click()
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /staffing/i }).click()
  await page.waitForTimeout(3000)
  const hasBali = await page.getByText('Bali Digital Hub').isVisible().catch(() => false)
  const hasJob = await page.getByText('job').isVisible().catch(() => false)
  expect(hasBali || hasJob).toBeTruthy()
})

test('A8: en-attente shows employer or Chloé', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const hasEmployer = await page.getByText('employer').isVisible().catch(() => false)
  const hasChloe = await page.getByText('Chloé').isVisible().catch(() => false)
  expect(hasEmployer || hasChloe).toBeTruthy()
})

test('A9: Chloé portal shows OUI or NON button', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const chloe = cases.find((c: any) =>
    (c.intern?.first_name === 'Chloé' || c.intern_first_name === 'Chloé') &&
    (c.intern?.last_name === 'Dupont' || c.intern_last_name === 'Dupont')
  )
  expect(chloe).toBeTruthy()
  const token = chloe.portal_token || chloe.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const hasOui = await page.getByText('OUI', { exact: true }).isVisible().catch(() => false)
  const hasNon = await page.getByText('NON', { exact: true }).isVisible().catch(() => false)
  const hasYes = await page.getByText('Yes', { exact: true }).isVisible().catch(() => false)
  const hasNo = await page.getByText('No', { exact: true }).isVisible().catch(() => false)
  expect(hasOui || hasNon || hasYes || hasNo).toBeTruthy()
})
