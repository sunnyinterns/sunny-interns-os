import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('cases')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .lte('actual_start_date', today)
    .in('status', ['arrival_prep', 'visa_received'])
    .select('id, interns(first_name, last_name)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[CRON] Activated ${data?.length ?? 0} stages`)
  return NextResponse.json({ activated: data?.length ?? 0 })
}
