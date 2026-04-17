import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: companyId } = await params
  const body = await request.json() as { contact_id: string }
  const { contact_id } = body

  const { data: company } = await supabase
    .from('companies').select('id, name').eq('id', companyId).single()

  const { data: contact } = await supabase
    .from('contacts').select('id, first_name, last_name, email').eq('id', contact_id).single()

  if (!company || !contact) {
    return NextResponse.json({ error: 'Entreprise ou contact introuvable' }, { status: 404 })
  }
  if (!contact.email) {
    return NextResponse.json({ error: 'Ce contact na pas dadresse email' }, { status: 400 })
  }

  const { data: formRequest, error: reqError } = await supabase
    .from('company_form_requests')
    .insert({ company_id: companyId, contact_id, sent_to_email: contact.email })
    .select().single()

  if (reqError || !formRequest) {
    return NextResponse.json({ error: reqError?.message ?? 'Erreur création token' }, { status: 500 })
  }

  const token = (formRequest as Record<string, unknown>).token as string
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const formUrl = `${appUrl}/form/company/${token}`
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')

  try {
    await resend.emails.send({
      from: 'Bali Interns <team@bali-interns.com>',
      to: contact.email,
      subject: `[Action requise] Informations de ${company.name} a completer`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <div style="background:#c8a96e;width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;"><span style="color:white;font-weight:bold;">SI</span></div>
        <h2 style="color:#1a1918;margin-bottom:8px;">Bonjour ${contactName},</h2>
        <p style="color:#444;line-height:1.6;">Nous preparons le dossier de <strong>${company.name}</strong> pour l'accueil de stagiaires a Bali.<br/>Merci de verifier et completer les informations administratives de votre societe.</p>
        <a href="${formUrl}" style="display:inline-block;background:#c8a96e;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Completer les informations →</a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Lien unique valable 30 jours.<br/>Bali Interns · Canggu, Bali, Indonesia</p>
      </div>`,
    })
  } catch (e) {
    console.error('Resend error:', e)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }

  return NextResponse.json({ success: true, token })
}
