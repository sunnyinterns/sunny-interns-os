import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Retourner les events confirmés à venir depuis la DB
export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('status', 'confirmed')
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime', { ascending: true })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: Ajouter/mettre à jour un event (appelé par webhook ou manuellement)
export async function POST(req: Request) {
  const supabase = getServiceClient()
  const event = await req.json() as {
    id: string
    summary?: string
    status?: string
    start_datetime: string
    end_datetime?: string
    intern_name?: string
    intern_email?: string
    meet_link?: string
    cancel_reschedule_link?: string
    google_calendar_id?: string
    case_id?: string
  }

  if (!event.id || !event.start_datetime) {
    return NextResponse.json({ error: 'id and start_datetime are required' }, { status: 400 })
  }

  const { error } = await supabase.from('calendar_events').upsert({
    ...event,
    updated_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
