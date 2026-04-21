import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = 'Charly de Bali Interns <team@bali-interns.com>'
const CHARLY = 'charly@bali-interns.com'

// ─── Send helper (graceful no-op if not configured) ──────────────────────────

async function send(opts: {
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
}): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email:', opts.subject)
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      ...(opts.cc ? { cc: Array.isArray(opts.cc) ? opts.cc : [opts.cc] } : {}),
      subject: opts.subject,
      html: opts.html,
    })
    if (error) {
      console.error('[email] Send failed:', error)
    } else {
      console.log('[email] Sent - id:', data?.id)
    }
  } catch (e) {
    console.error('[email] Exception:', e)
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
        <p style="color:#999;font-size:12px;margin-top:24px">Bali Interns — Stages à Bali</p>
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
    subject: 'Paiement de votre stage — Bali Interns',
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
        <p style="color:#999;font-size:12px;margin-top:24px">Bali Interns — charly@bali-interns.com</p>
      </div>
    `,
  })
}

export async function sendJobRetenu(p: { internEmail: string; prenom: string; companyName: string; portalToken: string }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/portal/' + p.portalToken
  await Promise.all([
    send({ to: p.internEmail, cc: CHARLY, subject: `Bali Interns - 🍾 Tu es pris chez ${p.companyName} !`, html: `<p>Félicitations <strong>${p.prenom}</strong> ! Tu es retenu pour ton stage chez <strong>${p.companyName}</strong> !</p><p>Achète tes billets d'avion : <a href="${base}/billet">Formulaire Billets d'Avion</a></p><p>Une fois les billets achetés, nous lancerons la procédure visa.</p><p>Charly</p>` }),
    send({ to: p.internEmail, cc: CHARLY, subject: `Bali Interns - Procédure: Signer la lettre d'engagement ${p.companyName} !`, html: `<p>Hey <strong>${p.prenom}</strong>, merci de signer notre Lettre d'Engagement : <a href="${base}/engagement">Formulaire Lettre d'Engagement</a></p>` }),
    send({ to: p.internEmail, cc: CHARLY, subject: `Bali Interns - Lettre d'engagement à signer`, html: `<p>Hey <strong>${p.prenom}</strong>, signe ta lettre d'engagement : <a href="${base}/engagement">Formulaire</a></p><p>team@bali-interns.com</p>` }),
  ])
}

export async function sendDossierPretAgent(p: { prenom: string; nom: string; caseUrl: string }) {
  await send({ to: CHARLY, subject: `La Machine - Le dossier de ${p.prenom} ${p.nom} est prêt à être envoyé à l'agent`, html: `<p>Dans Hired Interns, clique le bouton drapeau pour envoyer le dossier à l'agent</p><p><a href="${p.caseUrl}">Voir dossier</a></p>` })
}

export async function sendNewCustomerFazza(p: { prenom: string; nom: string; jobTitle: string; companyName: string; nbJours: number; startDate: string; endDate: string; visaType: string; packageType: string; noteAgent?: string; email: string; whatsapp: string; passportNumber: string; nationality: string; motherFirst: string; motherLast: string; visaCostIdr: number; photoUrl?: string; bankUrl?: string; passportUrl?: string }) {
  const CC = ['mcfazzanajmi@gmail.com', 'bestie@bibiconsultant.com', 'bintangberuntungindonesia@gmail.com']
  const docs = [p.photoUrl && `<li>Photo fond blanc: <a href="${p.photoUrl}">Télécharger</a></li>`, p.bankUrl && `<li>Relevé bancaire: <a href="${p.bankUrl}">Télécharger</a></li>`, p.passportUrl && `<li>Passeport page 4: <a href="${p.passportUrl}">Télécharger</a></li>`].filter(Boolean).join('')
  await send({ to: CHARLY, cc: CC, subject: `New Customer from Bali Interns`, html: `<p>Hello Fazza,</p><p>New client: <strong>${p.prenom} ${p.nom}</strong>, internship at <strong>${p.companyName}</strong> as ${p.jobTitle}, ${p.nbJours} days, ${p.startDate} → ${p.endDate}.</p><p>Visa: <strong>${p.visaType}</strong> (${p.packageType})</p>${p.noteAgent ? `<p>Note: ${p.noteAgent}</p>` : ''}<p>Email: ${p.email} | WA: ${p.whatsapp}</p><p>Passport: ${p.passportNumber} | Nationality: ${p.nationality}</p><p>Mother: ${p.motherFirst} ${p.motherLast}</p><ul>${docs}</ul><p>Confirm? Bank transfer IDR ${p.visaCostIdr.toLocaleString()} upon confirmation.</p><p>Charly</p>` })
}

