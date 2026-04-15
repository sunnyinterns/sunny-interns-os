import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: c } = await supabase
    .from('cases')
    .select('*, interns(first_name, last_name)')
    .eq('id', id)
    .maybeSingle()

  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const intern = c.interns as { first_name?: string; last_name?: string } | null
  const internName = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')

  // Try to get employer portal access
  let contractUrl: string | null = null
  if (c.employer_contact_id) {
    const { data: empPortal } = await supabase
      .from('employer_portal_access')
      .select('token')
      .eq('contact_id', c.employer_contact_id)
      .maybeSingle()

    if (empPortal?.token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
      contractUrl = `${appUrl}/portal/employer/${empPortal.token}`
    }
  }

  // Get employer email from contacts
  let contactEmail: string | null = null
  let contactName = 'Responsable'
  if (c.employer_contact_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', c.employer_contact_id)
      .maybeSingle()
    if (contact?.email) {
      contactEmail = contact.email
      contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Responsable'
    }
  }

  if (!contactEmail) {
    return NextResponse.json({ error: 'Pas de contact employeur avec email' }, { status: 400 })
  }

  await resend.emails.send({
    from: 'Sunny Interns <team@bali-interns.com>',
    to: contactEmail,
    cc: 'charly@bali-interns.com',
    subject: `Contrat Sponsor à signer — ${internName} chez vous`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2>Bonjour ${contactName},</h2>
      <p>La convention de stage de <strong>${internName}</strong> est signée. La prochaine étape est la signature du Contrat Sponsor Bali Interns.</p>
      <p>Ce contrat confirme l'intervention du stagiaire dans votre entreprise et les engagements de chaque partie.</p>
      ${contractUrl ? `<a href="${contractUrl}" style="display:inline-block;background:#c8a96e;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0">Signer le Contrat Sponsor →</a>` : '<p>Notre équipe vous contactera pour la signature du contrat.</p>'}
      <p style="color:#888;font-size:12px;margin-top:24px">Sunny Interns · Canggu, Bali</p>
    </div>`,
  })

  await supabase.from('cases').update({ sponsor_contract_sent_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ success: true })
}
