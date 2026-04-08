import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function fillTemplate(html: string, data: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '')
  }
  return result
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as { caseId?: string; companyId?: string; preview?: boolean }

  // Load template
  const { data: template } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (!template?.html_content) {
    return NextResponse.json({ error: 'Template non trouvé ou vide' }, { status: 404 })
  }

  // Build variable data
  const vars: Record<string, string> = {}

  if (body.caseId) {
    const { data: caseData } = await supabase
      .from('cases')
      .select('*, interns(*), packages(name, price_eur)')
      .eq('id', body.caseId)
      .single()

    if (caseData) {
      const intern = caseData.interns as Record<string, unknown> | null
      vars.intern_name = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
      vars.intern_email = (intern?.email as string) ?? ''
      vars.intern_school = (caseData.schools as { name: string } | null)?.name ?? ''
      vars.intern_nationality = (intern?.nationality as string) ?? ''
      vars.intern_birth_date = (intern?.birth_date as string) ?? ''
      vars.intern_address = (intern?.intern_address as string) ?? ''
      vars.intern_signing_city = (intern?.intern_signing_city as string) ?? ''
      vars.intern_level = (intern?.intern_level as string) ?? ''
      vars.job_title = ''
      vars.company_name = ''
      vars.start_date = caseData.actual_start_date ?? caseData.desired_start_date ?? ''
      vars.end_date = caseData.actual_end_date ?? ''
      vars.duration_months = String(caseData.desired_duration_months ?? '')
      vars.amount = String(caseData.payment_amount ?? (caseData.packages as { price_eur: number } | null)?.price_eur ?? '')
      vars.amount_ht = vars.amount
      vars.tva = '0'
      vars.invoice_number = caseData.invoice_number ?? `BI-${new Date().getFullYear()}-${body.caseId.slice(0, 6)}`
      vars.invoice_date = new Date().toLocaleDateString('fr-FR')
      vars.package_name = (caseData.packages as { name: string } | null)?.name ?? ''

      // Get retained job
      const { data: subs } = await supabase
        .from('job_submissions')
        .select('jobs(title, public_title), companies:jobs(company_id)')
        .eq('case_id', body.caseId)
        .eq('status', 'retained')
        .limit(1)
      if (subs?.[0]) {
        const job = subs[0].jobs as { title?: string; public_title?: string } | null
        vars.job_title = job?.public_title ?? job?.title ?? ''
      }
    }
  }

  if (body.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', body.companyId)
      .single()
    if (company) {
      vars.company_name = company.name ?? ''
      vars.company_address = company.domiciliation ?? company.address ?? ''
    }
  }

  // Entity info from settings
  const { data: settings } = await supabase.from('settings').select('key, value')
  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  vars.entity_name = settingsMap.entity_name ?? 'Bali Interns Ltd'
  vars.entity_address = settingsMap.entity_address ?? ''
  vars.entity_iban = settingsMap.entity_iban ?? ''
  vars.entity_bic = settingsMap.entity_bic ?? ''
  vars.entity_registration = settingsMap.entity_registration ?? ''

  // Fill template
  const filledHtml = fillTemplate(template.html_content, vars)

  if (body.preview) {
    return new NextResponse(filledHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Generate PDF using the pdf-generator
  const { generatePdfFromHtml } = await import('@/lib/pdf-generator')
  const pdfBuffer = await generatePdfFromHtml(filledHtml)

  // Upload to storage
  const filename = `${template.type}-${body.caseId ?? body.companyId ?? 'preview'}-${Date.now()}.pdf`
  const bucket = template.type === 'facture' ? 'invoice-pdfs' : 'visa-documents'
  await supabase.storage.from(bucket).upload(filename, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename)

  // Record in generated_documents
  await supabase.from('generated_documents').insert({
    case_id: body.caseId ?? null,
    company_id: body.companyId ?? null,
    template_id: id,
    type: template.type,
    url: urlData.publicUrl,
    filename,
  })

  return NextResponse.json({ pdf_url: urlData.publicUrl, filename })
}
