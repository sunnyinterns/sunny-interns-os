// Exported calendar client factory — used by cancel/reschedule routes
export async function getCalendarClient(refreshToken?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const token = refreshToken ?? process.env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !token || clientId === 'placeholder' || token === 'placeholder') return null
  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: token })
    const cal = google.calendar({ version: 'v3', auth })
    return { cal, auth }
  } catch { return null }
}
