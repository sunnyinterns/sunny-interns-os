/**
 * Playwright Reporter — Supabase Live Reporter with Screenshots
 * Push results + screenshots to Supabase in real time (CI only)
 */
import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const RUN_ID = process.env.TEST_RUN_ID ?? ''

const TITLE_TO_ID: Record<string, string> = {
  'authenticate': 'A0', 'A0: authenticate': 'A0',
  'A1: cases page shows candidates': 'A1', 'A2: clicking a candidate loads without 500': 'A2',
  'A3: notifications page loads': 'A3', 'A4: rdv booked case has google meet link': 'A4',
  'A5: en-attente shows qualification items': 'A5', 'A6: portal for qualification_done loads': 'A6',
  'A7: job_submitted case is staffed': 'A7', 'A8: en-attente shows employer or candidate': 'A8',
  'A9: portal shows accept/reject': 'A9', 'A10: en-attente shows convention or candidate': 'A10',
  'A11: portal for job_retained has upload': 'A11', 'A12: notifications page has content': 'A12',
  'A13: convention_signed case billing tab loads without 500': 'A13', 'A14: convention_signed portal loads': 'A14',
  'A15: payment_pending portal loads': 'A15', 'A16: clients page loads': 'A16',
  'A17: en-attente shows waiting items': 'A17', 'A18: payment_received portal loads': 'A18',
  'A19: en-attente shows visa items': 'A19', 'A20: visa agent portal loads': 'A20',
  'A21: notifications shows visa_received': 'A21', 'A22: en-attente shows flight items': 'A22',
  'A23: visa_received portal loads': 'A23', 'A24: arrival_prep case has qr or location': 'A24',
  'A25: arrival portal has checklist': 'A25', 'A26: active case is visible': 'A26',
  'A27: alumni page shows julie': 'A27', 'A28: alumni portal loads': 'A28',
  'B3: invalid token returns 404': 'B3', 'B4: chloe has job submissions': 'B4',
  'B5: nathan visa_received flight pending': 'B5', 'B6: mark resolved reduces items': 'B6',
  'B7: click notification navigates to case': 'B7', 'B8: mark all read clears badges': 'B8',
  'C1: feed page loads without 500': 'C1', 'C2: cases page has at least 10 candidates': 'C2',
  'C3: cases page shows lead and alumni': 'C3', 'C4: en-attente shows intern and school': 'C4',
  'C5: notifications page has at least 4 items': 'C5', 'C6: alumni page shows julie': 'C6',
  'C7: jobs page has at least 1 job': 'C7', 'C8: contacts page shows marcus': 'C8',
  'E1: settings has at least 30 email templates': 'E1', 'E2: agent section has visa_agent_submission': 'E2',
  'E3: pre-departure section has all_indonesia': 'E3', 'E4: automations table has toggles': 'E4',
}

async function sbPatch(table: string, id: string, data: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY || !id) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
      body: JSON.stringify(data),
    })
  } catch {}
}

async function sbInsert(table: string, data: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=representation' },
      body: JSON.stringify(data),
    })
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] : rows
  } catch { return null }
}

async function uploadScreenshot(filePath: string, stepId: string, runId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY || !filePath || !fs.existsSync(filePath)) return null
  try {
    const buf = fs.readFileSync(filePath)
    const key = `${runId}/${stepId}.png`
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/test-screenshots/${key}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'image/png', 'x-upsert': 'true' },
      body: buf,
    })
    return res.ok ? `${SUPABASE_URL}/storage/v1/object/public/test-screenshots/${key}` : null
  } catch { return null }
}

const stepIds = new Map<string, string>()
let passed = 0, failed = 0, total = 0

function getTestId(test: TestCase): string {
  const t = test.title
  if (TITLE_TO_ID[t]) return TITLE_TO_ID[t]
  const m = t.match(/^([ABCE]\d+):/)
  return m ? m[1] : t.substring(0, 10)
}

class SupabaseReporter implements Reporter {
  async onBegin(_: FullConfig, suite: Suite) {
    if (!RUN_ID) return
    total = suite.allTests().length
    await sbPatch('test_runs', RUN_ID, { status: 'running', started_at: new Date().toISOString(), total })
  }

  async onTestBegin(test: TestCase) {
    if (!RUN_ID) return
    const testId = getTestId(test)
    const row = await sbInsert('test_steps', {
      run_id: RUN_ID, test_id: testId, title: test.title,
      suite: testId.charAt(0), file: path.basename(test.location.file),
      status: 'running', started_at: new Date().toISOString(),
    })
    if (row?.id) stepIds.set(test.title, row.id)
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    if (!RUN_ID) return
    const stepId = stepIds.get(test.title)
    if (result.status === 'passed') passed++
    else if (result.status !== 'skipped') failed++

    const update: Record<string, unknown> = {
      status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: result.duration,
    }
    if (result.error) {
      update.error_message = result.error.message?.substring(0, 500) ?? ''
      update.error_stack = result.error.stack?.substring(0, 1000) ?? ''
    }

    // Screenshot — prend le dernier capturé par Playwright
    const shots = result.attachments.filter(a => a.name === 'screenshot' && a.path)
    const last = shots[shots.length - 1]
    if (last?.path && stepId) {
      const url = await uploadScreenshot(last.path, stepId, RUN_ID)
      if (url) update.screenshot_url = url
    }

    if (stepId) await sbPatch('test_steps', stepId, update)
    await sbPatch('test_runs', RUN_ID, { passed, failed })
  }

  async onEnd(result: FullResult) {
    if (!RUN_ID) return
    await sbPatch('test_runs', RUN_ID, {
      status: result.status === 'passed' ? 'passed' : 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: result.duration,
      passed, failed,
      skipped: Math.max(0, total - passed - failed),
    })
  }

  onError(e: { message: string }) { console.error('[SupabaseReporter]', e.message) }
}

export default SupabaseReporter
