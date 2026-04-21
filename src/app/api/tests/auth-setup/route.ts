import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SECRET = process.env.E2E_TEST_SECRET ?? 'e2e-sunny-interns-2026'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.redirect(new URL('/fr/feed', req.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ← ANON key, pas service_role
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const email = process.env.E2E_TEST_EMAIL ?? 'sidney.ruby@gmail.com'
  const password = process.env.E2E_TEST_PASSWORD ?? 'SunnyInterns2026!'

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[auth-setup] signInWithPassword error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  console.log('[auth-setup] Auth OK for', email)
  return response
}
