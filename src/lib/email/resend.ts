import { Resend } from 'resend'
import { createClient as svcClient } from '@supabase/supabase-js'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Charly from Bali Interns <team@bali-interns.com>'
const CHARLY = 'charly@bali-interns.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'

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
export async function sendFromTemplate(opts: {
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
  portalUrl?: string | null
}) {
  const { employerEmail, employerName, internFirstName, internLastName, jobTitle, cvUrl, caseId, portalUrl } = params
  await sendFromTemplate({
    slug: 'job_submitted_employer',
    to: employerEmail,
    vars: {
      employer_name: employerName ?? '',
      first_name: internFirstName, last_name: internLastName,
      job_title: jobTitle,
      cv_url: cvUrl ?? '',
      verify_url: `${APP_URL}/verify/${caseId}`,
      portal_url: portalUrl ?? `${APP_URL}/portal/employer/`,
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
      bank_iban: (params as Record<string,unknown>).bankIban as string ?? '',
      bank_bic: (params as Record<string,unknown>).bankBic as string ?? '',
      bank_name: (params as Record<string,unknown>).bankName as string ?? '',
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
  internEmail: string; prenom: string; portalToken: string; visaUrl?: string | null
} & Record<string, unknown>) {
  // If a visa URL is attached, use the richer template with download button
  const slug = p.visaUrl ? 'visa_received_intern' : 'visa_received'
  await sendFromTemplate({
    slug,
    to: p.internEmail,
    vars: {
      first_name: p.prenom,
      portal_url: `${APP_URL}/portal/${p.portalToken}`,
      visa_url: p.visaUrl ?? `${APP_URL}/portal/${p.portalToken}/visa`,
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

export async function sendRdvReminder(p: {
  internEmail: string; firstName: string; rdvDate: string; meetLink?: string; portalToken?: string
}): Promise<void> {
  await sendFromTemplate({
    slug: 'rdv_reminder',
    to: p.internEmail,
    vars: {
      first_name: p.firstName,
      rdv_time: p.rdvDate,
      meet_link: p.meetLink ?? '',
      portal_url: p.portalToken ? `${APP_URL}/portal/${p.portalToken}` : APP_URL,
    },
  })
}

export async function sendApplyConfirmationEN(p: {
  internEmail: string; firstName: string; portalToken?: string
}): Promise<void> {
  await sendFromTemplate({
    slug: 'apply_confirmation_en',
    to: p.internEmail,
    vars: {
      first_name: p.firstName,
      portal_url: p.portalToken ? `${APP_URL}/portal/${p.portalToken}` : APP_URL,
    },
  })
}

export async function sendDossierPretAgent(opts: {
  caseId: string
  agentEmail?: string  // override — if absent, fetch default agent from DB
  managerName?: string
  managerWhatsapp?: string
  noteForAgent?: string
}): Promise<void> {
  const { caseId, noteForAgent } = opts
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const sb = svcClient(supabaseUrl, serviceKey)

    // 1. Fetch case + intern
    const { data: cas } = await sb.from('cases')
      .select(`
        id, status, desired_start_date, actual_start_date, actual_end_date,
        desired_duration_months, portal_token, assigned_manager_name,
        visa_type_id,
        interns ( id, first_name, last_name, email, whatsapp, nationality,
                  birth_date, passport_number, passport_expiry,
                  cv_url, local_cv_url, extra_docs_urls ),
        jobs ( title, companies ( name ) )
      `)
      .eq('id', caseId)
      .maybeSingle()

    if (!cas) { console.error('[sendDossierPretAgent] Case not found:', caseId); return }

    const intern = cas.interns as unknown as Record<string, unknown> | null
    const job    = cas.jobs as unknown as Record<string, unknown> | null
    const comp   = job ? (job.companies as unknown as Record<string, unknown> | null) : null

    // 2. Fetch visa type label
    let visaTypeLabel = '—'
    if (cas.visa_type_id) {
      const { data: vt } = await sb.from('visa_types').select('name').eq('id', cas.visa_type_id).maybeSingle()
      if (vt) visaTypeLabel = String(vt.name ?? '—')
    }

    // 3. Resolve visa agent email (opts override OR default agent in DB)
    let agentEmail = opts.agentEmail ?? CHARLY
    if (!opts.agentEmail) {
      const { data: agent } = await sb.from('visa_agents')
        .select('email').eq('is_default', true).eq('is_active', true).maybeSingle()
      if (agent?.email) agentEmail = String(agent.email)
    }

    // 4. Build portal URLs
    const portalToken = String(cas.portal_token ?? '')
    const portalUrl   = portalToken ? `${APP_URL}/portal/${portalToken}` : APP_URL
    const agentToken  = caseId // simplify: use case_id as lookup for agent portal
    const agentPortalUrl = `${APP_URL}/portal/agent?case=${caseId}`
    const caseUrl = `${APP_URL}/fr/cases/${caseId}`

    // 5. Format dates
    const fmtDate = (d: unknown) => d ? new Date(String(d)).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : '—'
    const startDate = fmtDate(cas.actual_start_date ?? cas.desired_start_date)
    const endDate   = fmtDate(cas.actual_end_date)
    const durationMonths = cas.desired_duration_months ? `${cas.desired_duration_months}` : '—'

    // 6. Build attachments array for Resend (remote URLs via path)
    type ResendAttachment = { filename: string; path: string }
    const attachments: ResendAttachment[] = []
    const cvUrl = String(intern?.cv_url ?? intern?.local_cv_url ?? '')
    if (cvUrl) attachments.push({ filename: `CV_${String(intern?.last_name ?? 'intern')}.pdf`, path: cvUrl })

    const rawExtra = intern?.extra_docs_urls; const extraDocs = Array.isArray(rawExtra) ? rawExtra as string[] : []
    extraDocs.forEach((url, i) => {
      if (url) attachments.push({ filename: `document_${i + 1}.pdf`, path: url })
    })

    // 7. Send
    if (!resend) { console.warn('[sendDossierPretAgent] RESEND_API_KEY not set'); return }

    const internName = `${String(intern?.first_name ?? '')} ${String(intern?.last_name ?? '')}`.trim()
    const managerName = opts.managerName ?? 'Charly Gestede'
    const managerWhatsapp = opts.managerWhatsapp ?? '+62 xxx xxx xxxx'

    // Use sendFromTemplate with all vars (template uses {{variable}} syntax)
    await sendFromTemplate({
      slug: 'visa_agent_submission',
      to: agentEmail,
      cc: CHARLY,
      vars: {
        intern_name:        internName,
        first_name:         String(intern?.first_name ?? ''),
        last_name:          String(intern?.last_name ?? ''),
        birth_date:         fmtDate(intern?.birth_date),
        nationality:        String(intern?.nationality ?? '—'),
        passport_number:    String(intern?.passport_number ?? '—'),
        passport_expiry:    fmtDate(intern?.passport_expiry),
        intern_email:       String(intern?.email ?? '—'),
        intern_whatsapp:    String(intern?.whatsapp ?? '—'),
        company_name:       String(comp?.name ?? '—'),
        job_title:          String(job?.title ?? '—'),
        visa_type:          visaTypeLabel,
        start_date:         startDate,
        end_date:           endDate,
        duration_months:    durationMonths,
        cv_url:             cvUrl || '',
        convention_url:     '',  // populated later when convention is signed
        photo_url:          '',  // if photo field added to interns table
        note_for_agent:     noteForAgent ?? '',
        portal_url:         portalUrl,
        agent_portal_url:   agentPortalUrl,
        case_url:           caseUrl,
        sent_date:          new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }),
        manager_name:       managerName,
        manager_whatsapp:   managerWhatsapp,
      },
    })

    // 8. If attachments, send a second email with just the PJ (Resend doesn't support attachments in template flow)
    if (attachments.length > 0) {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [agentEmail],
        cc: [CHARLY],
        subject: `[ATTACHMENTS] Visa dossier — ${internName}`,
        html: `<p>Please find attached documents for <strong>${internName}</strong>'s visa dossier.<br/>Full dossier sent separately.</p><ul>${attachments.map(a => `<li>${a.filename}</li>`).join('')}</ul>`,
        attachments: attachments.map(a => ({ filename: a.filename, path: a.path })),
      })
      if (error) console.error('[sendDossierPretAgent] attachments email error:', error)
      else console.log('[sendDossierPretAgent] attachments sent, id:', data?.id)
    }

    console.log('[sendDossierPretAgent] Dossier sent to agent:', agentEmail)
  } catch (e) {
    console.error('[sendDossierPretAgent] Error:', e)
  }
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


// Legacy stubs (non Fillout)
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

