import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ interns: [], cases: [], companies: [], jobs: [] })

  const pattern = `%${q}%`

  try {
    const [internsRes, companiesRes, jobsRes, contactsRes] = await Promise.all([
      supabase.from('interns').select('id, first_name, last_name, email').or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      supabase.from('companies').select('id, name, destination_id').ilike('name', pattern).limit(5),
      supabase.from('jobs').select('id, title, status').ilike('title', pattern).limit(5),
      supabase.from('contacts').select('id, first_name, last_name, email, job_title').or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
    ])

    return NextResponse.json({
      interns: internsRes.data ?? [],
      companies: companiesRes.data ?? [],
      jobs: jobsRes.data ?? [],
      contacts: contactsRes.data ?? [],
    })
  } catch {
    return NextResponse.json({ interns: [], cases: [], companies: [], jobs: [] })
  }
}
