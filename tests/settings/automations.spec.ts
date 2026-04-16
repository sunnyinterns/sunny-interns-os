import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('E4: automations page shows table with toggles', async ({ page }) => {
  await page.goto('/fr/settings/automations')
  await page.waitForTimeout(3000)
  const toggles = await page.locator('input[type=checkbox], [role=switch], button[aria-checked]').count()
  expect(toggles).toBeGreaterThanOrEqual(1)
})
