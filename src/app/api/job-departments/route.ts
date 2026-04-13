import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('job_departments')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count jobs per department
  const { data: jobCounts } = await supabase
    .from('jobs')
    .select('job_department_id')

  const countMap: Record<string, number> = {}
  for (const j of jobCounts ?? []) {
    if (j.job_department_id) {
      countMap[j.job_department_id] = (countMap[j.job_department_id] ?? 0) + 1
    }
  }

  const result = (data ?? []).map(d => ({
    ...d,
    jobs_count: countMap[d.id] ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { name: string; categories?: string[] }
  if (!body.name) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('job_departments')
    .insert({ name: body.name, slug, categories: body.categories ?? [], is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
