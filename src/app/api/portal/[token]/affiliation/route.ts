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
    .select('id, interns(id, referral_iban, referral_bic)')
    .eq('portal_token', token)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

  const intern = caseData.interns as unknown as { id: string; referral_iban?: string | null; referral_bic?: string | null } | null
  if (!intern) return NextResponse.json({ error: 'Stagiaire introuvable' }, { status: 404 })

  const { data: affCode } = await supabase
    .from('affiliate_codes')
    .select('code, total_referred, total_paid, pending_payout, paid_out, commission_eur')
    .eq('intern_id', intern.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!affCode) return NextResponse.json(null)

  // Get referrals (cases where referred_by_code matches this code)
  const { data: referrals } = await supabase
    .from('interns')
    .select('id, first_name, last_name, cases(status, created_at)')
    .eq('referred_by_code', affCode.code as string)
    .order('created_at', { ascending: false })

  const referralsList = (referrals ?? []).map((r) => {
    const caseArr = r.cases as unknown as Array<{ status: string; created_at: string }> | null
    const latestCase = Array.isArray(caseArr) ? caseArr[0] : (caseArr as { status: string; created_at: string } | null)
    return {
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      created_at: latestCase?.created_at ?? '',
      status: latestCase?.status === 'payment_received' || latestCase?.status === 'active' || latestCase?.status === 'alumni' ? 'paid'
        : (latestCase?.status === 'convention_signed' || latestCase?.status === 'payment_pending') ? 'client'
        : 'in_process',
    }
  })

  return NextResponse.json({
    ...affCode,
    referral_iban: intern.referral_iban ?? null,
    referral_bic: intern.referral_bic ?? null,
    referrals: referralsList,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getServiceClient()
  const body = await req.json() as { iban?: string; bic?: string }

  const { data: caseData } = await supabase
    .from('cases')
    .select('id, interns(id)')
    .eq('portal_token', token)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  const intern = caseData.interns as unknown as { id: string } | null
  if (!intern) return NextResponse.json({ error: 'Stagiaire introuvable' }, { status: 404 })

  const { error } = await supabase
    .from('interns')
    .update({
      referral_iban: body.iban?.trim() ?? null,
      referral_bic: body.bic?.trim() ?? null,
    })
    .eq('id', intern.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
