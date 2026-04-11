import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, portal_token, interns(first_name, last_name, email, preferred_language), job_submissions(id, jobs(id, public_title, title, companies(name)))')
    .eq('id', id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const intern = ((Array.isArray(caseRow.interns) ? caseRow.interns[0] : caseRow.interns) ?? {}) as unknown as Record<string, unknown>
  const submissions = (caseRow.job_submissions ?? []) as unknown as Array<Record<string, unknown>>
  const isFr = (intern.preferred_language as string) !== 'en'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const portalUrl = `${appUrl}/portal/${caseRow.portal_token}`

  const jobsHtml = submissions.map((sub, i) => {
    const job = (sub.jobs ?? {}) as Record<string, unknown>
    const company = ((job.companies ?? {}) as Record<string, unknown>)
    return `<tr ${i % 2 === 0 ? '' : 'style="background:#f9f9f9"'}><td style="padding:10px;font-weight:600">${i + 1}.</td><td style="padding:10px">${job.public_title ?? job.title ?? '—'}</td><td style="padding:10px;color:#888">${company.name ?? '—'}</td></tr>`
  }).join('')

  const html = isFr ? `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
  <h2 style="color:#1a1918">Récap de ton entretien Bali Interns 🌴</h2>
  <p>Bonjour ${intern.first_name ?? ''},</p>
  <p>Merci pour notre échange ! Voici un récap des offres de stage que nous avons discutées ensemble :</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#1a1918;color:white"><th style="padding:10px;text-align:left">#</th><th style="padding:10px;text-align:left">Poste</th><th style="padding:10px;text-align:left">Entreprise</th></tr></thead>
    <tbody>${jobsHtml}</tbody>
  </table>
  <p>Tu peux consulter l'état de ta candidature et uploader ton CV mis à jour depuis ton espace personnel :</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${portalUrl}" style="background:#c8a96e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Accéder à mon espace candidat →</a>
  </div>
  <p style="color:#888;font-size:13px">Si tu ne peux pas cliquer : ${portalUrl}</p>
  <p>À très vite,<br/><strong>L'équipe Bali Interns 🌴</strong></p>
</div>` : `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
  <h2 style="color:#1a1918">Interview recap — Bali Interns 🌴</h2>
  <p>Hi ${intern.first_name ?? ''},</p>
  <p>Thank you for our call! Here's a recap of the internship opportunities we discussed:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#1a1918;color:white"><th style="padding:10px;text-align:left">#</th><th style="padding:10px;text-align:left">Position</th><th style="padding:10px;text-align:left">Company</th></tr></thead>
    <tbody>${jobsHtml}</tbody>
  </table>
  <p>You can track your application and upload your updated CV from your personal portal:</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${portalUrl}" style="background:#c8a96e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Access my candidate portal →</a>
  </div>
  <p>See you soon,<br/><strong>The Bali Interns team 🌴</strong></p>
</div>`

  if (process.env.RESEND_API_KEY && intern.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Charly de Bali Interns <team@bali-interns.com>',
        to: [intern.email as string],
        subject: isFr
          ? `Récap de ton entretien — ${submissions.length} offre${submissions.length > 1 ? 's' : ''} de stage`
          : `Interview recap — ${submissions.length} internship offer${submissions.length > 1 ? 's' : ''}`,
        html,
      }),
    }).catch(() => null)
  }

  await admin
    .from('cases')
    .update({ status: 'qualification_done', updated_at: new Date().toISOString() })
    .eq('id', id)

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'email_sent',
    title: 'Email récap entretien envoyé',
    description: `${submissions.length} offre(s) de stage présentées — accès portail envoyé`,
    source: 'manual',
    status: 'completed',
  })

  return NextResponse.json({ ok: true })
}
