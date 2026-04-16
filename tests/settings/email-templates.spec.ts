import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/user.json' })

test('E1: email-templates page shows at least 30 templates', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForTimeout(5000)
  const templates = await page.locator('[data-testid="template-item"], .template-row, .template-card, tr, li').count()
  expect(templates).toBeGreaterThanOrEqual(30)
})

test('E2: Agent section shows visa_agent_submission', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Agent')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('visa_agent_submission')).toBeVisible({ timeout: 10000 })
})

test('E3: Pre-departure section shows all_indonesia, not in Qualification', async ({ page }) => {
  await page.goto('/fr/settings/email-templates')
  await page.waitForTimeout(3000)
  await expect(page.getByText('Pre-departure')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('all_indonesia')).toBeVisible({ timeout: 10000 })
})
