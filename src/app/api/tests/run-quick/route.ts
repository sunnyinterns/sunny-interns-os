import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE = 'https://sunny-interns-os.vercel.app'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const CHECKS = [
  { id: 'Q01', title: 'Login page charge',         url: '/fr/login',        expectStatus: 200, expectText: 'Se connecter' },
  { id: 'Q02', title: 'Feed accessible',            url: '/fr/feed',         expectStatus: 200 },
  { id: 'Q03', title: 'Cases accessible',           url: '/fr/cases',        expectStatus: 200 },
  { id: 'Q04', title: 'Jobs accessible',            url: '/fr/jobs',         expectStatus: 200 },
  { id: 'Q05', title: 'Contacts accessible',        url: '/fr/contacts',     expectStatus: 200 },
  { id: 'Q06', title: 'Settings charge',            url: '/fr/settings',     expectStatus: 200 },
  { id: 'Q07', title: 'Alumni accessible',          url: '/fr/alumni',       expectStatus: 200 },
  { id: 'Q08', title: 'Tests page accessible',      url: '/fr/tests',        expectStatus: 200 },
  { id: 'Q09', title: 'Pipeline accessible',        url: '/fr/pipeline',     expectStatus: 200 },
  { id: 'Q10', title: 'Blog accessible',            url: '/fr/blog',         expectStatus: 200 },
  { id: 'Q11', title: 'Companies accessible',       url: '/fr/companies',    expectStatus: 200 },
  { id: 'Q12', title: 'Notifications accessible',   url: '/fr/notifications', expectStatus: 200 },
  { id: 'Q13', title: 'En-attente accessible',      url: '/fr/en-attente',   expectStatus: 200 },
  { id: 'Q14', title: 'Finances accessible',        url: '/fr/finances',     expectStatus: 200 },
  { id: 'Q15', title: 'API cases répond',           url: '/api/cases',       allowedStatus: [200, 401] },
  { id: 'Q16', title: 'API jobs répond',            url: '/api/jobs',        allowedStatus: [200, 401] },
  { id: 'Q17', title: 'Token invalide sans crash',  url: '/portal/test-invalid-token-xxx', forbidText: 'Internal Server Error' },
]

async function sbFetch(method: string, path: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)
  if (!res?.ok) return null
  return res.json().catch(() => null)
}

async function sbPatch(table: string, id: string, data: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  }).catch(() => {})
}

async function runOneCheck(
  check: typeof CHECKS[0],
  stepId: string,
  counters: { passed: number; failed: number },
  runId: string
) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}${check.url}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'SunnyInterns-QA/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text().catch(() => '')
    const ms = Date.now() - t0

    const errors: string[] = []

    if ('expectStatus' in check && check.expectStatus && res.status !== check.expectStatus) {
      errors.push(`HTTP ${res.status} attendu ${check.expectStatus}`)
    }
    if ('allowedStatus' in check && check.allowedStatus && !check.allowedStatus.includes(res.status as 200 | 401)) {
      errors.push(`HTTP ${res.status} non autorisé`)
    }
    if ('expectText' in check && check.expectText && !html.includes(check.expectText)) {
      errors.push(`"${check.expectText}" absent de la page`)
    }
    if ('forbidText' in check && check.forbidText && html.includes(check.forbidText)) {
      errors.push(`"${check.forbidText}" trouvé (interdit)`)
    }

    const ok = errors.length === 0
    if (ok) counters.passed++; else counters.failed++

    await sbPatch('test_steps', stepId, {
      status: ok ? 'passed' : 'failed',
      duration_ms: ms,
      finished_at: new Date().toISOString(),
      ...(errors.length ? { error_message: errors.join(' · ') } : {}),
    })
    await sbPatch('test_runs', runId, { passed: counters.passed, failed: counters.failed })
  } catch (e: unknown) {
    counters.failed++
    await sbPatch('test_steps', stepId, {
      status: 'failed',
      duration_ms: Date.now() - t0,
      finished_at: new Date().toISOString(),
      error_message: e instanceof Error ? e.message.slice(0, 200) : 'Timeout ou erreur réseau',
    })
    await sbPatch('test_runs', runId, { passed: counters.passed, failed: counters.failed })
  }
}

export const maxDuration = 60  // Vercel Pro: 60s max

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  // Créer le run
  const runRows = await sbFetch('POST', 'test_runs', {
    suite: 'Q', status: 'running', triggered_at: now, started_at: now,
    total: CHECKS.length, triggered_by: user.email ?? 'admin',
  })
  const runId: string = Array.isArray(runRows) ? runRows[0]?.id : runRows?.id
  if (!runId) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  // Créer les steps
  const stepRows: Array<{id: string; test_id: string}> = []
  for (let i = 0; i < CHECKS.length; i++) {
    const c = CHECKS[i]
    const row = await sbFetch('POST', 'test_steps', {
      run_id: runId, test_id: c.id, title: c.title, suite: 'Q',
      status: 'pending', sort_order: i,
    })
    const rowData = Array.isArray(row) ? row[0] : row
    if (rowData?.id) stepRows.push({ id: rowData.id, test_id: c.id })
  }

  const stepMap: Record<string, string> = {}
  for (const r of stepRows) stepMap[r.test_id] = r.id

  // Lancer TOUS les checks en PARALLÈLE — fini en ~3-5s
  const counters = { passed: 0, failed: 0 }
  await Promise.all(
    CHECKS.map(c => runOneCheck(c, stepMap[c.id] ?? '', counters, runId))
  )

  // Finaliser
  await sbPatch('test_runs', runId, {
    status: counters.failed === 0 ? 'passed' : 'failed',
    finished_at: new Date().toISOString(),
    total: CHECKS.length,
    passed: counters.passed,
    failed: counters.failed,
    skipped: 0,
  })

  return NextResponse.json({ run_id: runId, suite: 'Q', passed: counters.passed, failed: counters.failed })
}
