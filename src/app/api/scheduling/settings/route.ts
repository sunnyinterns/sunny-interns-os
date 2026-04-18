import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const [{ data: et }, { data: managers }] = await Promise.all([
    admin.from('scheduling_event_types').select('*').eq('is_active', true).single(),
    admin.from('scheduling_managers').select('*').order('priority'),
  ])
  return NextResponse.json({ event_type: et, managers: managers ?? [] })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { event_type: Record<string, unknown>; managers: Record<string, unknown>[] }
  const admin = createAdminClient()

  // Update event type
  const { id: etId, ...etData } = body.event_type
  await admin.from('scheduling_event_types').update(etData).eq('id', etId)

  // Update managers
  for (const mgr of body.managers) {
    const { id, ...mgrData } = mgr
    await admin.from('scheduling_managers').update(mgrData).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
