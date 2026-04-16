import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Auto-detect partnership agreement variant based on company + director data
function detectVariant(company: Record<string, unknown>): 'A' | 'B' | 'C' {
  const legal = company.legal_details as Record<string, unknown> | null
  const directorNationality = (ld(legal, 'director_nationality') || '').toLowerCase()
  const legalType = ((company.legal_type as string) || '').toUpperCase()
  const country = ((company.country as string) || '').toLowerCase()

  const isIndonesianCompany = country === 'indonesia' || legalType === 'PT' || legalType === 'CV'
  const isIndonesianDirector = directorNationality.includes('indonesian') || directorNationality.includes('indonesia')

  if (!isIndonesianCompany) return 'A' // Foreign company → no KTP, no NIB
  if (!isIndonesianDirector) return 'B' // Indonesian company + foreign director → NIB, no KTP
  return 'C' // Indonesian company + Indonesian director → full KTP + deed
}

function ld(obj: Record<string, unknown> | null, key: string): string {
  return (obj?.[key] as string) ?? ''
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = svc()
  const { token } = await params

  const { data: access, error: accessError } = await sb
    .from('employer_portal_access')
    .select(`
      *,
      companies(*),
      contacts(id, first_name, last_name, email, whatsapp, job_title)
    `)
    .eq('token', token)
    .single()

  if (accessError || !access) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  // Mark as viewed
  if (!access.viewed_at) {
    await sb.from('employer_portal_access')
      .update({ viewed_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
      .eq('token', token)
  }

  // Auto-detect variant + inject template_id
  const company = access.companies as Record<string, unknown>
  const variant = detectVariant(company)
  const TEMPLATE_IDS = {
    A: '25ac4ac0-4f9a-487e-9c08-0546de0c389c',
    B: 'f13936c2-8c4a-4a7e-9504-b434a62ba63b',
    C: 'e4dc2c5f-b4d1-422f-a528-a60fa2355039',
  }

  // Fetch case + intern info (for Mission Letter)
  let caseInfo = null
  if (access.case_id) {
    const { data: c } = await sb
      .from('cases')
      .select('id, status, interns(first_name, last_name, nationality, passport_number)')
      .eq('id', access.case_id)
      .single()
    caseInfo = c
  }

  // Fetch the retained job for this case
  let jobInfo = null
  if (access.case_id) {
    const { data: subs } = await sb
      .from('job_submissions')
      .select('jobs(id, public_title, title, description, location, wished_duration_months)')
      .eq('case_id', access.case_id)
      .eq('status', 'retained')
      .limit(1)
    if (subs?.[0]) jobInfo = (subs[0] as Record<string, unknown>).jobs
  }

  return NextResponse.json({
    access,
    jobs: jobInfo ? [jobInfo] : [],
    case: caseInfo,
    variant,
    template_id: TEMPLATE_IDS[variant],
    agreement_unlocked: !!(access.company_info_validated),
    contract_signed: !!(access.sponsor_contract_signed_at),
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = svc()
  const { token } = await params
  const body = await request.json() as Record<string, unknown>

  const { data: access } = await sb
    .from('employer_portal_access')
    .select('id, company_id, contact_id, case_id, contacts(first_name, last_name, email)')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  // ── SIGN CONTRACT ────────────────────────────────────────────────────────
  if (body.action === 'sign_contract') {
    const contact = (access as Record<string, unknown>).contacts as { first_name?: string; last_name?: string } | null
    const signedBy = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ')

    await sb.from('employer_portal_access').update({
      sponsor_contract_signed_at: new Date().toISOString(),
      sponsor_contract_signed_by: signedBy,
      sponsor_contract_signature_data: body.signature_data as string,
      last_active_at: new Date().toISOString(),
    }).eq('token', token)

    // Notify manager
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const caseId = (access as Record<string, unknown>).case_id as string | null
      await resend.emails.send({
        from: 'Sunny Interns <team@bali-interns.com>',
        to: ['charly@bali-interns.com', 'sidney@bali-interns.com'],
        subject: `✅ Partnership Agreement signé — ${signedBy}`,
        html: `<p><strong>${signedBy}</strong> a signé le Partnership Agreement.</p>${caseId ? `<p>Case: <a href="https://sunny-interns-os.vercel.app/fr/cases/${caseId}">${caseId}</a></p>` : ''}`,
      })
    } catch { /* email failure non-bloquant */ }

    return NextResponse.json({ success: true })
  }

  // ── UPDATE COMPANY INFO ──────────────────────────────────────────────────
  const allowed = ['name', 'description', 'website', 'address_street', 'address_postal_code', 'address_city', 'nib', 'npwp', 'siret']
  const upd: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) upd[k] = body[k]

  if (Object.keys(upd).length) {
    upd.info_validated_by_contact = true
    upd.info_validated_at = new Date().toISOString()
    await sb.from('companies').update(upd).eq('id', (access as unknown as Record<string, string>).company_id)
    await sb.from('employer_portal_access').update({
      company_info_validated: true,
      company_info_validated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    }).eq('token', token)
  }

  return NextResponse.json({ success: true })
}
