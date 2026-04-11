import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, subId } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sub } = await admin
    .from('job_submissions')
    .select('*, jobs(id, title, public_title, description, companies(id, name, email))')
    .eq('id', subId)
    .single()

  const { data: caseRow } = await admin
    .from('cases')
    .select('*, interns(first_name, last_name, email, whatsapp, cv_url, local_cv_url, school_country, main_desired_job, private_comment_for_employer, linkedin_url, spoken_languages, english_level, stage_ideal)')
    .eq('id', id)
    .single()

  if (!sub || !caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const intern = (caseRow.interns ?? {}) as Record<string, unknown>
  const job = (sub.jobs ?? {}) as Record<string, unknown>
  const company = ((job.companies ?? {}) as Record<string, unknown>)
  const cvUrl = (intern.local_cv_url ?? intern.cv_url) as string | null
  const contactEmail = company.email as string | null

  let emailSent = false
  if (contactEmail && process.env.RESEND_API_KEY) {
    const langs = Array.isArray(intern.spoken_languages) ? (intern.spoken_languages as string[]).join(', ') : '—'
    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
  <h2 style="color:#1a1918">Candidature pour le poste : ${job.public_title ?? job.title}</h2>
  <p>Bonjour,</p>
  <p>Nous vous transmettons la candidature d'un(e) stagiaire intéressé(e) par votre offre.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;color:#888;width:150px">Prénom / Nom</td><td style="padding:8px;font-weight:600">${intern.first_name ?? ''} ${intern.last_name ?? ''}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Email</td><td style="padding:8px">${intern.email ?? '—'}</td></tr>
    <tr><td style="padding:8px;color:#888">WhatsApp</td><td style="padding:8px">${intern.whatsapp ?? '—'}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Pays d'études</td><td style="padding:8px">${intern.school_country ?? '—'}</td></tr>
    <tr><td style="padding:8px;color:#888">Métier visé</td><td style="padding:8px">${intern.main_desired_job ?? '—'}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Langues</td><td style="padding:8px">${langs}</td></tr>
    <tr><td style="padding:8px;color:#888">Anglais</td><td style="padding:8px">${intern.english_level ?? '—'}</td></tr>
    ${intern.linkedin_url ? `<tr style="background:#f9f9f9"><td style="padding:8px;color:#888">LinkedIn</td><td style="padding:8px"><a href="${intern.linkedin_url}">${intern.linkedin_url}</a></td></tr>` : ''}
    ${cvUrl ? `<tr><td style="padding:8px;color:#888">CV</td><td style="padding:8px"><a href="${cvUrl}" style="color:#c8a96e">Télécharger le CV</a></td></tr>` : ''}
  </table>
  ${intern.private_comment_for_employer ? `<div style="background:#fef9ee;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0;font-size:13px;color:#92400e"><strong>Note de Bali Interns :</strong> ${intern.private_comment_for_employer}</p></div>` : ''}
  <p>N'hésitez pas à contacter directement le/la candidat(e) pour un entretien.</p>
  <p>Cordialement,<br/><strong>L'équipe Bali Interns 🌴</strong></p>
</div>`.trim()

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bali Interns <hello@bali-interns.com>',
        to: [contactEmail],
        subject: `Candidature : ${intern.first_name} ${intern.last_name} — ${job.public_title ?? job.title}`,
        html,
      }),
    }).catch(() => null)
    emailSent = !!resp?.ok
  }

  await admin
    .from('job_submissions')
    .update({ status: 'sent', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', subId)

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'job_submitted',
    title: `Candidature envoyée : ${job.public_title ?? job.title}`,
    description: `Profil envoyé à ${company.name ?? "l'employeur"}${emailSent ? ' (email)' : ''}`,
    source: 'manual',
    status: 'completed',
  })

  return NextResponse.json({ ok: true, emailSent })
}
