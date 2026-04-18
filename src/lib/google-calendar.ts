// Google Calendar integration — Sunny Interns OS
import { google as googleLib } from 'googleapis'

async function getCalendarClient(refreshToken?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const token = refreshToken ?? process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !token ||
      clientId === 'placeholder' || token === 'placeholder') {
    console.log('[GCal] missing credentials')
    return null
  }
  try {
    const auth = new googleLib.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: token })
    const cal = googleLib.calendar({ version: 'v3', auth })
    return { cal, auth }
  } catch (err) {
    console.error('[GCal] init error:', err)
    return null
  }
}

// ── Freebusy check ──
export async function getFreeBusy(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  refreshToken?: string
): Promise<{ start: string; end: string }[]> {
  const g = await getCalendarClient(refreshToken)
  if (!g) return []
  try {
    const res = await g.cal.freebusy.query({
      requestBody: {
        timeMin, timeMax,
        timeZone: 'Asia/Makassar',
        items: [{ id: calendarId }],
      },
    })
    const busy = res.data.calendars?.[calendarId]?.busy ?? []
    return busy.map(b => ({ start: b.start ?? '', end: b.end ?? '' }))
  } catch (err) {
    console.error('[GCal] freebusy error:', err)
    return []
  }
}

// ── Générer les créneaux disponibles ──
export function generateSlots(params: {
  startDate: Date; days: number; durationMin: number
  bufferBeforeMin: number; bufferAfterMin: number
  workDays: number[]; workStartHour: number; workEndHour: number
  minNoticeMs: number; busyPeriods: { start: string; end: string }[]
}): { start: string; end: string }[] {
  const { startDate, days, durationMin, bufferBeforeMin, bufferAfterMin, workDays, workStartHour, workEndHour, minNoticeMs, busyPeriods } = params
  const slots: { start: string; end: string }[] = []
  const now = Date.now()

  for (let d = 0; d < days; d++) {
    const day = new Date(startDate)
    day.setDate(day.getDate() + d)
    if (!workDays.includes(day.getDay())) continue

    for (let h = workStartHour; h < workEndHour; h++) {
      for (const m of [0, 30]) {
        if (h * 60 + m + bufferBeforeMin + durationMin + bufferAfterMin > workEndHour * 60) continue
        const slotStartWITA = new Date(`${day.toISOString().slice(0, 10)}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+08:00`)
        const slotEndWITA = new Date(slotStartWITA.getTime() + (bufferBeforeMin + durationMin + bufferAfterMin) * 60000)
        const eventStart = new Date(slotStartWITA.getTime() + bufferBeforeMin * 60000)
        const eventEnd = new Date(eventStart.getTime() + durationMin * 60000)
        if (slotStartWITA.getTime() - now < minNoticeMs) continue
        const isBlocked = busyPeriods.some(b => slotStartWITA < new Date(b.end) && slotEndWITA > new Date(b.start))
        if (isBlocked) continue
        slots.push({ start: eventStart.toISOString(), end: eventEnd.toISOString() })
      }
    }
  }
  return slots
}

// ── Créer un event Google Calendar avec Google Meet ──
export async function createMeetEvent(p: {
  summary: string; description?: string; startDateTime: string; endDateTime: string
  attendeeEmail: string; attendeeName: string; calendarId?: string; refreshToken?: string
}) {
  const calId = p.calendarId ?? 'charly@bali-interns.com'
  const g = await getCalendarClient(p.refreshToken)
  if (!g) return { eventId: '', meetLink: '', cancelLink: '', htmlLink: '' }
  try {
    const res = await g.cal.events.insert({
      calendarId: calId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: p.summary,
        description: p.description,
        start: { dateTime: p.startDateTime, timeZone: 'Asia/Jakarta' },
        end: { dateTime: p.endDateTime, timeZone: 'Asia/Jakarta' },
        attendees: [
          { email: calId, organizer: true },
          { email: 'team@bali-interns.com' },
          { email: p.attendeeEmail, displayName: p.attendeeName },
        ],
        conferenceData: {
          createRequest: {
            requestId: 'si-' + Date.now(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 },
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    })
    const meetLink = (res.data.conferenceData?.entryPoints ?? []).find(e => e.entryPointType === 'video')?.uri ?? ''
    console.log('[GCal] event created:', res.data.id, 'meet:', meetLink?.slice(0, 40))
    return { eventId: res.data.id ?? '', meetLink, cancelLink: res.data.htmlLink ?? '', htmlLink: res.data.htmlLink ?? '' }
  } catch (err) {
    // Write full error to Supabase for debugging
    try {
      const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err as object))
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await sb.from('settings').upsert({ key: 'gcal_last_error', value: errStr.slice(0, 2000) })
      console.error('[GCal] ERR written to DB - first50:', errStr.slice(0, 50))
    } catch (e2) { console.error('[GCal] could not write error to DB', (e2 as Error).message) }
    return { eventId: '', meetLink: '', cancelLink: '', htmlLink: '' }
  }
}

// ── Lister les events à venir ──
export async function listUpcomingEvents(maxResults = 20) {
  const g = await getCalendarClient()
  if (!g) return []
  try {
    const res = await g.cal.events.list({
      calendarId: 'charly@bali-interns.com',
      timeMin: new Date().toISOString(),
      maxResults, singleEvents: true, orderBy: 'startTime',
    })
    return res.data.items ?? []
  } catch (err) {
    console.error('[GCal] list error:', err)
    return []
  }
}

export const googleAvailable = true
