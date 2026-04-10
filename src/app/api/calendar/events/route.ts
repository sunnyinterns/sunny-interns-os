import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '60')
  const status = searchParams.get('status')

  const now = new Date()
  const future = new Date(now.getTime() + days * 86400000)

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = admin
    .from('calendar_events')
    .select(`
      *,
      cases (
        id, desired_sectors, desired_start_date,
        interns (first_name, last_name, email, main_desired_job)
      )
    `)
    .order('start_datetime', { ascending: true })

  if (status === 'cancelled') {
    query = query.eq('status', 'cancelled')
  } else if (status === 'upcoming' || !status) {
    query = query
      .gte('start_datetime', now.toISOString())
      .lte('start_datetime', future.toISOString())
      .eq('status', 'confirmed')
  }

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrichir avec les données de l'intern depuis le join
  const enriched = (data ?? []).map((ev: Record<string, unknown>) => {
    const caseData = ev.cases as { id: string; desired_sectors: string[] | null; desired_start_date: string | null; interns: { first_name: string; last_name: string; email: string; main_desired_job: string | null } | null } | null
    const intern = caseData?.interns
    return {
      ...ev,
      cases: undefined, // ne pas exposer le nested object
      intern_name: intern ? `${intern.first_name} ${intern.last_name}`.trim() : (ev.intern_name ?? null),
      intern_email: intern?.email ?? ev.intern_email ?? null,
      desired_jobs: caseData?.desired_sectors?.slice(0, 3) ?? null,
    }
  })

  return NextResponse.json(enriched)
}
