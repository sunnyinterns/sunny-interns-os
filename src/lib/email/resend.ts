import { Resend } from 'resend'
import { createClient as svcClient } from '@supabase/supabase-js'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Charly from Bali Interns <team@bali-interns.com>'
const CHARLY = 'charly@bali-interns.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

// ─── Low-level send ───────────────────────────────────────────────────────────
async function send(opts: {
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
}): Promise<void> {
  if (!resend) { console.warn('[email] RESEND_API_KEY not set — skipping:', opts.subject); return }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      ...(opts.cc ? { cc: Array.isArray(opts.cc) ? opts.cc : [opts.cc] } : {}),
      subject: opts.subject,
      html: opts.html,
    })
    if (error) console.error('[email] Send failed:', error)
    else console.log('[email] Sent id:', data?.id)
  } catch (e) { console.error('[email] Exception:', e) }
}

// ─── Template engine ─────────────────────────────────────────────────────────
/**
 * Fetch a template from DB by slug, substitute {{variables}}, and send.
 * Falls back to `fallbackHtml` if template not found (safety net).
 */
async function sendFromTemplate(opts: {
  slug: string
  to: string | string[]
  cc?: string | string[]
  vars: Record<string, string | number | null | undefined>
  fallbackSubject?: string
  fallbackHtml?: string
}): Promise<void> {
  const { slug, to, cc, vars, fallbackSubject, fallbackHtml } = opts

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase env missing')

    const sb = svcClient(supabaseUrl, serviceKey)
    const { data: tpl, error } = await sb
      .from('email_templates')
      .select('subject, body_html')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !tpl) {
      console.warn(`[email] Template "${slug}" not found — using fallback. Error:`, error?.message)
      if (fallbackSubject && fallbackHtml) {
        await send({ to, cc, subject: fallbackSubject, html: fallbackHtml })
      }
      return
    }

    // Replace {{variable}} placeholders
    const substitute = (str: string): string =>
      str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))

    await send({
      to,
      cc,
      subject: substitute(tpl.subject),
      html: substitute(tpl.body_html),
    })
  } catch (e) {
    console.error(`[email] sendFromTemplate error for slug "${slug}":`, e)
    // Last resort fallback
    if (fallbackSubject && fallbackHtml) {
      await send({ to, cc, subject: fallbackSubject, html: fallbackHtml })
    }
  }
}


// ─── Public email functions — all use DB templates ────────────────────────────

export async function sendNewLeadInternal(params: {
  firstName: string; lastName: string; email: string
  score?: number | null; startDate?: string | null; duration?: string | null
  caseId: string
  // legacy params (ignored — template handles formatting)
  passportExpiry?: string | null; startDateValue?: string | null
  desiredJob?: string | null; comment?: string | null
}) {
  const { firstName, lastName, email, score, startDate, duration, caseId } = params
  await sendFromTemplate({
    slug: 'new_lead_internal',
    to: CHARLY,
    vars: {
      first_name: firstName, last_name: lastName, email,
      score: score ?? '—', start_date: startDate ?? '—',
      duration: duration ?? '—',
      case_url: `${APP_URL}/fr/cases/${caseId}`,
    },
  })
}

