import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select('id, interns(id)')
    .eq('portal_token', token)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

  const intern = caseData.interns as unknown as { id: string } | null
  if (!intern) return NextResponse.json({ error: 'Stagiaire introuvable' }, { status: 404 })

  const { data: affCode } = await supabase
    .from('affiliate_codes')
    .select('code, total_referred, total_paid, pending_payout, paid_out, commission_eur')
    .eq('intern_id', intern.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!affCode) return NextResponse.json(null)

  return NextResponse.json(affCode)
}
