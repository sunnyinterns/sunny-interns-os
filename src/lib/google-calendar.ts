// Google Calendar integration
// Falls back gracefully if credentials are not configured

let googleAvailable = false

async function getGoogleCalendar() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken ||
      clientId === 'placeholder' || refreshToken === 'placeholder') {
    return null
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: refreshToken })
    const cal = google.calendar({ version: 'v3', auth })
    googleAvailable = true
    return { cal, auth }
  } catch {
    return null
  }
}

export async function createMeetEvent(p: {
  summary: string
  description?: string
  startDateTime: string
  endDateTime: string
  attendeeEmail: string
  attendeeName: string
}) {
  const g = await getGoogleCalendar()
  if (!g) {
    return {
      eventId: 'fillout-' + Date.now(),
      meetLink: '',
      cancelLink: '',
      htmlLink: '',
    }
  }
  try {
    const res = await g.cal.events.insert({
      calendarId: 'charly@bali-interns.com',
      conferenceDataVersion: 1,
      requestBody: {
        summary: p.summary,
        description: p.description,
        start: { dateTime: p.startDateTime, timeZone: 'Asia/Jakarta' },
        end: { dateTime: p.endDateTime, timeZone: 'Asia/Jakarta' },
        attendees: [
          { email: 'charly@bali-interns.com', organizer: true },
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
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      },
    })
    const meetLink = (res.data.conferenceData?.entryPoints ?? []).find(
      (e) => e.entryPointType === 'video'
    )?.uri ?? ''
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

export async function listUpcomingEvents(maxResults = 20) {
  const g = await getGoogleCalendar()
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

export { googleAvailable }
