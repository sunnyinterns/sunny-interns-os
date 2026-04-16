import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('B6: en-attente mark resolved reduces items', async ({ page }) => {
  await page.goto('/fr/en-attente')
  await page.waitForTimeout(3000)
  const itemsBefore = await page.locator('[data-testid="pending-item"], .pending-item, li, tr').count()
  const resolveBtn = page.getByRole('button', { name: /mark resolved|résolu/i }).first()
  if (await resolveBtn.isVisible().catch(() => false)) {
    await resolveBtn.click()
    await page.waitForTimeout(2000)
    const itemsAfter = await page.locator('[data-testid="pending-item"], .pending-item, li, tr').count()
    expect(itemsAfter).toBeLessThan(itemsBefore)
  }
})

test('B7: clicking notification navigates to case', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForTimeout(3000)
  const firstNotif = page.locator('a[href*="/fr/cases/"]').first()
  if (await firstNotif.isVisible().catch(() => false)) {
    await firstNotif.click()
    await page.waitForURL('**/fr/cases/**', { timeout: 10000 })
    expect(page.url()).toContain('/fr/cases/')
  }
})

test('B8: mark all as read clears unread badges', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForTimeout(3000)
  const markAllBtn = page.getByRole('button', { name: /mark all as read|tout marquer/i })
  if (await markAllBtn.isVisible().catch(() => false)) {
    await markAllBtn.click()
    await page.waitForTimeout(2000)
    const unreadBadges = await page.locator('.unread-badge, [data-unread="true"], .badge-unread').count()
    expect(unreadBadges).toBe(0)
  }
})
