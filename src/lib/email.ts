import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bali-interns-website.vercel.app'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Bali Interns <team@bali-interns.com>'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export async function sendEmail(payload: EmailPayload) {
  return resend.emails.send({
    from: FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    replyTo: payload.replyTo,
    tags: payload.tags,
  })
}

// ── Templates ────────────────────────────────────────────────────────────────

export function welcomeEmailHtml(firstName: string, lang: 'fr' | 'en' = 'fr') {
  if (lang === 'fr') return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fffbf0">
  <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_black.png" height="32" style="margin-bottom:24px"/>
  <h1 style="font-size:28px;color:#1a1918;margin:0 0 16px">Bienvenue ${firstName} 🌴</h1>
  <p style="color:#57534e;font-size:16px;line-height:1.6">
    Merci de t'être inscrit(e). Tu es maintenant dans notre liste — chaque mois, tu recevras les offres de stage disponibles à Bali.
  </p>
  <p style="color:#57534e;font-size:16px;line-height:1.6">
    En attendant, tu peux déjà déposer ton CV pour pré-remplir ta candidature en quelques secondes.
  </p>
  <a href="${SITE_URL}/apply" style="display:inline-block;background:#FFCC00;color:#1a1918;font-weight:700;padding:14px 28px;border-radius:100px;text-decoration:none;margin-top:16px">
    Candidater gratuitement →
  </a>
  <hr style="border:none;border-top:1px solid #ede5d0;margin:32px 0"/>
  <p style="color:#a8a29e;font-size:12px">Bali Interns · C.G Company International Ltd · team@bali-interns.com</p>
</div>`
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fffbf0">
  <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_black.png" height="32" style="margin-bottom:24px"/>
  <h1 style="font-size:28px;color:#1a1918;margin:0 0 16px">Welcome ${firstName} 🌴</h1>
  <p style="color:#57534e;font-size:16px;line-height:1.6">
    You're now on our list — every month you'll receive available internship openings in Bali.
  </p>
  <a href="${SITE_URL}/apply" style="display:inline-block;background:#FFCC00;color:#1a1918;font-weight:700;padding:14px 28px;border-radius:100px;text-decoration:none;margin-top:16px">
    Apply for free →
  </a>
  <hr style="border:none;border-top:1px solid #ede5d0;margin:32px 0"/>
  <p style="color:#a8a29e;font-size:12px">Bali Interns · team@bali-interns.com</p>
</div>`
}

export function newsletterMonthlyHtml(
  jobs: Array<{ title: string; company: string; location: string; slug?: string }>,
  lang: 'fr' | 'en' = 'fr'
) {
  const jobsHtml = jobs.slice(0, 5).map(j => `
    <div style="border:1px solid #ede5d0;border-radius:12px;padding:16px 20px;margin-bottom:12px;background:#fff">
      <p style="margin:0 0 4px;font-weight:700;color:#1a1918;font-size:16px">${j.title}</p>
      <p style="margin:0;color:#78716c;font-size:14px">${j.company} · ${j.location}</p>
      ${j.slug ? `<a href="${SITE_URL}/apply" style="display:inline-block;margin-top:10px;color:#b45309;font-size:13px;font-weight:600;text-decoration:none">Postuler →</a>` : ''}
    </div>`).join('')

  return lang === 'fr' ? `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fffbf0">
  <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_black.png" height="32" style="margin-bottom:24px"/>
  <h1 style="font-size:24px;color:#1a1918">🌴 Offres du mois à Bali</h1>
  <p style="color:#57534e">Voici les stages disponibles ce mois-ci dans notre réseau :</p>
  ${jobsHtml}
  <a href="${SITE_URL}/apply" style="display:inline-block;background:#FFCC00;color:#1a1918;font-weight:700;padding:14px 28px;border-radius:100px;text-decoration:none;margin-top:16px">
    Voir toutes les offres →
  </a>
  <hr style="border:none;border-top:1px solid #ede5d0;margin:32px 0"/>
  <p style="color:#a8a29e;font-size:11px">Se désabonner : répondre à cet email avec "désabonner"</p>
</div>` : `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fffbf0">
  <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_black.png" height="32" style="margin-bottom:24px"/>
  <h1 style="font-size:24px;color:#1a1918">🌴 This month's openings in Bali</h1>
  <p style="color:#57534e">Here are the internships available this month in our network:</p>
  ${jobsHtml}
  <a href="${SITE_URL}/apply" style="display:inline-block;background:#FFCC00;color:#1a1918;font-weight:700;padding:14px 28px;border-radius:100px;text-decoration:none;margin-top:16px">
    See all openings →
  </a>
  <hr style="border:none;border-top:1px solid #ede5d0;margin:32px 0"/>
  <p style="color:#a8a29e;font-size:11px">Unsubscribe: reply with "unsubscribe"</p>
</div>`
}
