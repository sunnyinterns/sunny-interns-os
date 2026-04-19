import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ''
const GITHUB_OWNER = 'sunnyinterns'
const GITHUB_REPO = 'sunny-interns-os'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type Suite = 'A' | 'B' | 'C' | 'E' | 'all'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { suite = 'all' }: { suite?: Suite } = await req.json().catch(() => ({}))

  // 1. Créer le test_run en Supabase
  const runRes = await fetch(`${SUPABASE_URL}/rest/v1/test_runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      suite,
      status: 'pending',
      triggered_at: new Date().toISOString(),
      triggered_by: user.email ?? 'admin',
    }),
  })

  if (!runRes.ok) {
    return NextResponse.json({ error: 'Failed to create test run' }, { status: 500 })
  }

  const [run] = await runRes.json()
  const runId: string = run.id

  // 2. Créer les test_steps en pending (pour affichage immédiat)
  const { TEST_SUITES } = await import('@/lib/test-meta')
  const suitesToRun = suite === 'all'
    ? TEST_SUITES
    : TEST_SUITES.filter(s => s.suite === suite)

  const steps = suitesToRun.flatMap((s, si) =>
    s.tests.map((t, ti) => ({
      run_id: runId,
      test_id: t.id,
      title: t.title,
      suite: t.suite,
      file: t.file,
      status: 'pending',
      sort_order: si * 100 + ti,
    }))
  )

  if (steps.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/test_steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(steps),
    })
  }

  // 3. Déclencher le GitHub Action via repository_dispatch
  if (GITHUB_TOKEN) {
    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'run-e2e-tests',
          client_payload: {
            suite,
            run_id: runId,
          },
        }),
      }
    )

    if (!ghRes.ok) {
      // Marque le run comme failed si GitHub n'est pas disponible
      await fetch(`${SUPABASE_URL}/rest/v1/test_runs?id=eq.${runId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ status: 'failed' }),
      })
      return NextResponse.json({
        error: 'GitHub dispatch failed. Vérifier GITHUB_TOKEN dans les env vars Vercel.',
        run_id: runId,
      }, { status: 502 })
    }
  } else {
    // Pas de token GitHub : simulation locale
    await fetch(`${SUPABASE_URL}/rest/v1/test_runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ status: 'running', started_at: new Date().toISOString() }),
    })
  }

  return NextResponse.json({ run_id: runId, suite })
}
