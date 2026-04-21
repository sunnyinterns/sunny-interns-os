import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { billetUrl, dateArrivee, escale, flightNumber, heureArrivee } = await req.json() as {
    billetUrl?: string
    dateArrivee?: string
    escale?: string
    flightNumber?: string
    heureArrivee?: string
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, intern_id')
    .eq('portal_token', token)
    .single()

  if (caseErr || !caseData) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  await supabase.from('cases').update({
    billet_avion: true,
    ...(dateArrivee ? { actual_start_date: dateArrivee } : {}),
    ...(escale ? { flight_last_stopover: escale } : {}),
    ...(flightNumber ? { flight_number: flightNumber } : {}),
    ...(heureArrivee ? { flight_arrival_time_local: heureArrivee } : {}),
  }).eq('id', caseData.id)
  if (billetUrl && caseData.intern_id) {
    await supabase.from('interns').update({ return_plane_ticket_url: billetUrl }).eq('id', caseData.intern_id)
  }

  return NextResponse.json({ ok: true })
}
