import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: c } = await supabase
    .from('cases')
    .select('id, portal_token, temp_password, interns(first_name, last_name, email), assigned_manager_name')
    .eq('id', id)
    .single()

  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const intern = c.interns as { first_name?: string; last_name?: string; email?: string } | null
  if (!intern?.email) return NextResponse.json({ error: 'Pas d\'email stagiaire' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const portalUrl = `${appUrl}/portal/${c.portal_token}`
  const name = [intern.first_name, intern.last_name].filter(Boolean).join(' ')
  const manager = (c as Record<string, unknown>).assigned_manager_name as string ?? 'Charly'

  await resend.emails.send({
    from: 'Sunny Interns <team@bali-interns.com>',
    to: intern.email,
    subject: `🌴 Ton espace Sunny Interns est prêt, ${intern.first_name} !`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <div style="background:#c8a96e;width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px">
        <span style="color:white;font-weight:bold;font-size:18px">🌴</span>
      </div>
      <h2 style="color:#1a1918;margin-bottom:8px">Bonjour ${name} !</h2>
      <p style="color:#444;line-height:1.7">Félicitations pour ton entretien ! Ton espace personnel Sunny Interns est maintenant actif. Tu peux y accéder pour :</p>
      <ul style="color:#444;line-height:1.9;padding-left:20px">
        <li>Signer ta lettre d'engagement</li>
        <li>Voir les offres de stage qui te correspondent</li>
        <li>Suivre l'avancement de ton dossier visa</li>
        <li>Accéder à tous tes documents</li>
        <li>Trouver ton logement à Bali</li>
      </ul>
      <a href="${portalUrl}" style="display:inline-block;background:#c8a96e;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;margin:20px 0;font-size:16px">
        Accéder à mon espace →
      </a>
      ${c.temp_password ? `<p style="color:#666;font-size:13px">Mot de passe temporaire : <strong>${c.temp_password}</strong></p>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#888;font-size:13px;line-height:1.6">
        <strong>Prochaine étape :</strong> connecte-toi et signe ta lettre d'engagement.<br>
        Des questions ? Réponds directement à cet email ou contacte ${manager} sur WhatsApp.
      </p>
      <p style="color:#888;font-size:12px;margin-top:24px">Sunny Interns · Canggu, Bali, Indonesia</p>
    </div>`,
  })

  await supabase.from('cases').update({
    portal_sent_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}
