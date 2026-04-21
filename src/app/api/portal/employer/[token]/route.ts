import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function detectVariant(company: Record<string, unknown>, signingContact: Record<string, unknown> | null): 'A' | 'B' | 'C' {
  const countryCode = (company.registration_country_code as string ?? '').toUpperCase()
  const country = (company.registration_country as string ?? '').toLowerCase()
  const isIndo = countryCode === 'ID' || country.includes('indonesia')
  if (!isIndo) return 'A'
  const nat = ((signingContact?.nationality as string) ?? '').toLowerCase()
  const isIndoDirector = nat.includes('indonesia') || nat.includes('indonesian')
  return isIndoDirector ? 'C' : 'B'
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = svc()
  const { token } = await params

  const { data: access, error } = await sb
    .from('employer_portal_access')
    .select('*, companies(*), contacts(id,first_name,last_name,email,whatsapp,job_title,nationality,date_of_birth,place_of_birth,id_type,id_number)')
    .eq('token', token)
    .limit(1)
    .maybeSingle()

  if (error || !access) {
    console.error('[employer-portal] token not found:', token, error?.message)
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  }
  if (!access.company_id) {
    console.error('[employer-portal] company_id null for token:', token)
    return NextResponse.json({ error: 'Configuration incomplète — contactez l\'équipe Sunny Interns' }, { status: 422 })
  }

  if (!access.viewed_at) {
    await sb.from('employer_portal_access')
      .update({ viewed_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
      .eq('token', token)
  }

  const company = access.companies as Record<string, unknown>

  // Get all contacts of the company
  const { data: companyContacts } = await sb
    .from('contacts')
    .select('id,first_name,last_name,job_title,email,whatsapp,nationality,date_of_birth,place_of_birth,id_type,id_number,is_legal_signatory')
    .eq('company_id', company.id as string)
    .order('is_primary', { ascending: false })

  // Get signing contact
  const signingContactId = access.signing_contact_id as string | null
  const signingContact = signingContactId
    ? (companyContacts?.find(c => c.id === signingContactId) ?? null)
    : (companyContacts?.[0] ?? null)

  // Auto-detect variant
  const variant = detectVariant(company, signingContact as Record<string, unknown> | null)
  const TEMPLATE_IDS: Record<string, string> = {
    A: '25ac4ac0-4f9a-487e-9c08-0546de0c389c',
    B: 'f13936c2-8c4a-4a7e-9504-b434a62ba63b',
    C: 'e4dc2c5f-b4d1-422f-a528-a60fa2355039',
  }

  // Get Bali Interns manager (assigned to case)
  let manager = null
  if (access.case_id) {
    const { data: caseData } = await sb
      .from('cases')
      .select('assigned_manager_name, interns(first_name,last_name,nationality,passport_number)')
      .eq('id', access.case_id)
      .single()

    if (caseData?.assigned_manager_name) {
      // Try to find manager in app_users
      const { data: appUser } = await sb
        .from('app_users')
        .select('full_name, email, whatsapp')
        .ilike('full_name', `%${caseData.assigned_manager_name}%`)
        .maybeSingle()
      if (appUser) {
        const parts = (appUser.full_name as string ?? '').split(' ')
        manager = { first_name: parts[0], last_name: parts.slice(1).join(' '), email: appUser.email, whatsapp: appUser.whatsapp }
      }
    }
    // Fallback: Sidney
    if (!manager) {
      manager = { first_name: 'Sidney', last_name: '', email: 'team@bali-interns.com', whatsapp: null }
    }

    // Get case info with intern
    const internRaw = caseData?.interns
    const internData = (Array.isArray(internRaw) ? internRaw[0] : internRaw) as Record<string, unknown> | null

    return NextResponse.json({
      access: { ...access, signing_contact_id: signingContactId },
      company_contacts: companyContacts ?? [],
      case: access.case_id ? { id: access.case_id, status: 'convention_signed', interns: internData } : null,
      manager,
      variant,
      template_id: TEMPLATE_IDS[variant],
      agreement_unlocked: !!(access.company_info_validated),
      contract_signed: !!(access.sponsor_contract_signed_at),
    })
  }

  return NextResponse.json({
    access,
    company_contacts: companyContacts ?? [],
    case: null,
    manager,
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
    .select('id, company_id, contact_id, case_id')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  // ── SIGN CONTRACT
  if (body.action === 'sign_contract') {
    const sigContactId = body.signing_contact_id as string | null
    let signedBy = ''

    if (sigContactId) {
      const { data: sc } = await sb.from('contacts').select('first_name,last_name,job_title').eq('id', sigContactId).single()
      signedBy = [sc?.first_name, sc?.last_name].filter(Boolean).join(' ')
      // Update signing_contact_id
      await sb.from('employer_portal_access').update({ signing_contact_id: sigContactId }).eq('token', token)
    }

    await sb.from('employer_portal_access').update({
      sponsor_contract_signed_at: new Date().toISOString(),
      sponsor_contract_signed_by: signedBy,
      sponsor_contract_signature_data: body.signature_data as string,
      last_active_at: new Date().toISOString(),
    }).eq('token', token)

    // Notify team
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const caseId = (access as Record<string, unknown>).case_id as string | null
      await resend.emails.send({
        from: 'Bali Interns <team@bali-interns.com>',
        to: ['sidney@bali-interns.com'],
        subject: `✅ Partnership Agreement signed — ${signedBy}`,
        html: `<p><strong>${signedBy}</strong> signed the Partnership Agreement.</p>${caseId ? `<p>Case: <a href="${process.env.NEXT_PUBLIC_APP_URL}/fr/cases/${caseId}">${caseId}</a></p>` : ''}`,
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  }

  // ── UPDATE COMPANY INFO
  const companyId = (access as Record<string, unknown>).company_id as string
  const allowed = ['name', 'description', 'website', 'address_street', 'address_postal_code', 'address_city',
    'nib', 'npwp', 'siret', 'vat_number', 'tax_id', 'registration_number',
    'legal_type', 'registration_country', 'registration_country_code']
  const upd: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) upd[k] = body[k]

  if (Object.keys(upd).length) {
    upd.info_validated_by_contact = true
    upd.info_validated_at = new Date().toISOString()
    await sb.from('companies').update(upd).eq('id', companyId)
    await sb.from('employer_portal_access').update({
      company_info_validated: true,
      company_info_validated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      signing_contact_id: body.signing_contact_id as string ?? null,
    }).eq('token', token)
  }

  return NextResponse.json({ success: true })
}
