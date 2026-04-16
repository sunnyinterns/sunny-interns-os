import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ interns: [], companies: [], jobs: [], contacts: [], total: 0 })

  const sq = stripAccents(q)
  const p = `%${q}%`
  const ps = `%${sq}%`

  // Build accent-insensitive OR for name fields
  const nameOr = (f1: string, f2: string) =>
    q !== sq
      ? `${f1}.ilike.${p},${f1}.ilike.${ps},${f2}.ilike.${p},${f2}.ilike.${ps}`
      : `${f1}.ilike.${p},${f2}.ilike.${p}`

  const nameEmailOr = (f1: string, f2: string, email = 'email') =>
    q !== sq
      ? `${f1}.ilike.${p},${f1}.ilike.${ps},${f2}.ilike.${p},${f2}.ilike.${ps},${email}.ilike.${p}`
      : `${f1}.ilike.${p},${f2}.ilike.${p},${email}.ilike.${p}`

  const textOr = (f: string) =>
    q !== sq ? `${f}.ilike.${p},${f}.ilike.${ps}` : `${f}.ilike.${p}`

  try {
    const [internsRes, companiesRes, jobsRes, contactsRes] = await Promise.all([
      supabase
        .from('interns')
        .select('id, first_name, last_name, email, avatar_url, cases(id, status)')
        .or(nameEmailOr('first_name', 'last_name'))
        .limit(6),
      supabase
        .from('companies')
        .select('id, name, city, logo_url')
        .or(textOr('name'))
        .limit(4),
      supabase
        .from('jobs')
        .select('id, title, location, status, companies(name)')
        .or(textOr('title'))
        .limit(4),
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, job_title, companies(name)')
        .or(nameOr('first_name', 'last_name'))
        .limit(4),
    ])

    // Deduplicate interns by id
    type InternRow = NonNullable<(typeof internsRes.data)>[number]
    const internsMap = new Map<string, InternRow>()
    for (const i of (internsRes.data ?? [])) {
      if (i && !internsMap.has(i.id)) internsMap.set(i.id, i)
    }

    const interns = Array.from(internsMap.values())
    const companies = companiesRes.data ?? []
    const jobs = jobsRes.data ?? []
    const contacts = contactsRes.data ?? []

    return NextResponse.json({
      interns,
      companies,
      jobs,
      contacts,
      total: interns.length + companies.length + jobs.length + contacts.length,
    })
  } catch (e) {
    return NextResponse.json({ interns: [], companies: [], jobs: [], contacts: [], total: 0, error: String(e) })
  }
}