export async function sendWelcomeKit(p: { internEmail: string; prenom: string; portalToken: string }) {
  const portalUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/portal/' + p.portalToken
  await Promise.all([
    send({ to: p.internEmail, cc: CHARLY, subject: `Welcome Kit Bali Interns`, html: `<p>Hey <strong>${p.prenom}</strong>, ton départ approche ! <a href="${portalUrl}">Accès au Welcome Kit</a>. Charly</p>` }),
    send({ to: p.internEmail, cc: CHARLY, subject: `👉 Tes infos pratiques avant de décoller pour Bali`, html: `<p>Hey, ton départ approche ! Bali ce n'est pas Paris 😉</p><p><strong>🛵 Se déplacer:</strong> Scooter, <a href="https://apps.apple.com/fr/app/gojek/id944875099">Gojek</a>, <a href="https://apps.apple.com/fr/app/grab-taxi-ride-food-delivery/id647268330">Grab</a></p><p><strong>💳 Argent:</strong> Cash + <a href="https://revolut.com">Revolut</a>. Retraits: BCA, Mandiri, Permata.</p><p><strong>📱 Téléphone:</strong> eSIM <a href="https://mobimatter.app/">Mobimatter</a> code <strong>MMBALI</strong> -50%.</p><p><strong>🏥 Santé:</strong> BIMC Hospital Kuta, Siloam Kuta, Prima Medika Ubud.</p><p><strong>🚨 Urgence:</strong> FAZZA <a href="https://wa.me/628888999900">+62 888-8999-900</a>. Police: 110. Ambulance: 118.</p><p>Charly</p>` }),
  ])
}

export async function sendAppAllIndonesia(p: { internEmail: string; prenom: string }) {
  await send({ to: p.internEmail, cc: CHARLY, subject: `👉 Tes infos pratiques avant de décoller pour Bali`, html: `<p>Hey ${p.prenom}, ton départ est dans moins de 3 jours !</p><p>Télécharge <strong>All Indonesia</strong> pour passer l'immigration : <a href="https://apps.apple.com/us/app/all-indonesia/id6749558272">Apple Store</a> / <a href="https://play.google.com/store/apps/details?id=id.go.imigrasi.allindonesia">Google Store</a></p><p>Bon voyage, ton chauffeur t'attendera à l'arrivée. Charly</p>` })
}

export async function sendAlerteArrivee(p: { prenom: string; nom: string; jours: 7 | 4 | 0; startDate: string; billetUrl?: string; caseUrl: string }) {
  const subjects: Record<number, string> = { 7: `La Machine: ${p.prenom} ${p.nom} arrive dans 7 jours !`, 4: `La Machine: ${p.prenom} ${p.nom} arrive dans les 4 jours !`, 0: `La Machine: ${p.prenom} ${p.nom} arrive aujourd'hui !` }
  await send({ to: CHARLY, subject: subjects[p.jours] ?? `La Machine: ${p.prenom} ${p.nom} arrive bientôt !`, html: `<p>Il est temps de s'assurer que le driver sera disponible et que tout est en ordre pour son logement.</p><p>Date d'arrivée: <strong>${p.startDate}</strong></p>${p.billetUrl ? `<p>Billet: <a href="${p.billetUrl}">Voir</a></p>` : ''}<p><a href="${p.caseUrl}">Voir le dossier</a></p>` })
}

