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

  // Auth via endpoint dédié (pas le formulaire de login)
  const authUrl = `${BASE}/api/tests/auth-setup?secret=${SECRET}`
  const response = await page.goto(authUrl, { waitUntil: 'networkidle' })
  console.log('Auth status:', response?.status(), '— URL:', page.url())

  await context.storageState({ path: AUTH_PATH })

  if (page.url().includes('/login')) {
    throw new Error(`Auth échouée — redirigé vers login: ${page.url()}`)
  }

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
        convention_signed: false,
        convention_signed_at: null,
        payment_amount: null,
        visa_submitted_to_agent_at: null,
        actual_start_date: null,
        actual_end_date: null,
      }),
    })
    console.log('Reset candidat test:', res.status)
  }

  console.log('A0 OK — auth + reset done')
})
