import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A24: Camille Garcia case shows QR 0025 or Canggu', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Camille Garcia').first().click()
  await page.waitForTimeout(3000)
  const hasQR = await page.getByText('QR 0025').isVisible().catch(() => false)
  const hasCanggu = await page.getByText('Canggu').isVisible().catch(() => false)
  expect(hasQR || hasCanggu).toBeTruthy()
})

test('A25: Camille portal shows checklist or chauffeur', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const camille = cases.find((c: any) =>
    (c.intern?.first_name === 'Camille' || c.intern_first_name === 'Camille') &&
    (c.intern?.last_name === 'Garcia' || c.intern_last_name === 'Garcia')
  )
  expect(camille).toBeTruthy()
  const token = camille.portal_token || camille.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const hasChecklist = await page.getByText(/checklist/i).isVisible().catch(() => false)
  const hasChauffeur = await page.getByText(/chauffeur|driver/i).isVisible().catch(() => false)
  expect(hasChecklist || hasChauffeur).toBeTruthy()
})
