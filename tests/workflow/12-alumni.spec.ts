import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A27: alumni page shows Julie Fontaine', async ({ page }) => {
  await page.goto('/fr/alumni')
  await expect(page.getByText('Julie Fontaine')).toBeVisible({ timeout: 15000 })
})

test('A28: Julie portal shows testimonial or alumni', async ({ page }) => {
  const response = await page.request.get('/api/cases')
  const cases = await response.json()
  const julie = cases.find((c: any) =>
    (c.intern?.first_name === 'Julie' || c.intern_first_name === 'Julie') &&
    (c.intern?.last_name === 'Fontaine' || c.intern_last_name === 'Fontaine')
  )
  expect(julie).toBeTruthy()
  const token = julie.portal_token || julie.portal?.token
  expect(token).toBeTruthy()
  await page.goto(`/portal/${token}`)
  await page.waitForTimeout(3000)
  const hasTestimonial = await page.getByText(/testimonial/i).isVisible().catch(() => false)
  const hasAlumni = await page.getByText(/alumni/i).isVisible().catch(() => false)
  expect(hasTestimonial || hasAlumni).toBeTruthy()
})
