import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function generateInvoiceHtml(data: {
  entity: Record<string, unknown>
  intern: Record<string, unknown>
  billing: Record<string, unknown>
  caseData: Record<string, unknown>
}): Promise<string> {
  const { entity, intern, billing, caseData } = data

  const invoiceNumber = String(caseData.invoice_number ?? `INV-${Date.now()}`)
  const invoiceDate = billing.paid_at
    ? new Date(String(billing.paid_at)).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')

  const amountHT = Number(billing.amount_ht ?? (Number(billing.amount_ttc ?? 0) / 1.20).toFixed(2))
  const amountTVA = Number(billing.amount_tva ?? (Number(billing.amount_ttc ?? 0) - amountHT).toFixed(2))
  const amountTTC = Number(billing.amount_ttc ?? 0)

  const packageName = String(billing.package_name ?? 'Service de placement de stage à Bali')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1918; background: white; padding: 48px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo { font-size: 24px; font-weight: 800; color: #c8a96e; letter-spacing: -0.5px; }
    .logo span { color: #1a1918; }
    .invoice-label { font-size: 28px; font-weight: 300; color: #9ca3af; }
    .meta { display: flex; gap: 48px; margin-bottom: 40px; }
    .meta-block { flex: 1; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
    .meta-value { font-size: 13px; color: #1a1918; line-height: 1.5; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; padding: 8px 12px; background: #fafaf7; }
    td { padding: 14px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-row.total { font-weight: 700; font-size: 16px; border-top: 1.5px solid #1a1918; padding-top: 12px; margin-top: 6px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 32px; }
    .footer-block { flex: 1; }
    .badge { display: inline-block; padding: 4px 10px; background: #d1fae5; color: #065f46; border-radius: 4px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Sunny<span>Interns</span></div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">Formerly Bali Interns</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-label">FACTURE</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">${invoiceNumber}</div>
      <div style="font-size:13px;color:#6b7280">${invoiceDate}</div>
      <div class="badge" style="margin-top:8px">Payée</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Émetteur</div>
      <div class="meta-value">
        <strong>${String(entity.name ?? '')}</strong><br/>
        ${String(entity.address ?? '')}<br/>
        ${String(entity.country ?? '')}<br/>
        ${entity.registration_number ? `SIRET : ${String(entity.registration_number)}<br/>` : ''}
        ${entity.vat_number ? `TVA : ${String(entity.vat_number)}` : ''}
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Client</div>
      <div class="meta-value">
        <strong>${String(intern.first_name ?? '')} ${String(intern.last_name ?? '')}</strong><br/>
        ${String(intern.email ?? '')}<br/>
        ${String(intern.nationality ?? '')}
      </div>
    </div>
  </div>

  <hr class="divider"/>

  <table>
    <thead>
      <tr>
        <th>Prestation</th>
        <th style="text-align:right">Montant HT</th>
        <th style="text-align:right">TVA 20%</th>
        <th style="text-align:right">TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${packageName}</td>
        <td style="text-align:right">${amountHT.toFixed(2)} €</td>
        <td style="text-align:right">${amountTVA.toFixed(2)} €</td>
        <td style="text-align:right"><strong>${amountTTC.toFixed(2)} €</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Sous-total HT</span><span>${amountHT.toFixed(2)} €</span></div>
      <div class="totals-row"><span>TVA (20%)</span><span>${amountTVA.toFixed(2)} €</span></div>
      <div class="totals-row total"><span>Total TTC</span><span>${amountTTC.toFixed(2)} €</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-block">
      <div class="meta-label">Coordonnées bancaires</div>
      <div class="meta-value" style="margin-top:4px">
        ${entity.bank_name ? `Banque : ${String(entity.bank_name)}<br/>` : ''}
        ${entity.iban ? `IBAN : ${String(entity.iban)}<br/>` : ''}
        ${entity.bic ? `BIC : ${String(entity.bic)}` : ''}
      </div>
    </div>
    <div class="footer-block">
      <div class="meta-label">Mentions légales</div>
      <div class="meta-value" style="margin-top:4px;color:#9ca3af;font-size:11px">
        Paiement reçu. TVA non applicable si auto-entrepreneur, Art. 293 B du CGI.<br/>
        Facture émise conformément aux conditions générales de service.
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params

  // Auth check — allow portal token access too
  const url = new URL(request.url)
  const portalToken = url.searchParams.get('portal_token')

  let supabase
  if (portalToken) {
    supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Verify portal token matches case
    const { data: c } = await supabase.from('cases').select('id').eq('id', caseId).eq('portal_token', portalToken).maybeSingle()
    if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } else {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch case data
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*, interns(*)')
    .eq('id', caseId)
    .single()

  if (caseError || !caseData) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  // Fetch billing
  const { data: billing } = await supabase
    .from('billing')
    .select('*, billing_entities(*)')
    .eq('case_id', caseId)
    .maybeSingle()

  if (!billing?.paid_at && !url.searchParams.get('force')) {
    return NextResponse.json({ error: 'Paiement non confirmé — facture non disponible' }, { status: 403 })
  }

  // Get billing entity
  let entity: Record<string, unknown> = {}
  if (billing?.billing_entities) {
    entity = billing.billing_entities as Record<string, unknown>
  } else {
    // Fallback to default entity
    const { data: defaultEntity } = await supabase
      .from('billing_entities')
      .select('*')
      .eq('is_default', true)
      .maybeSingle()
    if (defaultEntity) entity = defaultEntity as Record<string, unknown>
  }

  const intern = (caseData.interns ?? {}) as Record<string, unknown>

  const html = await generateInvoiceHtml({
    entity,
    intern,
    billing: billing ?? {},
    caseData: caseData as Record<string, unknown>,
  })

  // Return HTML that can be printed as PDF
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Invoice-Number': String(caseData.invoice_number ?? `INV-${caseId.slice(0, 8)}`),
    },
  })
}
