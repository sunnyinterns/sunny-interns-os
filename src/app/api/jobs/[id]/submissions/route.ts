import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { id } = await params
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data } = await admin
    .from('job_submissions')
    .select(`
      id, status, created_at,
      cases!inner(id, interns!inner(first_name, last_name, email))
    `)
    .eq('job_id', id)
    .not('status', 'in', '("rejected","cancelled")')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted = (data ?? []).map((s: any) => {
    const c = Array.isArray(s.cases) ? s.cases[0] : s.cases
    const intern = c ? (Array.isArray(c.interns) ? c.interns[0] : c.interns) : null
    return {
      case_id: c?.id as string,
      intern_name: [intern?.first_name, intern?.last_name].filter(Boolean).join(' ') || 'Candidat',
      status: s.status,
      created_at: s.created_at,
    }
  })

  return NextResponse.json(formatted)
}
