
// ─── Candidat test fixe — workflow end-to-end ────────────────────────────────
export const TEST_CASE_ID   = 'ffffffff-0001-0001-0001-000000000002'
export const TEST_INTERN_ID = 'ffffffff-0001-0001-0001-000000000001'
export const TEST_PORTAL_TOKEN = 'ffffffff-0001-0001-0001-000000000099'
export const TEST_MEET_LINK = 'https://meet.google.com/test-workflow-001'

/** Remet le case test à rdv_booked avant chaque run complet */
export async function resetTestCase(request: APIRequestContext): Promise<void> {
  await request.patch(`/api/cases/${TEST_CASE_ID}/status`, {
    data: { status: 'rdv_booked' },
  })
}

/** Avance le case test à un statut donné */
export async function advanceTestCase(
  request: APIRequestContext,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await request.patch(`/api/cases/${TEST_CASE_ID}/status`, {
    data: { status, ...extra },
  })
}

import type { APIRequestContext, Page } from '@playwright/test'

export async function fetchCases(request: APIRequestContext): Promise<any[]> {
  const response = await request.get('/api/cases')
  const data = await response.json()
  return Array.isArray(data) ? data : data.data ?? data.cases ?? []
}

export function findByStatus(cases: any[], status: string): any | undefined {
  return cases.find((c: any) => c.status === status)
}

export function getName(c: any): string {
  const first = c.interns?.first_name ?? c.intern?.first_name ?? ''
  const last = c.interns?.last_name ?? c.intern?.last_name ?? ''
  return `${first} ${last}`.trim()
}

export function getFirstName(c: any): string {
  return c.interns?.first_name ?? c.intern?.first_name ?? ''
}

export function getToken(c: any): string | undefined {
  return c.portal_token
}

/**
 * Uploads a screenshot of the current page to Supabase Storage and updates
 * the matching test_step row's screenshot_url. No-ops if TEST_RUN_ID is not set.
 */
export async function uploadScreenshot(page: Page, testTitle: string): Promise<void> {
  const runId = process.env.TEST_RUN_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!runId || !supabaseUrl || !serviceKey) return

  // Parse testId from title prefix: "A1: ..." → "A1"
  const m = testTitle.match(/^([ABCE]\d+):/)
  const testId = m?.[1]
  if (!testId) return

  try {
    // Find the step in DB by run_id + test_id
    const stepsRes = await fetch(
      `${supabaseUrl}/rest/v1/test_steps?run_id=eq.${runId}&test_id=eq.${encodeURIComponent(testId)}&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    if (!stepsRes.ok) return
    const rows = await stepsRes.json()
    const stepId = rows[0]?.id
    if (!stepId) return

    const buf = await page.screenshot({ fullPage: false })
    const key = `${runId}/${stepId}.png`

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/test-screenshots/${key}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: buf,
      }
    )
    if (!uploadRes.ok) return

    const screenshotUrl = `${supabaseUrl}/storage/v1/object/public/test-screenshots/${key}`
    await fetch(`${supabaseUrl}/rest/v1/test_steps?id=eq.${stepId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ screenshot_url: screenshotUrl }),
    })
  } catch {
    // Silent fail — screenshots are non-blocking
  }
}
