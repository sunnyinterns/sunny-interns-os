import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// I call this endpoint after deploying a fix to notify the widget
export async function POST(request: Request) {
  const body = await request.json() as { bug_id: string; fix_description: string }
  const admin = createAdminClient()
  await admin.from('qa_bugs').update({
    status: 'fixed',
    fix_description: body.fix_description,
    fixed_at: new Date().toISOString(),
  }).eq('id', body.bug_id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const body = await request.json() as { bug_id: string }
  const admin = createAdminClient()
  await admin.from('qa_bugs').update({ status: 'fixing' }).eq('id', body.bug_id)
  return NextResponse.json({ ok: true })
}
