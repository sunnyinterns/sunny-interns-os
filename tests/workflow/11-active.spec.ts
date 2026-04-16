import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A26: cases page shows Antoine Morel', async ({ page }) => {
  await page.goto('/fr/cases')
  await expect(page.getByText('Antoine Morel')).toBeVisible({ timeout: 15000 })
})
