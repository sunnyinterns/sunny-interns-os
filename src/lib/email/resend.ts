import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = 'Sunny Interns <noreply@sunnyinterns.com>'
const CHARLY = 'charly@bali-interns.com'

// ─── Send helper (graceful no-op if not configured) ──────────────────────────

async function send(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email:', opts.subject)
    return
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    })
  } catch (e) {
    console.error('[email] Send failed:', e)
  }
}

// ─── Email types ─────────────────────────────────────────────────────────────

/**
 * Notif interne Charly quand un nouveau candidat dépose son dossier.
 * Format exact Airtable.
 */
export async function sendNewLeadInternal(params: {
  firstName: string
  lastName: string
  email: string
  startDate?: string | null
  duration?: string | null
  passportExpiry?: string | null
  startDateValue?: string | null
  desiredJob?: string | null
  comment?: string | null
  caseId: string
}) {
  const {
    firstName, lastName, email, startDate, duration, passportExpiry,
    startDateValue, desiredJob, comment, caseId,
  } = params

  // Passport validity check
  let passportStatus = 'N/A'
  if (passportExpiry && startDateValue) {
    const expiry = new Date(passportExpiry)
    const arrival = new Date(startDateValue)
    const limit = new Date(arrival)
    limit.setMonth(limit.getMonth() + 6)
    passportStatus = expiry >= limit ? 'VALIDE' : 'INVALIDE'
  } else if (passportExpiry) {
    passportStatus = 'DATE ARRIVÉE MANQUANTE'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const caseUrl = `${appUrl}/fr/cases/${caseId}`

  await send({
    to: CHARLY,
    subject: `Nouveau stagiaire ! ${firstName} ${lastName} a candidaté`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#c8a96e;margin-bottom:16px">Nouveau candidat 🎉</h2>
        <p><strong>${firstName} ${lastName}</strong> (${email}) a déposé sa candidature.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#666">Date de démarrage</td><td style="padding:6px 0;font-weight:600">${startDate ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Durée souhaitée</td><td style="padding:6px 0;font-weight:600">${duration ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Passeport</td><td style="padding:6px 0;font-weight:600;color:${passportStatus === 'VALIDE' ? '#0d9e75' : '#dc2626'}">${passportStatus}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Métier souhaité</td><td style="padding:6px 0;font-weight:600">${desiredJob ?? '—'}</td></tr>
        </table>
        ${comment ? `<p style="background:#f5f5f0;padding:12px;border-radius:8px;margin:16px 0"><strong>Commentaire :</strong> ${comment}</p>` : ''}
        <a href="${caseUrl}" style="display:inline-block;background:#c8a96e;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
          Voir le dossier →
        </a>
      </div>
    `,
  })
}

/**
 * Email employeur quand un CV est soumis.
 */
export async function sendJobSubmittedEmployer(params: {
  employerEmail: string
  employerName?: string
  internFirstName: string
  internLastName: string
  jobTitle: string
  cvUrl?: string | null
  caseId: string
}) {
  const { employerEmail, employerName, internFirstName, internLastName, jobTitle, cvUrl, caseId } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const verifyUrl = `${appUrl}/verify/${caseId}`

  await send({
    to: employerEmail,
    subject: `Candidature de ${internFirstName} ${internLastName} — ${jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#c8a96e">Nouveau profil pour votre poste</h2>
        <p>Bonjour ${employerName ?? ''},</p>
        <p>Nous vous soumettons la candidature de <strong>${internFirstName} ${internLastName}</strong> pour le poste de <strong>${jobTitle}</strong>.</p>
        ${cvUrl ? `<p><a href="${cvUrl}" style="color:#c8a96e;font-weight:600">📄 Télécharger le CV</a></p>` : ''}
        <a href="${verifyUrl}" style="display:inline-block;background:#c8a96e;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
          Donner ma réponse →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Sunny Interns — Stages à Bali</p>
      </div>
    `,
  })
}

/**
 * Email paiement envoyé au stagiaire.
 */
export async function sendPaymentRequest(params: {
  internEmail: string
  internFirstName: string
  amount: number
  invoiceUrl?: string | null
}) {
  const { internEmail, internFirstName, amount, invoiceUrl } = params

  await send({
    to: internEmail,
    subject: 'Paiement de votre stage — Sunny Interns',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#c8a96e">Informations de paiement</h2>
        <p>Hello ${internFirstName},</p>
        <p>nous attendons ton paiement de <strong>${amount}€</strong>.</p>
        <div style="background:#f5f5f0;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px;font-weight:600">Virement :</p>
          <p style="margin:0;font-family:monospace">REVOLUT LTD<br/>GB76REVO00996903517949</p>
        </div>
        ${invoiceUrl ? `<p><strong>Lien facture :</strong> <a href="${invoiceUrl}" style="color:#c8a96e">${invoiceUrl}</a></p>` : ''}
        <p>N'hésite pas à nous contacter pour toute question.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">Sunny Interns — charly@bali-interns.com</p>
      </div>
    `,
  })
}
