import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{id: string}> }) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { order } = await req.json() as { order: { id: string; sort_order: number }[] }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await Promise.all(order.map(({ id: subId, sort_order }) =>
    admin.from('job_submissions').update({ sort_order }).eq('id', subId).eq('case_id', id)
  ))
  return NextResponse.json({ ok: true })
}
