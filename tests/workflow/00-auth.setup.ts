import { test as setup } from '@playwright/test'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const TEST_CASE_ID  = 'ffffffff-0001-0001-0001-000000000002'

setup('A0: authentification + reset candidat test', async ({ page }) => {
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  if (page.url().includes('/login')) {
    const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? process.env.TEST_EMAIL ?? ''
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? process.env.TEST_PASSWORD ?? ''
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/fr/**', { timeout: 20000 })
  }

  await page.context().storageState({ path: 'playwright/.auth/user.json' })

  // Reset le candidat test à rdv_booked pour un run propre
  if (SUPABASE_URL && SERVICE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/cases?id=eq.${TEST_CASE_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        status: 'rdv_booked',
        intern_first_meeting_date: new Date(Date.now() + 2 * 86400000).toISOString(),
        google_meet_link: 'https://meet.google.com/test-workflow-001',
        convention_signed: false,
        convention_signed_at: null,
        payment_amount: null,
        visa_submitted_to_agent_at: null,
        actual_start_date: null,
        actual_end_date: null,
      }),
    })
  }
})
