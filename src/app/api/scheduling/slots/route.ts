import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getFreeBusy, generateSlots } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '21'), 30)
  const eventSlug = searchParams.get('event') ?? 'entretien'
  // Visitor's local timezone — passed from client via ?tz=Europe/Berlin
  // Falls back to UTC if not provided (labels will be in UTC but still correct)
  const visitorTz = searchParams.get('tz') ?? 'UTC'
  const admin = createAdminClient()

  const { data: et } = await admin.from('scheduling_event_types').select('*').eq('is_active', true).eq('slug', eventSlug).single()
  if (!et) return NextResponse.json({ error: 'No active event type for slug: ' + eventSlug }, { status: 404 })

  const { data: managers } = await admin.from('scheduling_managers').select('*').eq('is_active', true).order('priority', { ascending: true })
  if (!managers?.length) return NextResponse.json({ days: [], event_type: et })

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

  // Group by day — using visitor's timezone so day boundaries are correct
  type DaySlot = { start: string; end: string; label: string; manager_id: string }
  const byDay: Record<string, { date: string; label: string; slots: DaySlot[] }> = {}

  for (const slot of sorted) {
    const d = new Date(slot.start)
    // Day key in visitor's timezone
    const dateKey = d.toLocaleDateString('sv-SE', { timeZone: visitorTz }) // 'YYYY-MM-DD' format

    if (!byDay[dateKey]) {
      byDay[dateKey] = {
        date: dateKey,
        label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: visitorTz }),
        slots: [],
      }
    }

    byDay[dateKey].slots.push({
      start: slot.start,
      end: slot.end,
      manager_id: slot.manager_id,
      // Simple local time — no mention of Bali or France
      label: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: visitorTz }),
    })
  }

  return NextResponse.json({
    event_type: {
      slug: et.slug,
      title: et.title,
      title_en: et.title_en,
      description: et.description,
      description_en: et.description_en,
      duration_minutes: et.duration_minutes,
      booking_button_text: et.booking_button_text,
      booking_button_text_en: et.booking_button_text_en,
    },
    days: Object.values(byDay),
    total_slots: sorted.length,
    visitor_timezone: visitorTz,
  })
}
