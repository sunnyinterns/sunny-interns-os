import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origin = request.nextUrl.origin
  if (!code) return NextResponse.redirect(`${origin}/fr/login?error=no_code`)
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/fr/login?error=${error.message}`)
  return NextResponse.redirect(`${origin}/fr/feed`)
}
