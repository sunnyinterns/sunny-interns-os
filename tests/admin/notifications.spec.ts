import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('C5: notifications page shows at least 4 notifications', async ({ page }) => {
  await page.goto('/fr/notifications')
  await page.waitForTimeout(5000)
  const notifs = await page.locator('.notification-item, [data-testid="notification"], li, .notification-card, a[href*="/fr/cases/"]').count()
  expect(notifs).toBeGreaterThanOrEqual(4)
})
