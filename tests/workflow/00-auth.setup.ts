import { test as setup } from '@playwright/test'
import { TEST_CASE_ID, TEST_INTERN_ID } from './helpers'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

setup('A0: authentification + reset candidat test', async ({ page, request }) => {
  // Auth
  await page.goto('/fr/feed')
  await page.waitForLoadState('networkidle')
  const loc = page.url()
  if (loc.includes('/login')) {
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? 'sidney.ruby@gmail.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL('/fr/**', { timeout: 15000 })
  }
  await page.context().storageState({ path: 'playwright/.auth/user.json' })

  // Reset le candidat test à rdv_booked
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
      }),
    })
  }
})
