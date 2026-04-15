import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: companyId } = await params
  const { contact_id } = await request.json() as { contact_id: string }

  const { data: company } = await supabase.from('companies').select('id,name').eq('id', companyId).single()
  const { data: contact } = await supabase.from('contacts').select('id,first_name,last_name,email').eq('id', contact_id).single()

  if (!company || !contact?.email) return NextResponse.json({ error: 'Contact sans email' }, { status: 400 })

  let { data: access } = await supabase
    .from('employer_portal_access')
    .select('token')
    .eq('company_id', companyId)
    .eq('contact_id', contact_id)
    .maybeSingle()

  if (!access) {
    const { data: na } = await supabase
      .from('employer_portal_access')
      .insert({ company_id: companyId, contact_id, sent_at: new Date().toISOString() })
      .select('token')
      .single()
    access = na
  } else {
    await supabase
      .from('employer_portal_access')
      .update({ sent_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('contact_id', contact_id)
  }

  if (!access) return NextResponse.json({ error: 'Erreur création portail' }, { status: 500 })

  const tok = (access as { token: string }).token
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const url = `${appUrl}/portal/employer/${tok}`
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')

  await resend.emails.send({
    from: 'Sunny Interns <team@bali-interns.com>',
    to: contact.email,
    subject: `Votre espace partenaire Sunny Interns — ${company.name}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px"><div style="background:#c8a96e;width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px"><span style="color:white;font-weight:bold">SI</span></div><h2>Bonjour ${name},</h2><p>Votre espace partenaire est prêt :<br>• Valider les infos de <strong>${company.name}</strong><br>• Voir les offres actives</p><a href="${url}" style="display:inline-block;background:#c8a96e;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0">Accéder à mon espace →</a><p style="color:#888;font-size:12px">Sunny Interns · Canggu, Bali</p></div>`,
  })

  return NextResponse.json({ success: true, token: tok })
}
