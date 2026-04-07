import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { housingId, wantsScooter } = await req.json() as { housingId?: string; wantsScooter?: boolean }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseData, error: caseErr } = await supabase
    .from('cases')
    .select('id, intern_id')
    .eq('portal_token', token)
    .single()

  if (caseErr || !caseData) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  await supabase.from('cases').update({
    logement_scooter_formulaire: true,
    ...(housingId ? { housing_id: housingId } : {}),
  }).eq('id', caseData.id)

  if (caseData.intern_id && wantsScooter !== undefined) {
    await supabase.from('interns').update({ wants_scooter: wantsScooter }).eq('id', caseData.intern_id)
  }

  return NextResponse.json({ ok: true })
}
