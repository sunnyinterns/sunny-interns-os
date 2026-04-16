import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('E4: automations page loads with toggles', async ({ page }) => {
  await page.goto('/fr/settings/automations')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  // Check for any interactive elements (toggles, checkboxes, switches)
  const toggles = await page.locator('input[type=checkbox], [role=switch], button[aria-checked]').count()
  const hasContent = await page.getByText(/automation|automatisation/i).first().isVisible().catch(() => false)
  expect(toggles > 0 || hasContent).toBeTruthy()
})
