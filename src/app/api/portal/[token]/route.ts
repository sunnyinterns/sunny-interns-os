import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Step 1: fetch case
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('portal_token', token)
    .single()

  if (caseError || !caseData) {
    console.error('[portal] case not found for token:', token, caseError?.message)
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  // Step 2: fetch intern
  const { data: internData } = await supabase
    .from('interns')
    .select('*')
    .eq('id', caseData.intern_id)
    .single()

  // Step 3: fetch billing company
  const { data: billingData } = caseData.billing_company_id
    ? await supabase.from('billing_companies').select('id, name, legal_form, currency, bank_iban, bank_bic, bank_name, stripe_link').eq('id', caseData.billing_company_id).single()
    : { data: null }

  // Step 4: fetch job submissions with jobs
  const { data: submissions } = await supabase
    .from('job_submissions')
    .select(`id, status, intern_priority, jobs (id, public_title, title, companies (id, name, website))`)
    .eq('case_id', caseData.id)

  const result = {
    ...caseData,
    interns: internData ?? null,
    billing_companies: billingData ?? null,
    job_submissions: submissions ?? [],
  }

  console.log('[portal] case loaded ok, status:', caseData.status)
  return NextResponse.json(result)
}
