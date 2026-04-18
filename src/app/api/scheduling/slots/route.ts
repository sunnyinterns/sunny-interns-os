import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getFreeBusy, generateSlots } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '21'), 30)
  const admin = createAdminClient()

  const { data: et } = await admin.from('scheduling_event_types').select('*').eq('is_active', true).single()
  if (!et) return NextResponse.json({ error: 'No active event type' }, { status: 404 })

  const { data: managers } = await admin.from('scheduling_managers').select('*').eq('is_active', true).order('priority', { ascending: true })
  if (!managers?.length) return NextResponse.json({ slots: [], event_type: et })

  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + days * 86400000).toISOString()
  const minNoticeMs = ((et.min_notice_hours as number) ?? 4) * 3600000

  type SlotItem = { start: string; end: string; manager_id: string }
  const allSlotsMap = new Map<string, SlotItem>()

  await Promise.all((managers as Record<string, unknown>[]).map(async (mgr) => {
    const busyPeriods = await getFreeBusy(
      mgr.calendar_id as string, timeMin, timeMax,
      mgr.google_refresh_token as string | undefined
    )
    const slots = generateSlots({
      startDate: now, days,
      durationMin: et.duration_minutes as number,
      bufferBeforeMin: et.buffer_before_minutes as number,
      bufferAfterMin: et.buffer_after_minutes as number,
      workDays: mgr.work_days as number[],
      workStartHour: mgr.work_start_hour as number,
      workEndHour: mgr.work_end_hour as number,
      minNoticeMs, busyPeriods,
    })
    for (const s of slots) {
      if (!allSlotsMap.has(s.start)) allSlotsMap.set(s.start, { ...s, manager_id: mgr.id as string })
    }
  }))

  const sorted = Array.from(allSlotsMap.values()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Group by day
  const byDay: Record<string, { date: string; label: string; label_en: string; slots: { start: string; end: string; label_fr: string; label_en: string; manager_id: string }[] }> = {}
  for (const slot of sorted) {
    const d = new Date(slot.start)
    const dateKey = d.toISOString().slice(0, 10)
    if (!byDay[dateKey]) {
      byDay[dateKey] = {
        date: dateKey,
        label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }),
        label_en: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' }),
        slots: [],
      }
    }
    byDay[dateKey].slots.push({
      start: slot.start, end: slot.end, manager_id: slot.manager_id,
      label_fr: `${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (France) · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })} (Bali)`,
      label_en: `${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} France · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })} Bali`,
    })
  }

  return NextResponse.json({
    event_type: { slug: et.slug, title: et.title, title_en: et.title_en, description: et.description, description_en: et.description_en, duration_minutes: et.duration_minutes, booking_button_text: et.booking_button_text, booking_button_text_en: et.booking_button_text_en },
    days: Object.values(byDay),
    total_slots: sorted.length,
  })
}
