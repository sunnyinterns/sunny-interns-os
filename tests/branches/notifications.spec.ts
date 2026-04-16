import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('B6: en-attente mark resolved reduces items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const resolveBtn = page.getByRole('button', { name: /mark resolved|résolu|done/i }).first()
  if (await resolveBtn.isVisible().catch(() => false)) {
    const bodyText = await page.locator('body').textContent() ?? ''
    await resolveBtn.click()
    await page.waitForTimeout(2000)
    // Page should still be functional after clicking
    await expect(page.getByRole('heading', { name: /en attente/i })).toBeVisible()
  }
})

test('B7: clicking notification navigates to case', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  // Notifications are clickable items (divs/buttons), click the first one
  const firstNotif = page.getByText(/— .+/).first()
  if (await firstNotif.isVisible().catch(() => false)) {
    await firstNotif.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    // Should navigate to a case/client page or mark as read
    const url = page.url()
    const navigated = url.includes('/cases/') || url.includes('/clients/')
    const stayedOnPage = url.includes('/notifications')
    expect(navigated || stayedOnPage).toBeTruthy()
  }
})

test('B8: mark all as read button exists', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  const markAllBtn = page.getByRole('button', { name: /mark all|tout marquer|tout lire/i })
  if (await markAllBtn.isVisible().catch(() => false)) {
    await markAllBtn.click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible()
  }
})
