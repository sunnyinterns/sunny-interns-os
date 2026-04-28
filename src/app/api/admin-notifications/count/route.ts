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
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ unread: count ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
