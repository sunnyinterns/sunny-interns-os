import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const UK_BANK = {
  name: 'C.G Company International',
  iban: 'GB76REVO00996903517949',
  bic: 'REVOGB21',
  bankName: 'Revolut Ltd',
}

type InternRow = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  preferred_language?: string | null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: c } = await admin
    .from('cases')
    .select('id, portal_token, payment_amount, invoice_number, discount_percentage, interns(first_name, last_name, email, preferred_language)')
    .eq('id', id)
    .single()

  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const internRaw = Array.isArray(c.interns) ? c.interns[0] : c.interns
  const intern = (internRaw ?? {}) as InternRow
  if (!intern.email) return NextResponse.json({ error: 'Intern has no email' }, { status: 400 })

  const isFr = intern.preferred_language !== 'en'
  const amount = Number(c.payment_amount ?? 990)
  const discount = Number(c.discount_percentage ?? 0)
  const total = discount > 0 ? amount * (1 - discount / 100) : amount
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const portalUrl = `${appUrl}/portal/${c.portal_token}`

  const titre = isFr ? `Informations de paiement — Bali Interns` : `Payment information — Bali Interns`
  const lblMontant = isFr ? 'Montant' : 'Amount'
  const lblRemise = isFr ? 'Remise' : 'Discount'
  const lblRef = isFr ? 'Référence' : 'Reference'
  const lblBanque = isFr ? 'Coordonnées bancaires' : 'Bank details'

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1918">${titre}</h2>
      <p>${isFr ? `Bonjour ${intern.first_name ?? ''},` : `Hi ${intern.first_name ?? ''},`}</p>
      <p>${isFr
        ? `Suite à la validation de ta convention de stage, voici les informations nécessaires pour effectuer ton paiement :`
        : `Following the signing of your internship agreement, here are the payment details:`}</p>

      <div style="background:#fef9ee;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px;color:#888;width:140px">${lblMontant}</td><td style="padding:6px;font-weight:700;font-size:20px;color:#1a1918">${total.toFixed(0)} €</td></tr>
          ${discount > 0 ? `<tr><td style="padding:6px;color:#888">${lblRemise}</td><td style="padding:6px;color:#0d9e75">-${discount}%</td></tr>` : ''}
          <tr><td style="padding:6px;color:#888">${lblRef}</td><td style="padding:6px;font-weight:600">${c.invoice_number ?? 'BI-2026'}</td></tr>
        </table>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0">
        <p style="font-weight:700;margin:0 0 12px;color:#1a1918">${lblBanque}</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:4px;color:#888;width:110px">${isFr ? 'Société' : 'Company'}</td><td style="padding:4px;color:#1a1918">${UK_BANK.name}</td></tr>
          <tr><td style="padding:4px;color:#888">IBAN</td><td style="padding:4px;font-family:monospace;color:#1a1918">${UK_BANK.iban}</td></tr>
          <tr><td style="padding:4px;color:#888">BIC</td><td style="padding:4px;font-family:monospace;color:#1a1918">${UK_BANK.bic}</td></tr>
          <tr><td style="padding:4px;color:#888">${isFr ? 'Banque' : 'Bank'}</td><td style="padding:4px;color:#1a1918">${UK_BANK.bankName}</td></tr>
        </table>
      </div>

      <p>${isFr ? `Tu peux également retrouver ces informations dans ton espace personnel :` : `You can also find this information in your personal portal:`}</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${portalUrl}" style="display:inline-block;background:#c8a96e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${isFr ? 'Mon espace candidat →' : 'My candidate portal →'}</a>
      </div>
      <p style="color:#888;font-size:12px;margin-top:24px">${isFr ? 'Pour toute question : team@bali-interns.com' : 'Any questions: team@bali-interns.com'}</p>
    </div>
  `

  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Charly de Bali Interns <team@bali-interns.com>',
        to: [intern.email],
        subject: isFr
          ? `Informations de paiement — ${total.toFixed(0)} €`
          : `Payment information — ${total.toFixed(0)} €`,
        html,
      }),
    }).catch(() => null)
  }

  await admin
    .from('cases')
    .update({ status: 'payment_pending', updated_at: new Date().toISOString() })
    .eq('id', id)

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'email_sent',
    title: 'Email paiement envoyé',
    description: `Montant: ${total.toFixed(0)}€ — coordonnées bancaires transmises au candidat`,
    source: 'manual',
    status: 'completed',
  })

  return NextResponse.json({ ok: true })
}
