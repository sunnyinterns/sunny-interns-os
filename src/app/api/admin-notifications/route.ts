import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}


function requireInternalKey(req: Request): Response | null {
  const key = req.headers.get('x-internal-key') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (key !== process.env.INTERNAL_API_KEY && key !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}


export async function GET(req: Request) {
  const authErr = requireInternalKey(req)
  if (authErr) return authErr

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
