import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseRow } = await supabase
    .from('cases')
    .select('intern_id')
    .eq('portal_token', token)
    .single()

  if (!caseRow?.intern_id) return NextResponse.json([])

  const { data } = await supabase
    .from('cv_versions')
    .select('id, filename, url, version_number, created_at')
    .eq('intern_id', caseRow.intern_id)
    .order('version_number', { ascending: false })

  return NextResponse.json(
    (data ?? []).map(v => ({ ...v, uploaded_at: v.created_at }))
  )
}
