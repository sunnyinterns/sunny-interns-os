import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, reason } = await request.json() as { eventId: string; reason?: string }

  // Mettre à jour dans notre DB
  const { data: event } = await supabase
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)
    .select()
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Log dans activity_feed
  await supabase.from('activity_feed').insert({
    type: 'rdv_cancelled',
    title: `RDV annulé — ${event.intern_name ?? 'Candidat'}`,
    description: reason ? `Motif: ${reason}` : 'RDV annulé depuis l\'OS',
    metadata: { event_id: eventId, intern_name: event.intern_name }
  }).then(() => null, () => null)

  // Note: l'annulation réelle dans Google Calendar se fait via le lien Fillout
  // (cancel_reschedule_link) ou manuellement dans Google Calendar
  return NextResponse.json({ ok: true, cancelLink: event.cancel_reschedule_link })
}