export async function sendRdvConfirmation(params: {
  internEmail: string
  internFirstName: string
  rdvDate: string
  meetLink?: string | null
  cancelLink?: string | null
  lang?: string
}) {
  const { internEmail, internFirstName, rdvDate, meetLink, cancelLink, lang = 'fr' } = params
  const isFr = lang !== 'en'

  const dateLabel = new Date(rdvDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
  const timeLabel = new Date(rdvDate).toLocaleTimeString(isFr ? 'fr-FR' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }) + ' WITA'

  await send({
    to: internEmail,
    subject: isFr
      ? `✅ Ton entretien Bali Interns est confirmé — ${dateLabel}`
      : `✅ Your Bali Interns interview is confirmed — ${dateLabel}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="color:#c8a96e;font-weight:600;margin-bottom:4px">Bali Interns 🌴</p>
  <h2 style="color:#1a1918;margin:0 0 24px">
    ${isFr ? `🎉 Ton entretien est confirmé${internFirstName ? ', ' + internFirstName : ''} !` : `🎉 Your interview is confirmed${internFirstName ? ', ' + internFirstName : ''}!`}
  </h2>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">
    <p style="margin:0 0 8px;font-weight:600">📅 ${dateLabel}</p>
    <p style="margin:0 0 8px;color:#555">🕐 ${timeLabel}</p>
    <p style="margin:0;color:#555">📍 Google Meet</p>
  </div>
  ${meetLink ? `<p style="text-align:center;margin:20px 0">
    <a href="${meetLink}" style="display:inline-block;background:#1a73e8;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
      🎥 ${isFr ? 'Rejoindre le Meet' : 'Join Google Meet'}
    </a>
  </p>` : ''}
  <div style="background:#fef9ee;border-left:4px solid #c8a96e;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
    <p style="margin:0;font-size:14px"><strong>${isFr ? 'Pour préparer cet entretien :' : 'To prepare:'}</strong></p>
    <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#555">
      <li>${isFr ? 'Aie ton CV sous la main' : 'Have your CV ready'}</li>
      <li>${isFr ? 'Note les métiers qui t\'intéressent à Bali' : 'Think about positions you\'re interested in'}</li>
      <li>${isFr ? 'Prépare tes questions sur le visa et le logement' : 'Prepare questions about visa and accommodation'}</li>
    </ul>
  </div>
  ${cancelLink ? `<p style="font-size:12px;color:#999;margin-top:20px;text-align:center">
    <a href="${cancelLink}" style="color:#999">${isFr ? 'Annuler ou reprogrammer' : 'Cancel or reschedule'}</a>
  </p>` : ''}
  <p style="margin-top:24px">
    ${isFr ? `À très vite,` : `See you soon,`}<br/>
    <strong>Charly</strong> — Bali Interns<br/>
    <span style="color:#999;font-size:12px"><a href="mailto:team@bali-interns.com" style="color:#c8a96e">team@bali-interns.com</a></span>
  </p>
</div>`,
  })
}

export async function sendQualificationEmail(p: {
  internEmail: string
  prenom: string
  nom: string
  portalToken: string
  tempPassword: string
  qualificationNotes: string
  portalUrl: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9; padding: 32px;">
      <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e4e0dc;">
        <h1 style="color: #1a1918; font-size: 24px; margin: 0 0 8px;">
          Félicitations ${p.prenom} !
        </h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
          Tu as passé avec succès ton entretien de qualification pour un stage à Bali.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #15803d; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
            Compte-rendu de ton entretien
          </h3>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${p.qualificationNotes || 'Profil validé pour un stage à Bali. Nous allons maintenant te proposer des offres correspondant à ton profil.'}</p>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #1d4ed8; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
            Accès à ton espace candidat
          </h3>
          <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">
            <strong>Email :</strong> ${p.internEmail}
          </p>
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
            <strong>Mot de passe temporaire :</strong> <code style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 16px;">${p.tempPassword}</code>
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 16px;">
            Change ton mot de passe dès ta première connexion.
          </p>
          <a href="${p.portalUrl}"
            style="display: inline-block; background: #c8a96e; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Accéder à mon espace candidat
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; margin: 24px 0 0;">
          Notre équipe va te proposer des offres de stage dans les prochains jours. Tu pourras les consulter et nous indiquer tes préférences directement depuis ton espace.
        </p>

        <p style="color: #374151; font-size: 14px; margin: 16px 0 0;">
          À très vite,<br/>
          <strong>L'équipe Bali Interns</strong>
        </p>
      </div>
    </div>
  `

  return send({
    to: p.internEmail,
    subject: `Entretien validé — Accès à ton espace Bali Interns`,
    html,
  })
}

export async function sendInternCommentNotification(p: {
  managerEmail: string
  prenom: string
  nom: string
  jobTitle: string
  comment: string
  caseUrl: string
  interested: boolean | null
}) {
  const interestLabel = p.interested === true ? 'Intéressé' : p.interested === false ? 'Pas intéressé' : 'Non précisé'
  await send({
    to: p.managerEmail,
    subject: `Commentaire de ${p.prenom} ${p.nom} sur ${p.jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#c8a96e">Nouveau commentaire étudiant</h2>
        <p><strong>${p.prenom} ${p.nom}</strong> a commenté l'offre <strong>${p.jobTitle}</strong>.</p>
        <div style="background:#f5f5f0;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">Commentaire</p>
          <p style="margin:0;color:#1a1918;white-space:pre-wrap">${p.comment}</p>
        </div>
        <p><strong>Intérêt :</strong> <span style="color:${p.interested === true ? '#0d9e75' : p.interested === false ? '#dc2626' : '#6b7280'}">${interestLabel}</span></p>
        <a href="${p.caseUrl}" style="display:inline-block;background:#c8a96e;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px">
          Voir le dossier
        </a>
      </div>
    `,
  })
}

export async function sendVisaDocsRequest(params: {
  internEmail: string
  internFirstName: string
  portalToken: string
}) {
  const { internEmail, internFirstName, portalToken } = params
  const portalUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app') + '/portal/' + portalToken + '/documents'

  await send({
    to: internEmail,
    cc: CHARLY,
    subject: `Documents visa requis — Bali Interns`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#c8a96e">Documents requis pour ton visa</h2>
        <p>Hello ${internFirstName},</p>
        <p>Pour lancer ta procédure de visa, nous avons besoin des documents suivants :</p>
        <ul style="line-height:1.8">
          <li><strong>Photo d'identité</strong> (fond blanc, format passeport)</li>
          <li><strong>Scan passeport page 4</strong> (page avec ta photo)</li>
          <li><strong>Relevé bancaire récent</strong> (moins de 3 mois)</li>
          <li><strong>Billet d'avion aller-retour</strong></li>
        </ul>
        <p>Tu peux les uploader directement depuis ton espace candidat :</p>
        <a href="${portalUrl}" style="display:inline-block;background:#c8a96e;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px">
          Uploader mes documents →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Bali Interns — team@bali-interns.com</p>
      </div>
    `,
  })
}

