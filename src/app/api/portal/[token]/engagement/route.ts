import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json() as { agreed?: boolean; signature_data?: string }

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

  const update: Record<string, unknown> = {
    engagement_letter_sent: true,
    engagement_letter_signed_at: new Date().toISOString(),
  }
  if (body.signature_data) update.engagement_letter_signature_data = body.signature_data

  await supabase.from('cases').update(update).eq('id', caseData.id)

  return NextResponse.json({ ok: true })
}
