/**
 * Playwright Reporter — Supabase Live Reporter
 *
 * Pousse chaque résultat de test vers Supabase en temps réel.
 * Utilisé uniquement en CI (GitHub Actions).
 *
 * Variables requises :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_RUN_ID
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const RUN_ID = process.env.TEST_RUN_ID ?? ''

// Mapping nom de fichier → IDs de tests (ex: "01-lead.spec.ts" → ['A1','A2','A3'])
const FILE_TO_IDS: Record<string, string[]> = {
  '00-auth.setup.ts':        ['A0'],
  '01-lead.spec.ts':         ['A1', 'A2', 'A3'],
  '02-rdv.spec.ts':          ['A4'],
  '03-qualification.spec.ts':['A5', 'A6'],
  '04-job-submitted.spec.ts':['A7', 'A8', 'A9'],
  '05-job-retained.spec.ts': ['A10', 'A11'],
  '06-convention.spec.ts':   ['A12', 'A13', 'A14', 'A15'],
  '07-payment.spec.ts':      ['A16', 'A17', 'A18'],
  '08-visa.spec.ts':         ['A19', 'A20'],
  '09-visa-received.spec.ts':['A21', 'A22', 'A23'],
  '10-arrival.spec.ts':      ['A24', 'A25'],
  '11-active.spec.ts':       ['A26'],
  '12-alumni.spec.ts':       ['A27', 'A28'],
  'edge-cases.spec.ts':      ['B3', 'B4', 'B5'],
  'notifications.spec.ts':   ['B6', 'B7', 'B8'],
  'dashboard.spec.ts':       ['C1'],
  'cases-list.spec.ts':      ['C2', 'C3'],
  'en-attente.spec.ts':      ['C4'],
  'admin/notifications.spec.ts': ['C5'],
  'other-pages.spec.ts':     ['C6', 'C7', 'C8'],
  'email-templates.spec.ts': ['E1', 'E2', 'E3'],
  'automations.spec.ts':     ['E4'],
}

// Mapping titre de test → ID
const TITLE_TO_ID: Record<string, string> = {
  'A0: authenticate': 'A0',
  'A1: cases page shows candidates': 'A1',
  'A2: clicking a candidate loads without 500': 'A2',
  'A3: notifications page loads': 'A3',
  'A4: rdv booked case has google meet link': 'A4',
  'A5: en-attente shows qualification items': 'A5',
  'A6: portal for qualification_done loads': 'A6',
  'A7: job_submitted case is staffed': 'A7',
  'A8: en-attente shows employer or candidate': 'A8',
  'A9: portal shows accept/reject': 'A9',
  'A10: en-attente shows convention or candidate': 'A10',
  'A11: portal for job_retained has upload': 'A11',
  'A12: notifications page has content': 'A12',
  'A13: convention_signed case billing tab loads without 500': 'A13',
  'A14: convention_signed portal loads': 'A14',
  'A15: payment_pending portal loads': 'A15',
  'A16: clients page loads': 'A16',
  'A17: en-attente shows waiting items': 'A17',
  'A18: payment_received portal loads': 'A18',
  'A19: en-attente shows visa items': 'A19',
  'A20: visa agent portal loads': 'A20',
  'A21: notifications shows visa_received': 'A21',
  'A22: en-attente shows flight items': 'A22',
  'A23: visa_received portal loads': 'A23',
  'A24: arrival_prep case has qr or location': 'A24',
  'A25: arrival portal has checklist': 'A25',
  'A26: active case is visible': 'A26',
  'A27: alumni page shows julie': 'A27',
  'A28: alumni portal loads': 'A28',
}

async function supabasePatch(table: string, id: string, data: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(data),
    })
  } catch (e) {
    console.error('[SupabaseReporter] PATCH error:', e)
  }
}

async function supabaseInsert(table: string, data: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(data),
    })
    const rows = await res.json()
    return Array.isArray(rows) ? rows[0] : rows
  } catch (e) {
    console.error('[SupabaseReporter] INSERT error:', e)
    return null
  }
}

// Map test title → step UUID
const stepIds = new Map<string, string>()
let totalTests = 0
let passedTests = 0
let failedTests = 0

function extractTestId(test: TestCase): string {
  const title = test.title
  if (TITLE_TO_ID[title]) return TITLE_TO_ID[title]
  // Essaie le pattern Axx/Bxx/Cxx/Exx au début
  const m = title.match(/^([ABCE]\d+):/)
  if (m) return m[1]
  return title.substring(0, 10)
}

function getSuiteFromId(testId: string): string {
  return testId.charAt(0)
}

class SupabaseReporter implements Reporter {
  async onBegin(_config: FullConfig, suite: Suite) {
    if (!RUN_ID) return
    totalTests = suite.allTests().length
    await supabasePatch('test_runs', RUN_ID, {
      status: 'running',
      started_at: new Date().toISOString(),
      total: totalTests,
    })
  }

  async onTestBegin(test: TestCase) {
    if (!RUN_ID) return
    const testId = extractTestId(test)
    const suite = getSuiteFromId(testId)
    const file = test.location.file.split('/').pop() ?? ''

    const row = await supabaseInsert('test_steps', {
      run_id: RUN_ID,
      test_id: testId,
      title: test.title,
      suite,
      file,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    if (row?.id) {
      stepIds.set(test.title, row.id)
    }
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    if (!RUN_ID) return
    const stepId = stepIds.get(test.title)
    const passed = result.status === 'passed'
    const skipped = result.status === 'skipped'

    if (passed) passedTests++
    else if (!skipped) failedTests++

    const update: Record<string, unknown> = {
      status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: result.duration,
    }

    if (result.error) {
      update.error_message = result.error.message?.substring(0, 500) ?? ''
      update.error_stack = result.error.stack?.substring(0, 1000) ?? ''
    }

    if (stepId) {
      await supabasePatch('test_steps', stepId, update)
    }
  }

  async onEnd(result: FullResult) {
    if (!RUN_ID) return
    const skipped = totalTests - passedTests - failedTests
    await supabasePatch('test_runs', RUN_ID, {
      status: result.status === 'passed' ? 'passed' : 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: result.duration,
      passed: passedTests,
      failed: failedTests,
      skipped: Math.max(0, skipped),
    })
  }

  onError(error: { message: string }) {
    console.error('[SupabaseReporter]', error.message)
  }
}

export default SupabaseReporter
