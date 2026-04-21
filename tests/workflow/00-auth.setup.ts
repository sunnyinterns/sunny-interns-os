import { test as setup } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_PATH = 'playwright/.auth/user.json'
const SECRET    = 'e2e-sunny-interns-2026'
const BASE      = process.env.TEST_BASE_URL ?? 'https://sunny-interns-os.vercel.app'
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const TEST_CASE_ID  = 'ffffffff-0001-0001-0001-000000000002'

setup('A0: auth via endpoint + reset candidat test', async ({ page, context }) => {
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true })

  // Auth via endpoint dédié — attend la redirection vers /fr/feed
  const authUrl = `${BASE}/api/tests/auth-setup?secret=${SECRET}`
  console.log('[A0] Navigating to:', authUrl)
  await page.goto(authUrl, { waitUntil: 'networkidle' })

  // Attendre explicitement la navigation vers /fr/ (succès de l'auth)
  try {
    await page.waitForURL('**/fr/**', { timeout: 15000 })
    console.log('[A0] Auth successful — URL:', page.url())
  } catch {
    console.error('[A0] Auth failed — URL:', page.url())
    const body = await page.textContent('body').catch(() => '')
    console.error('[A0] Page content:', body?.substring(0, 200))
    throw new Error(`Auth échouée — URL: ${page.url()}`)
  }

  await context.storageState({ path: AUTH_PATH })
  console.log('[A0] StorageState saved')

  // Reset le candidat test à rdv_booked
  if (SUPABASE_URL && SERVICE_KEY) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cases?id=eq.${TEST_CASE_ID}`, {
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
        convention_signed: false, convention_signed_at: null,
        payment_amount: null, visa_submitted_to_agent_at: null,
        actual_start_date: null, actual_end_date: null,
      }),
    })
    console.log('[A0] Reset candidat test:', res.status)
  }
})
