import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' })
    })
    const d = await r.json() as { access_token?: string }
    return d.access_token ?? null
  } catch { return null }
}

async function fetchCalendarEvents(accessToken: string, calendarId: string) {
  const now = new Date().toISOString()
  const future = new Date(Date.now() + 60 * 86400000).toISOString()
  
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now}&timeMax=${future}&maxResults=50&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!r.ok) return []
  const d = await r.json() as { items?: GoogleCalendarEvent[] }
  return d.items ?? []
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  hangoutLink?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
  organizer?: { email: string }
  htmlLink?: string
}

// POST: Sync Google Calendar → DB
export async function POST() {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google credentials configured' }, { status: 503 })
  }

  const supabase = getServiceClient()
  const calendars = ['charly@bali-interns.com', 'team@bali-interns.com']
  let totalSynced = 0

  for (const calId of calendars) {
    const events = await fetchCalendarEvents(accessToken, calId)
    
    for (const ev of events) {
      const candidateAttendee = ev.attendees?.find(
        a => !['charly@bali-interns.com', 'team@bali-interns.com', 'bali-interns.com'].some(
          domain => a.email?.includes(domain)
        ) && !a.self
      )
      const summaryNameMatch = ev.summary?.match(/Team Bali Interns and (.+)/i)
      const rescheduleMatch = ev.description?.match(/Cancel or reschedule: (https:\/\/\S+)/i)

      await supabase.from('calendar_events').upsert({
        id: ev.id,
        google_calendar_id: calId,
        summary: ev.summary ?? null,
        description: ev.description ?? null,
        status: ev.status ?? 'confirmed',
        start_datetime: ev.start?.dateTime ?? ev.start?.date ?? null,
        end_datetime: ev.end?.dateTime ?? ev.end?.date ?? null,
        meet_link: ev.hangoutLink ?? null,
        cancel_reschedule_link: rescheduleMatch?.[1] ?? null,
        intern_email: candidateAttendee?.email ?? null,
        intern_name: candidateAttendee?.displayName?.trim() ?? summaryNameMatch?.[1]?.trim() ?? null,
        my_response_status: ev.attendees?.find(a => a.self)?.responseStatus ?? null,
        html_link: ev.htmlLink ?? null,
        organizer_email: ev.organizer?.email ?? calId,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' }).then(null, () => null)
      
      totalSynced++
    }
  }

  return NextResponse.json({ ok: true, synced: totalSynced, calendars })
}

// GET: Retourner les events depuis la DB  
export async function GET() {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('status', 'confirmed')
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime', { ascending: true })
    .limit(30)
  return NextResponse.json(data ?? [])
}
