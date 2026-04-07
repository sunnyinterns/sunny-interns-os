import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (caseErr || !caseData) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  await supabase.from('cases').update({ engagement_letter_sent: true }).eq('id', caseData.id)

  return NextResponse.json({ ok: true })
}