export async function sendRdvConfirmationIntern(p: {
  internEmail: string; prenom: string; rdvDate: string
  meetLink: string; portalToken: string | null | undefined
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'booking_confirmation',
    to: p.internEmail,
    vars: {
      first_name: p.prenom, rdv_date: p.rdvDate,
      meet_link: p.meetLink,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendQualificationEmail(p: {
  internEmail: string; prenom: string; portalToken: string
  nom?: string; tempPassword?: string; qualificationNotes?: string; startDate?: string | null; companyName?: string; portalUrl?: string  // legacy compat
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'qualification_recap',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendJobSubmittedEmployer(params: {
  employerEmail: string; employerName?: string
  internFirstName: string; internLastName: string
  jobTitle: string; cvUrl?: string | null; caseId: string
}) {
  const { employerEmail, employerName, internFirstName, internLastName, jobTitle, cvUrl, caseId } = params
  await sendFromTemplate({
    slug: 'job_submitted_employer',
    to: employerEmail,
    vars: {
      employer_name: employerName ?? '',
      first_name: internFirstName, last_name: internLastName,
      job_title: jobTitle,
      cv_url: cvUrl ?? '',
      verify_url: `${APP_URL}/verify/${caseId}`,
    },
  })
}

export async function sendJobRetenu(p: {
  internEmail: string; prenom: string; companyName?: string; portalToken: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'new_job_alert',
    to: p.internEmail,
    vars: {
      first_name: p.prenom, company_name: p.companyName,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendPaymentRequest(params: {
  internEmail: string; prenom?: string; nom?: string
  packageName?: string; amount: number; invoiceNumber?: string; portalToken?: string | null
  internFirstName?: string; internLastName?: string; invoiceUrl?: string | null
} & Record<string, unknown>) {
  const { internEmail, amount, invoiceNumber, portalToken } = params
  const prenom = params.prenom ?? params.internFirstName ?? 'Candidat'
  const nom = params.nom ?? params.internLastName ?? ''
  await sendFromTemplate({
    slug: 'payment_request',
    to: internEmail, cc: CHARLY,
    vars: {
      first_name: prenom, last_name: nom,
      package_name: params.packageName ?? '',
      amount: `€${amount}`,
      invoice_number: invoiceNumber ?? '',
      portal_url: portalToken ? `${APP_URL}/portal/${portalToken}` : APP_URL,
    },
  })
}

export async function sendPaymentConfirmed(p: {
  internEmail: string; prenom: string; invoiceNumber: string; portalToken: string | null | undefined
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'payment_confirmed',
    to: p.internEmail,
    vars: {
      first_name: p.prenom, invoice_number: p.invoiceNumber,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendVisaDocsRequest(params: {
  internEmail: string; prenom?: string; portalToken: string; visaFormUrl?: string | null
  internFirstName?: string; internLastName?: string  // legacy compat
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'visa_docs_request',
    to: params.internEmail,
    vars: {
      first_name: params.prenom ?? params.internFirstName ?? '',
      portal_url: `${APP_URL}/portal/${params.portalToken}`,
      visa_form_url: params.visaFormUrl ?? `${APP_URL}/portal/${params.portalToken}`,
    },
  })
}

export async function sendVisaSubmitted(p: {
  internEmail: string; prenom: string; portalToken: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'visa_submitted',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendVisaReceived(p: {
  internEmail: string; prenom: string; portalToken: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'visa_received',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendArrivalPrep(p: {
  internEmail: string; prenom: string; portalToken: string; startDate?: string | null
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'arrival_prep',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      start_date: p.startDate ?? '—',
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendWelcomeKit(p: {
  internEmail: string; prenom: string; portalToken: string
  startDate?: string | null; companyName?: string; nom?: string; jobTitle?: string; caseUrl?: string  // legacy compat
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'welcome_kit',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
    },
  })
}

export async function sendWelcomeKitShort(p: {
  internEmail: string; prenom: string; portalToken?: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'welcome_portal',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: p.portalToken ? `${APP_URL}/portal/${p.portalToken}` : APP_URL,
    },
  })
}

export async function sendAlumniCongrats(p: {
  internEmail: string; prenom: string; portalToken: string | null | undefined
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'alumni_welcome',
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: p.portalToken ? `${APP_URL}/portal/${p.portalToken}` : APP_URL,
    },
  })
}

export async function sendDossierPretAgent(p: {
  prenom: string; nom: string; caseUrl: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'visa_agent_submission',
    to: CHARLY,
    vars: {
      intern_name: `${p.prenom} ${p.nom}`,
      case_url: p.caseUrl,
    },
  })
}

export async function sendAppAllIndonesia(p: {
  internEmail: string; prenom: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'all_indonesia_j3',
    to: p.internEmail,
    vars: { first_name: p.prenom },
  })
}

export async function sendInternCommentNotification(p: {
  caseId?: string; prenom: string; nom: string; comment: string
  managerEmail?: string; jobTitle?: string; caseUrl?: string; interested?: unknown
} & Record<string, unknown>) {
  const caseLink = p.caseUrl ?? (p.caseId ? `${APP_URL}/fr/cases/${p.caseId}` : APP_URL)
  // Internal notification — no dedicated template, use raw send
  await send({
    to: CHARLY,
    subject: `💬 New comment from ${p.prenom} ${p.nom}`,
    html: `<p><strong>${p.prenom} ${p.nom}</strong> left a comment on their dossier:</p>
           <blockquote style="border-left:3px solid #c8a96e;padding:8px 16px;margin:16px 0">${p.comment}</blockquote>
           <a href="${caseLink}" style="color:#c8a96e">View dossier →</a>`,
  })
}


// Legacy stubs — fonctions supprimées mais importées ailleurs
export async function sendAlerteArrivee(_p: Record<string, unknown> & { prenom?: string; nom?: string; jours?: number; startDate?: string; caseUrl?: string; billetUrl?: string }) {
  console.log('[email] sendAlerteArrivee: migré vers template arrival_prep')
}
export async function sendNewCustomerFazza(_p: Record<string, unknown>) {
  console.log('[email] sendNewCustomerFazza: migré vers portal visa agent')
}
export async function sendRdvConfirmation(p: {
  internEmail: string; prenom?: string; nom?: string; rdvDate?: string
  meetLink?: string; portalToken?: string; internFirstName?: string; internLastName?: string
} & Record<string, unknown>) {
  await sendFromTemplate({
    slug: 'booking_confirmation',
    to: p.internEmail,
    vars: {
      first_name: p.prenom ?? p.internFirstName ?? '',
      rdv_date: p.rdvDate ?? '—',
      meet_link: p.meetLink ?? '',
      portal_url: p.portalToken ? `${APP_URL}/portal/${p.portalToken}` : APP_URL,
    },
  })
}

