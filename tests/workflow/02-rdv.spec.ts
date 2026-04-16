import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('A4: Lucas Bernard case shows meet.google.com', async ({ page }) => {
  await page.goto('/fr/cases')
  await page.getByText('Lucas Bernard').first().click()
  await page.waitForTimeout(3000)
  await expect(page.getByText('meet.google.com')).toBeVisible({ timeout: 10000 })
})
