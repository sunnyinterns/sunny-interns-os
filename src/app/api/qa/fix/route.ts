import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// I call this endpoint after deploying a fix to notify the widget

function requireInternalKey(req: Request): Response | null {
  const key = req.headers.get('x-internal-key') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (key !== process.env.INTERNAL_API_KEY && key !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}


export async function POST(request: Request) {
  const authErr = requireInternalKey(request)
  if (authErr) return authErr

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
