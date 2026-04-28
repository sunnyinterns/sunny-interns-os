import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'


function requireInternalKey(req: Request): Response | null {
  const key = req.headers.get('x-internal-key') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (key !== process.env.INTERNAL_API_KEY && key !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}


export async function POST(req: Request) {
  const authErr = requireInternalKey(req)
  if (authErr) return authErr

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cases')
    .update({ status: 'active' })
    .lte('actual_start_date', today)
    .in('status', ['arrival_prep', 'visa_received'])
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activated: data?.length ?? 0 })
}
