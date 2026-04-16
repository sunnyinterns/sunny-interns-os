import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function fillTemplate(html: string, data: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '')
  }
  // Remove any unfilled {{variables}} so they don't show in final doc
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  return result
}

function ld(obj: Record<string, unknown> | null, key: string): string {
  return (obj?.[key] as string) ?? ''
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json() as {
    caseId?: string; companyId?: string; preview?: boolean
    portalToken?: string // employer portal context
  }

  // Auth: admin route OR portal token (no user session needed from employer portal)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const svc = serviceClient()

  // If called from employer portal (no admin session), use service client
  const db = user ? supabase : svc

  // Load template
  const { data: template } = await svc
    .from('contract_templates').select('*').eq('id', id).single()
  if (!template?.html_content) {
    return NextResponse.json({ error: 'Template not found or empty' }, { status: 404 })
  }

  const vars: Record<string, string> = {}

  // ── 1. SPONSOR (always load active sponsor) ─────────────────────────────
  const { data: sponsor } = await svc
    .from('sponsors').select('*').eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).single()

  if (sponsor) {
    const legal = sponsor.legal_details as Record<string, unknown> | null
    vars.sponsor_name         = sponsor.company_name ?? ''
    vars.sponsor_legal_type   = sponsor.legal_type ?? 'PT'
    vars.sponsor_registration = sponsor.registration_number ?? ''
    vars.sponsor_nib          = sponsor.nib ?? ''
    vars.sponsor_npwp         = sponsor.npwp ?? ''
    vars.sponsor_city         = sponsor.city ?? 'Denpasar'
    vars.sponsor_address      = [sponsor.address, sponsor.city, sponsor.country].filter(Boolean).join(', ')
    vars.sponsor_contact_name = ld(legal, 'director_name') || sponsor.contact_name || ''
    vars.sponsor_contact_role = sponsor.contact_role ?? 'Direktur Utama / Main Director'
    vars.sponsor_contact_email= sponsor.contact_email ?? ''
    vars.sponsor_signature_url= sponsor.signature_url ?? ''
    // Legal details
    vars.sponsor_director_name        = ld(legal, 'director_name') || sponsor.contact_name || ''
    vars.sponsor_director_nationality = ld(legal, 'director_nationality') || 'Indonesian'
    vars.sponsor_director_dob         = ld(legal, 'director_dob')
    vars.sponsor_director_dob_place   = ld(legal, 'director_dob_place')
    vars.sponsor_director_id_number   = ld(legal, 'director_id_number')
    vars.sponsor_notary_name          = ld(legal, 'notary_name')
    vars.sponsor_deed_number          = ld(legal, 'deed_number')
    vars.sponsor_deed_date            = ld(legal, 'deed_date')
    vars.sponsor_ahu_number           = ld(legal, 'ahu_number')
    vars.sponsor_ahu_date             = ld(legal, 'ahu_date')
  }

  // ── 2. EMPLOYER PORTAL CONTEXT (portalToken) ────────────────────────────
  let resolvedCaseId = body.caseId
  let resolvedCompanyId = body.companyId

  if (body.portalToken && !resolvedCaseId) {
    // Find case via employer access token
    const { data: access } = await svc
      .from('employer_access')
      .select('case_id, company_id')
      .eq('token', body.portalToken).single()
    if (access) {
      resolvedCaseId = access.case_id ?? undefined
      resolvedCompanyId = access.company_id ?? undefined
    }
  }

  // ── 3. CASE DATA (intern + job + company) ───────────────────────────────
  if (resolvedCaseId) {
    const { data: caseData } = await svc
      .from('cases')
      .select('*, interns(*), packages(name, price_eur), schools(name)')
      .eq('id', resolvedCaseId).single()

    if (caseData) {
      const intern = caseData.interns as Record<string, unknown> | null
      const fullName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
      vars.intern_name          = fullName
      vars.intern_full_name     = fullName
      vars.intern_email         = (intern?.email as string) ?? ''
      vars.intern_nationality   = (intern?.nationality as string) ?? ''
      vars.intern_birth_date    = (intern?.birth_date as string) ?? ''
      vars.intern_address       = (intern?.intern_address as string) ?? ''
      vars.intern_signing_city  = (intern?.intern_signing_city as string) ?? 'Bali'
      vars.intern_level         = (intern?.intern_level as string) ?? ''
      vars.intern_passport      = (intern?.passport_number as string) ?? ''
      vars.intern_school        = (caseData.schools as { name: string } | null)?.name ?? ''
      vars.start_date           = caseData.actual_start_date ?? caseData.desired_start_date ?? ''
      vars.end_date             = caseData.actual_end_date ?? ''
      vars.duration_months      = String(caseData.desired_duration_months ?? '')
      vars.amount               = String(caseData.payment_amount ?? (caseData.packages as { price_eur: number } | null)?.price_eur ?? '')
      vars.amount_ht            = vars.amount
      vars.tva                  = '0'
      vars.invoice_number       = (caseData as Record<string, unknown>).invoice_number as string ?? `SI-${new Date().getFullYear()}-${resolvedCaseId.slice(0, 6).toUpperCase()}`
      vars.invoice_date         = new Date().toLocaleDateString('fr-FR')
      vars.package_name         = (caseData.packages as { name: string } | null)?.name ?? ''

      // Retained job + host company
      const { data: subs } = await svc
        .from('job_submissions')
        .select('*, jobs(*, companies(*))')
        .eq('case_id', resolvedCaseId)
        .eq('status', 'retained')
        .limit(1)

      if (subs?.[0]) {
        const job = subs[0].jobs as Record<string, unknown> | null
        const company = job?.companies as Record<string, unknown> | null
        vars.job_title       = (job?.public_title as string) ?? (job?.title as string) ?? ''
        vars.job_description = (job?.description as string) ?? ''
        vars.job_location    = (job?.location as string) ?? ''
        // Missions from job description (split by newline or bullet)
        const desc = (job?.description as string) ?? ''
        const missions = desc.split(/\n|•|-/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 5)
        vars.missions_html = missions.length
          ? `<ul>${missions.map(m => `<li>${m}</li>`).join('')}</ul>`
          : ''
        // Host company
        if (company && !resolvedCompanyId) resolvedCompanyId = company.id as string
        if (company) {
          const compLegal = company.legal_details as Record<string, unknown> | null
          vars.company_name        = (company.name as string) ?? ''
          vars.company_legal_type  = (company.legal_type as string) ?? ''
          vars.company_nib         = (company.nib as string) ?? ''
          vars.company_npwp        = (company.npwp as string) ?? ''
          vars.company_city        = (company.city as string) ?? ''
          vars.company_address     = (company.domiciliation as string) ?? (company.address as string) ?? ''
          vars.company_director_name        = ld(compLegal, 'director_name') || (company.contact_name as string) || ''
          vars.company_director_nationality = ld(compLegal, 'director_nationality')
          vars.company_director_dob         = ld(compLegal, 'director_dob')
          vars.company_director_dob_place   = ld(compLegal, 'director_dob_place')
          vars.company_director_id_number   = ld(compLegal, 'director_id_number')
          vars.company_notary_name          = ld(compLegal, 'notary_name')
          vars.company_deed_number          = ld(compLegal, 'deed_number')
          vars.company_deed_date            = ld(compLegal, 'deed_date')
          vars.company_ahu_number           = ld(compLegal, 'ahu_number')
          vars.company_ahu_date             = ld(compLegal, 'ahu_date')
        }
      }
    }
  }

  // ── 4. COMPANY (direct lookup if no case) ───────────────────────────────
  if (resolvedCompanyId && !vars.company_name) {
    const { data: company } = await svc
      .from('companies').select('*').eq('id', resolvedCompanyId).single()
    if (company) {
      const compLegal = (company as Record<string, unknown>).legal_details as Record<string, unknown> | null
      vars.company_name       = company.name ?? ''
      vars.company_legal_type = company.legal_type ?? ''
      vars.company_nib        = company.nib ?? ''
      vars.company_npwp       = company.npwp ?? ''
      vars.company_city       = company.city ?? ''
      vars.company_address    = company.domiciliation ?? company.address ?? ''
      vars.company_director_name        = ld(compLegal, 'director_name') || company.contact_name || ''
      vars.company_director_nationality = ld(compLegal, 'director_nationality')
      vars.company_director_dob         = ld(compLegal, 'director_dob')
      vars.company_director_dob_place   = ld(compLegal, 'director_dob_place')
      vars.company_director_id_number   = ld(compLegal, 'director_id_number')
      vars.company_notary_name          = ld(compLegal, 'notary_name')
      vars.company_deed_number          = ld(compLegal, 'deed_number')
      vars.company_deed_date            = ld(compLegal, 'deed_date')
      vars.company_ahu_number           = ld(compLegal, 'ahu_number')
      vars.company_ahu_date             = ld(compLegal, 'ahu_date')
    }
  }

  // ── 5. ENTITY SETTINGS ──────────────────────────────────────────────────
  const { data: settings } = await svc.from('settings').select('key, value')
  const sm = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  vars.entity_name         = sm.entity_name ?? 'Sunny Interns'
  vars.entity_address      = sm.entity_address ?? ''
  vars.entity_iban         = sm.entity_iban ?? ''
  vars.entity_bic          = sm.entity_bic ?? ''
  vars.entity_registration = sm.entity_registration ?? ''

  // ── 6. DATE & SIGNING FIELDS ────────────────────────────────────────────
  const today = new Date()
  vars.agreement_date  = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  vars.signing_date    = vars.agreement_date
  vars.signing_city    = vars.intern_signing_city || 'Bali, Indonesia'
  vars.invoice_date    = vars.invoice_date || today.toLocaleDateString('fr-FR')

  // Fill & return
  const filledHtml = fillTemplate(template.html_content, vars)

  if (body.preview) {
    return new NextResponse(filledHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Generate PDF
  const { generatePdfFromHtml } = await import('@/lib/pdf-generator')
  const pdfBuffer = await generatePdfFromHtml(filledHtml)
  const filename = `${template.type}-${resolvedCaseId ?? resolvedCompanyId ?? 'doc'}-${Date.now()}.pdf`
  const bucket = template.type === 'facture' ? 'invoice-pdfs' : 'visa-documents'
  await svc.storage.from(bucket).upload(filename, pdfBuffer, { contentType: 'application/pdf', upsert: true })
  const { data: urlData } = svc.storage.from(bucket).getPublicUrl(filename)
  await svc.from('generated_documents').insert({
    case_id: resolvedCaseId ?? null,
    company_id: resolvedCompanyId ?? null,
    template_id: id, type: template.type,
    url: urlData.publicUrl, filename,
  })
  return NextResponse.json({ pdf_url: urlData.publicUrl, filename })
}
