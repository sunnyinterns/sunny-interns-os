import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) return NextResponse.redirect(`${origin}/fr/login?error=no_code`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/fr/login?error=${error?.message ?? 'no_session'}`)
  }

  // Save Google refresh token to scheduling_managers for Calendar sync
  const providerToken = data.session.provider_refresh_token
  const userEmail = data.session.user?.email

  if (providerToken && userEmail) {
    const admin = createAdminClient()
    const { data: manager } = await admin
      .from('scheduling_managers')
      .select('id')
      .ilike('email', userEmail)
      .single()

    if (manager) {
      await admin
        .from('scheduling_managers')
        .update({ google_refresh_token: providerToken })
        .eq('id', manager.id)
      console.log(`[callback] ✅ Google refresh token saved for ${userEmail}`)
    } else {
      // Create new manager if email not found
      await admin.from('scheduling_managers').insert({
        name: data.session.user?.user_metadata?.full_name ?? userEmail,
        email: userEmail,
        calendar_id: userEmail,
        google_refresh_token: providerToken,
        is_active: true,
        priority: 3,
        work_days: [1, 2, 3, 4, 5],
        work_start_hour: 9,
        work_end_hour: 18,
        timezone: 'Asia/Makassar',
      })
      console.log(`[callback] ✅ New manager created for ${userEmail}`)
    }
  }

  return NextResponse.redirect(`${origin}/fr/feed`)
}
