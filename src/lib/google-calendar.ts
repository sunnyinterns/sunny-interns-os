// Google Calendar integration — Sunny Interns OS
// Supports: single manager (env vars) + multi-manager (scheduling_managers table tokens)

async function getCalendarClient(refreshToken?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const token = refreshToken ?? process.env.GOOGLE_REFRESH_TOKEN
  console.log('[GCal] clientId:', clientId?.slice(0,20), '| secret:', clientSecret?.slice(0,8), '| tokenLen:', token?.length, '| tokenStart:', token?.slice(0,10))

  if (!clientId || !clientSecret || !token ||
      clientId === 'placeholder' || token === 'placeholder') {
    return null
  }
  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: token })
    const cal = google.calendar({ version: 'v3', auth })
    return { cal, auth, google }
  } catch {
    return null
  }
}

// ── Freebusy check — retourne les plages occupées pour un calendrier ──
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
        timeMin,
        timeMax,
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

// ── Générer les créneaux disponibles pour un manager sur N jours ──
export function generateSlots(params: {
  startDate: Date
  days: number
  durationMin: number
  bufferBeforeMin: number
  bufferAfterMin: number
  workDays: number[] // 0=sun, 1=mon...
  workStartHour: number
  workEndHour: number
  minNoticeMs: number
  busyPeriods: { start: string; end: string }[]
}): { start: string; end: string }[] {
  const {
    startDate, days, durationMin, bufferBeforeMin, bufferAfterMin,
    workDays, workStartHour, workEndHour, minNoticeMs, busyPeriods,
  } = params

  const slots: { start: string; end: string }[] = []
  const slotStepMin = 30 // slots toutes les 30 min
  const totalDuration = bufferBeforeMin + durationMin + bufferAfterMin
  const now = Date.now()

  for (let d = 0; d < days; d++) {
    const day = new Date(startDate)
    day.setDate(day.getDate() + d)
    const dow = day.getDay()
    if (!workDays.includes(dow)) continue

    for (let h = workStartHour; h < workEndHour; h++) {
      for (let m = 0; m < 60; m += slotStepMin) {
        const totalEndMins = h * 60 + m + totalDuration
        if (totalEndMins > workEndHour * 60) continue

        // Heure slot en UTC (WITA = UTC+8)
        const slotStart = new Date(day)
        slotStart.setHours(h - 8, m, 0, 0) // WITA→UTC (approx, ignores DST)
        // Actually use a proper approach: set date in WITA
        const slotStartWITA = new Date(
          `${day.toISOString().slice(0, 10)}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+08:00`
        )
        const slotEndWITA = new Date(slotStartWITA.getTime() + (bufferBeforeMin + durationMin + bufferAfterMin) * 60000)
        // Actual event start (after buffer)
        const eventStart = new Date(slotStartWITA.getTime() + bufferBeforeMin * 60000)
        const eventEnd = new Date(eventStart.getTime() + durationMin * 60000)

        // Notice minimum
        if (slotStartWITA.getTime() - now < minNoticeMs) continue

        // Check against busy periods (with buffers)
        const blockedStart = new Date(slotStartWITA.getTime())
        const blockedEnd = slotEndWITA
        const isBlocked = busyPeriods.some(b => {
          const bStart = new Date(b.start)
          const bEnd = new Date(b.end)
          return blockedStart < bEnd && blockedEnd > bStart
        })
        if (isBlocked) continue

        slots.push({
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
        })
      }
    }
  }
  return slots
}

// ── Créer un event Google Calendar avec Google Meet ──
export async function createMeetEvent(p: {
  summary: string
  description?: string
  startDateTime: string
  endDateTime: string
  attendeeEmail: string
  attendeeName: string
  calendarId?: string
  refreshToken?: string
}) {
  const calId = p.calendarId ?? 'charly@bali-interns.com'
  const g = await getCalendarClient(p.refreshToken)
  if (!g) {
    return { eventId: 'mock-' + Date.now(), meetLink: '', cancelLink: '', htmlLink: '' }
  }
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
            { method: 'email', minutes: 1440 }, // J-1
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    })
    const meetLink = (res.data.conferenceData?.entryPoints ?? []).find(e => e.entryPointType === 'video')?.uri ?? ''
    return {
      eventId: res.data.id ?? '',
      meetLink,
      cancelLink: res.data.htmlLink ?? '',
      htmlLink: res.data.htmlLink ?? '',
    }
  } catch (err) {
    console.error('[GCal] createMeetEvent error:', err)
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
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })
    return res.data.items ?? []
  } catch (err) {
    console.error('[GCal] listUpcomingEvents error:', err)
    return []
  }
}

export const googleAvailable = true