export async function sendWelcomeKitShort(p: { internEmail: string; prenom: string }) {
  await send({ to: p.internEmail, cc: CHARLY, subject: `Welcome Kit Bali Interns`, html: `<p>Hey <strong>${p.prenom}</strong>, ton départ approche ! Nous t'envoyons toutes les infos pratiques très vite. Charly</p>` })
}

/** Confirmation RDV envoyée au candidat quand rdv_booked */
export async function sendRdvConfirmationIntern(p: {
  internEmail: string
  prenom: string
  rdvDate: string
  meetLink?: string | null
  portalToken: string
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'}/portal/${p.portalToken}`
  await send({
    to: p.internEmail,
    cc: CHARLY,
    subject: `Bali Interns — Ton entretien est confirmé 📅`,
    html: `<p>Bonjour <strong>${p.prenom}</strong>,</p>
<p>Ton entretien de qualification est confirmé !</p>
<p><strong>Date :</strong> ${p.rdvDate}</p>
${p.meetLink ? `<p><strong>Lien Google Meet :</strong> <a href="${p.meetLink}">${p.meetLink}</a></p>` : ''}
<p>En attendant, tu peux <a href="${portalUrl}">accéder à ton espace candidat</a> pour compléter ton profil.</p>
<p>À très bientôt,<br>Charly<br><em>team@bali-interns.com</em></p>`,
  })
}

/** Email candidat quand visa reçu */
export async function sendVisaReceived(p: {
  internEmail: string
  prenom: string
  portalToken: string
  startDate?: string | null
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'}/portal/${p.portalToken}`
  await send({
    to: p.internEmail,
    cc: CHARLY,
    subject: `Bali Interns — Ton visa est arrivé ! 🛂✅`,
    html: `<p>Bonjour <strong>${p.prenom}</strong>,</p>
<p>🎉 Excellente nouvelle : <strong>ton visa a été accordé !</strong></p>
<p>Tu peux maintenant préparer ton départ pour Bali${p.startDate ? ` prévu le <strong>${p.startDate}</strong>` : ''}.</p>
<p>Retrouve toutes les infos pratiques sur <a href="${portalUrl}">ton espace candidat</a> : logement, scooter, chauffeur aéroport.</p>
<p>On est là pour toi,<br>Charly<br><em>team@bali-interns.com</em></p>`,
  })
}

/** Email candidat quand alumni */
export async function sendAlumniCongrats(p: {
  internEmail: string
  prenom: string
  companyName: string
  portalToken: string
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'}/portal/${p.portalToken}`
  await send({
    to: p.internEmail,
    cc: CHARLY,
    subject: `Bali Interns — Félicitations pour ton stage ! 🌴🎓`,
    html: `<p>Bonjour <strong>${p.prenom}</strong>,</p>
<p>Ton stage chez <strong>${p.companyName}</strong> est officiellement terminé. Félicitations !</p>
<p>Tu fais maintenant partie de la famille des <strong>Bali Interns alumni</strong>. 🌴</p>
<p>N'oublie pas notre <a href="${portalUrl}">programme de parrainage</a> : 100€ pour chaque ami que tu nous envoies.</p>
<p>Garde le contact,<br>Charly<br><em>team@bali-interns.com</em></p>`,
  })
}
