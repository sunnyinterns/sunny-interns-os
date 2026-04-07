import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      interns (*),
      schools (name)
    `)
    .eq('portal_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  return NextResponse.json(data)
}
