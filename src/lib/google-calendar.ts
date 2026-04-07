import { google } from 'googleapis'

function getAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder') return null
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

export async function createMeetEvent(p: {
  summary: string
  description?: string
  startDateTime: string
  endDateTime: string
  attendeeEmail: string
  attendeeName: string
}) {
  const auth = getAuth()
  if (!auth) {
    return {
      eventId: 'mock-' + Date.now(),
      meetLink: 'https://meet.google.com/mock-' + Math.random().toString(36).substr(2, 9),
      cancelLink: '',
      htmlLink: '',
    }
  }
  const cal = google.calendar({ version: 'v3', auth })
  const res = await cal.events.insert({
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
  const meetLink =
    (res.data.conferenceData?.entryPoints ?? []).find(
      (e) => e.entryPointType === 'video'
    )?.uri ?? ''
  return {
    eventId: res.data.id ?? '',
    meetLink,
    cancelLink: res.data.htmlLink ?? '',
    htmlLink: res.data.htmlLink ?? '',
  }
}

export async function listUpcomingEvents(maxResults = 20) {
  const auth = getAuth()
  if (!auth) return []
  const cal = google.calendar({ version: 'v3', auth })
  const res = await cal.events.list({
    calendarId: 'charly@bali-interns.com',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items ?? []
}
