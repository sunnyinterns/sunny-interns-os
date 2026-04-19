import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BASE = 'https://sunny-interns-os.vercel.app'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const CHECKS = [
  { id: 'Q01', title: 'Login page charge', url: '/fr/login', status: 200, text: ['Se connecter'] },
  { id: 'Q02', title: 'Feed accessible', url: '/fr/feed', status: 200 },
  { id: 'Q03', title: 'Cases accessible', url: '/fr/cases', status: 200 },
  { id: 'Q04', title: 'Jobs accessible', url: '/fr/jobs', status: 200 },
  { id: 'Q05', title: 'Contacts accessible', url: '/fr/contacts', status: 200 },
  { id: 'Q06', title: 'Settings charge', url: '/fr/settings', status: 200 },
  { id: 'Q07', title: 'Alumni accessible', url: '/fr/alumni', status: 200 },
  { id: 'Q08', title: 'Tests page accessible', url: '/fr/tests', status: 200 },
  { id: 'Q09', title: 'Pipeline accessible', url: '/fr/pipeline', status: 200 },
  { id: 'Q10', title: 'Blog accessible', url: '/fr/blog', status: 200 },
  { id: 'Q11', title: 'Companies accessible', url: '/fr/companies', status: 200 },
  { id: 'Q12', title: 'Notifications accessible', url: '/fr/notifications', status: 200 },
  { id: 'Q13', title: 'En-attente accessible', url: '/fr/en-attente', status: 200 },
  { id: 'Q14', title: 'Finances accessible', url: '/fr/finances', status: 200 },
  { id: 'Q15', title: 'API cases répond', url: '/api/cases', allowedStatus: [200, 401] },
  { id: 'Q16', title: 'API jobs répond', url: '/api/jobs', allowedStatus: [200, 401] },
  { id: 'Q17', title: 'Token invalide sans crash', url: '/portal/token-invalide-test-xxx', notText: ['Internal Server Error', 'Application error'] },
] as const

async function sb(method: string, path: string, data?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=representation' },
    body: data ? JSON.stringify(data) : undefined,
  }).catch(() => null)
  if (!res?.ok) return null
  return res.json().catch(() => null)
}

async function sbPatch(table: string, id: string, data: unknown) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const rows = await sb('POST', 'test_runs', {
    suite: 'Q', status: 'running', triggered_at: now, started_at: now,
    total: CHECKS.length, triggered_by: user.email ?? 'admin',
  })
  const runId: string = Array.isArray(rows) ? rows[0]?.id : rows?.id
  if (!runId) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  // Créer steps
  for (let i = 0; i < CHECKS.length; i++) {
    const c = CHECKS[i]
    await sb('POST', 'test_steps', { run_id: runId, test_id: c.id, title: c.title, suite: 'Q', status: 'pending', sort_order: i })
  }

  // Lancer en arrière-plan
  void runAllChecks(runId)

  return NextResponse.json({ run_id: runId, suite: 'Q' })
}

async function runAllChecks(runId: string) {
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/test_steps?run_id=eq.${runId}&select=id,test_id`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  }).then(r => r.json()).catch(() => [])
  const stepMap: Record<string, string> = {}
  for (const r of rows) stepMap[r.test_id] = r.id

  let passed = 0, failed = 0

  for (const c of CHECKS) {
    const t0 = Date.now()
    const stepId = stepMap[c.id]
    try {
      const res = await fetch(`${BASE}${c.url}`, {
        redirect: 'follow',
        headers: { 'User-Agent': 'SunnyInterns-QA/1.0' },
        signal: AbortSignal.timeout(12000),
      })
      const html = await res.text().catch(() => '')
      const ms = Date.now() - t0

      let ok = true
      const errors: string[] = []

      if ('status' in c && c.status && res.status !== c.status) {
        ok = false; errors.push(`HTTP ${res.status} ≠ ${c.status}`)
      }
      if ('allowedStatus' in c && c.allowedStatus && !c.allowedStatus.includes(res.status as 200 | 401)) {
        ok = false; errors.push(`HTTP ${res.status} non autorisé`)
      }
      if ('text' in c && c.text) {
        for (const t of c.text) {
          if (!html.includes(t)) { ok = false; errors.push(`"${t}" absent`) }
        }
      }
      if ('notText' in c && c.notText) {
        for (const t of c.notText) {
          if (html.includes(t)) { ok = false; errors.push(`"${t}" trouvé (interdit)`) }
        }
      }

      if (ok) passed++; else failed++
      const update: Record<string, unknown> = { status: ok ? 'passed' : 'failed', duration_ms: ms, finished_at: new Date().toISOString() }
      if (!ok) update.error_message = errors.join(' · ')
      if (stepId) await sbPatch('test_steps', stepId, update)
      await sbPatch('test_runs', runId, { passed, failed })

    } catch (e: unknown) {
      failed++
      if (stepId) await sbPatch('test_steps', stepId, {
        status: 'failed', duration_ms: Date.now() - t0, finished_at: new Date().toISOString(),
        error_message: e instanceof Error ? e.message.slice(0, 200) : 'Timeout ou erreur réseau',
      })
      await sbPatch('test_runs', runId, { passed, failed })
    }
  }

  await sbPatch('test_runs', runId, {
    status: failed === 0 ? 'passed' : 'failed',
    finished_at: new Date().toISOString(),
    total: CHECKS.length, passed, failed, skipped: 0,
  })
}
