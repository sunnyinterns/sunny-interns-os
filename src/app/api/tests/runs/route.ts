import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const runId = searchParams.get('run_id')
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  if (runId) {
    // Détail d'un run spécifique avec ses steps
    const [runRes, stepsRes] = await Promise.all([
      supabase
        .from('test_runs')
        .select('*')
        .eq('id', runId)
        .single(),
      supabase
        .from('test_steps')
        .select('*')
        .eq('run_id', runId)
        .order('sort_order', { ascending: true }),
    ])

    if (runRes.error) return NextResponse.json({ error: runRes.error.message }, { status: 500 })

    return NextResponse.json({
      run: runRes.data,
      steps: stepsRes.data ?? [],
    })
  }

  // Liste des runs récents
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ runs: data ?? [] })
}
