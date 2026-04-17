import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Polling endpoint — widget checks every 5s if a fix has been deployed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bugId = searchParams.get('bug_id')
  const stepId = searchParams.get('step_id')

  const admin = createAdminClient()

  let query = admin.from('qa_bugs').select('id, status, fix_description, fixed_at')
  if (bugId) query = query.eq('id', bugId)
  else if (stepId) query = query.eq('step_id', stepId).order('created_at', { ascending: false }).limit(1)
  else return NextResponse.json({ status: 'none' })

  const { data } = await query.maybeSingle()

  if (!data) return NextResponse.json({ status: 'none' })
  return NextResponse.json({
    id: data.id,
    status: data.status, // open | fixing | fixed
    fix_description: data.fix_description,
    fixed_at: data.fixed_at,
  })
}
