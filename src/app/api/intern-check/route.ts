import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  if (!email) return NextResponse.json({ exists: false })

  try {
    const { data } = await supabase
      .from('interns')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    return NextResponse.json({ exists: !!data })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
