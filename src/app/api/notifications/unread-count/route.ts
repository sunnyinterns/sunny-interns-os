import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const type = new URL(req.url).searchParams.get('type')
  if (type === 'calendar') {
    const { data: seen } = await supabase
      .from('notifications_seen')
      .select('last_seen_at')
      .eq('user_id', user.id)
      .eq('notification_type', 'calendar')
      .maybeSingle()
    const since = seen?.last_seen_at ?? new Date(Date.now() - 7 * 86400000).toISOString()
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gt('intern_first_meeting_date', since)
      .not('intern_first_meeting_date', 'is', null)
    return NextResponse.json({ count: count ?? 0 })
  }

  // Récupérer ce que l'utilisateur a déjà vu
  const { data: seen } = await supabase
    .from('notifications_seen')
    .select('last_seen_count')
    .eq('user_id', user.id)
    .eq('notification_type', 'leads')
    .maybeSingle()
  const lastSeenCount = seen?.last_seen_count ?? 0

  // Nouveaux leads depuis la dernière visite
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')
  const newLeads = Math.max(0, (totalLeads ?? 0) - lastSeenCount)

  // Paiements notifiés par candidat (non encore validés)
  const { count: paymentNotifs } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .not('payment_notified_by_intern_at', 'is', null)
    .is('payment_amount', null)

  // Engagements non signés en qualification_done
  const { count: missingEngagement } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .is('engagement_letter_signed_at', null)
    .eq('status', 'qualification_done')

  const total = newLeads + (paymentNotifs ?? 0) + (missingEngagement ?? 0)
  return NextResponse.json({ count: total })
}

export async function POST(req: Request) {
  // Marquer les notifications comme vues
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const type = new URL(req.url).searchParams.get('type')
  if (type === 'calendar') {
    await supabase
      .from('notifications_seen')
      .upsert({
        user_id: user.id,
        notification_type: 'calendar',
        last_seen_at: new Date().toISOString(),
        last_seen_count: 0,
      }, { onConflict: 'user_id,notification_type' })
    return NextResponse.json({ ok: true })
  }

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  await supabase
    .from('notifications_seen')
    .upsert({
      user_id: user.id,
      notification_type: 'leads',
      last_seen_at: new Date().toISOString(),
      last_seen_count: totalLeads ?? 0,
    }, { onConflict: 'user_id,notification_type' })

  return NextResponse.json({ ok: true })
}
