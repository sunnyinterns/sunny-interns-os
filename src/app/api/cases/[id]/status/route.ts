import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  sendPaymentRequest, sendQualificationEmail,
  sendRdvConfirmationIntern, sendVisaReceived, sendAlumniCongrats,
  sendJobRetenu, sendWelcomeKit, sendDossierPretAgent,
} from '@/lib/email/resend'
import { logActivity } from '@/lib/activity-logger'

function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Nouveau lead', rdv_booked: 'RDV booké', qualification_done: 'Qualifié',
  job_submitted: 'Jobs proposed', job_retained: 'Job retained', convention_signed: 'Convention signed',
  payment_pending: 'Payment pending', payment_received: 'Paid',
  visa_in_progress: 'Visa in progress', visa_received: 'Visa received',
  arrival_prep: 'Arrival prep', active: 'Active', alumni: 'Alumni',
  not_interested: 'Pas intéressé', not_qualified: 'Non qualifié',
  to_recontact: 'À recontacter',
  on_hold: 'On hold', suspended: 'Suspended', visa_refused: 'Visa refused', archived: 'Archived',
}

// ── Transition rules ────────────────────────────────────────────────────────
// Key = newStatus, Value = allowed previous statuses (null = any)
// Special: some require DB conditions checked at runtime
const TRANSITION_GATES: Record<string, {
  allowedFrom: string[] | null
  requirePayment?: boolean  // payment_received_at must exist
  requireAgreement?: boolean // sponsor_contract_signed_at must exist
  message: string
}> = {
  visa_in_progress: {
    allowedFrom: ['payment_received', 'convention_signed'], // convention_signed is edge case
    requirePayment: true,
    message: 'Le dossier visa ne peut être envoyé à l\'agent qu\'après confirmation du paiement.',
  },
  visa_received: {
    allowedFrom: ['visa_in_progress', 'visa_refused'],
    message: 'visa_received can only follow visa_in_progress or visa_refused.',
  },
  arrival_prep: {
    allowedFrom: ['visa_received'],
    message: 'La préparation arrivée ne peut commencer qu\'après réception du visa.',
  },
  payment_received: {
    allowedFrom: ['payment_pending', 'convention_signed'],
    message: 'Le paiement ne peut être confirmé qu\'après la convention signée.',
  },
  convention_signed: {
    allowedFrom: ['job_retained', 'job_submitted'],
    requireAgreement: false, // agreement can come later via portal
    message: 'La convention ne peut être signée qu\'une fois un job retenu.',
  },
}

const schema = z.object({
  status: z.string(),
  recontact_at: z.string().optional(),
  recontact_note: z.string().optional().nullable(),
  payment_date: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const newStatus = parsed.data.status

  // Fetch current case state for gating
  const { data: oldCase } = await supabase
    .from('cases')
    .select('status, sponsor_contract_sent_at, payment_received_at')
    .eq('id', id)
    .single()
  const oldStatus = (oldCase?.status as string) ?? 'unknown'

  // ── Gate check ─────────────────────────────────────────────────────────
  const gate = TRANSITION_GATES[newStatus]
  if (gate) {
    if (gate.allowedFrom && !gate.allowedFrom.includes(oldStatus)) {
      return NextResponse.json({
        error: gate.message,
        blocked: true,
        current_status: oldStatus,
        required_statuses: gate.allowedFrom,
      }, { status: 422 })
    }
    if (gate.requirePayment) {
      const hasPayment = !!(oldCase?.payment_received_at) || oldStatus === 'payment_received'
      if (!hasPayment) {
        return NextResponse.json({
          error: gate.message,
          blocked: true,
          hint: 'Confirm payment by marking the case as "payment_received" first.',
        }, { status: 422 })
      }
    }
  }

  const { error } = await supabase
    .from('cases')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...(newStatus === 'payment_received' ? { payment_received_at: new Date().toISOString() } : {}),
      ...(newStatus === 'to_recontact' && parsed.data.recontact_at ? {
        recontact_at: parsed.data.recontact_at,
        recontact_note: parsed.data.recontact_note ?? null,
      } : {}),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authorUser = await supabase.from('app_users').select('full_name').eq('auth_user_id', user.id).maybeSingle()
  const authorName = authorUser?.data?.full_name ?? user.email ?? 'Équipe'

  const { data: caseWithIntern } = await supabase
    .from('cases')
    .select('interns(first_name, last_name)')
    .eq('id', id)
    .single()
  const internName = `${(caseWithIntern as Record<string, unknown> & { interns?: { first_name?: string; last_name?: string } })?.interns?.first_name ?? ''} ${(caseWithIntern as Record<string, unknown> & { interns?: { first_name?: string; last_name?: string } })?.interns?.last_name ?? ''}`.trim()

  await supabase.from('case_logs').insert({
    case_id: id,
    author_name: authorName,
    author_email: user.email,
    action: 'status_changed',
    field_name: 'status',
    field_label: 'Statut',
    old_value: oldStatus,
    new_value: newStatus,
    description: `${authorName} a changé le statut de ${internName} : ${STATUS_LABELS[oldStatus] ?? oldStatus} → ${STATUS_LABELS[newStatus] ?? newStatus}`,
  }).then(() => {}, () => {})

  await logActivity({
    caseId: id,
    type: 'status_changed',
    title: `Statut → ${STATUS_LABELS[newStatus] ?? newStatus}`,
    description: `De "${STATUS_LABELS[oldStatus] ?? oldStatus}" à "${STATUS_LABELS[newStatus] ?? newStatus}"`,
    priority: ['payment_pending', 'arrival_prep', 'visa_in_progress'].includes(newStatus) ? 'high' : 'normal',
    metadata: { old_status: oldStatus, new_status: newStatus },
  })

  // ── Triggers ────────────────────────────────────────────────────────────

  // ── Email confirmation RDV candidat ─────────────────────────────────────
  if (newStatus === 'rdv_booked' && oldStatus !== 'rdv_booked') {
    try {
      const adminRdv = getAdmin()
      const { data: rdvRow } = await adminRdv
        .from('cases')
        .select('portal_token, intern_first_meeting_date, google_meet_link, interns(first_name, email)')
        .eq('id', id).single()
      if (rdvRow) {
        const rdvIntern = (rdvRow as Record<string,unknown>).interns as { first_name?: string; email?: string } | null
        const rdvToken = (rdvRow as Record<string,unknown>).portal_token as string | null
        const rdvDate = (rdvRow as Record<string,unknown>).intern_first_meeting_date as string | null
        const rdvMeet = (rdvRow as Record<string,unknown>).google_meet_link as string | null
        if (rdvIntern?.email && rdvToken) {
          void sendRdvConfirmationIntern({
            internEmail: rdvIntern.email,
            prenom: rdvIntern.first_name ?? 'Candidat',
            rdvDate: rdvDate
              ? new Date(rdvDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
              : 'à confirmer',
            meetLink: rdvMeet ?? '',
            portalToken: rdvToken ?? undefined,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  if (newStatus === 'qualification_done') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('id, portal_token, qualification_notes_for_intern, qualification_notes, interns(first_name, last_name, email)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; email?: string } | null
        let portalToken = (caseRow as Record<string, unknown>).portal_token as string | null
        const tempPassword = generatePassword()
        if (!portalToken) portalToken = crypto.randomUUID()
        await admin.from('cases').update({ portal_token: portalToken, portal_temp_password: tempPassword }).eq('id', id)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'
        const qualNotes = (caseRow as Record<string, unknown>).qualification_notes_for_intern as string ?? ''
        if (intern?.email) {
          void sendQualificationEmail({
            internEmail: intern.email, prenom: intern.first_name ?? 'Intern',
            nom: intern.last_name ?? '', portalToken, tempPassword,
            qualificationNotes: qualNotes,
            portalUrl: `${appUrl}/portal/${portalToken}/login`,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  if (newStatus === 'payment_pending') {
    try {
      const adminPay = getAdmin()
      const { data: caseRow } = await adminPay
        .from('cases')
        .select('payment_amount, portal_token, billing_company_id, interns(first_name, email)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
        const billingCompanyId = (caseRow as Record<string, unknown>).billing_company_id as string | null
        let bankIban = '', bankBic = '', bankName = ''
        if (billingCompanyId) {
          const { data: bc } = await adminPay.from('billing_companies')
            .select('bank_iban, bank_bic, bank_name').eq('id', billingCompanyId).single()
          if (bc) { bankIban = (bc as Record<string,unknown>).bank_iban as string ?? ''; bankBic = (bc as Record<string,unknown>).bank_bic as string ?? ''; bankName = (bc as Record<string,unknown>).bank_name as string ?? '' }
        } else {
          // Fallback: default billing company
          const { data: defBc } = await adminPay.from('billing_companies')
            .select('bank_iban, bank_bic, bank_name').eq('is_default', true).single()
          if (defBc) { bankIban = (defBc as Record<string,unknown>).bank_iban as string ?? ''; bankBic = (defBc as Record<string,unknown>).bank_bic as string ?? ''; bankName = (defBc as Record<string,unknown>).bank_name as string ?? '' }
        }
        if (intern?.email) {
          void sendPaymentRequest({
            internEmail: intern.email,
            internFirstName: intern.first_name ?? 'Intern',
            amount: (caseRow as Record<string, unknown>).payment_amount as number ?? 0,
            portalToken: (caseRow as Record<string, unknown>).portal_token as string | null ?? null,
            bankIban, bankBic, bankName,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── convention_signed → convention_request to intern + sponsor_contract to employer ─
  // Auto-transition: convention_signed immediately moves to payment_pending
  // (convention signing = client confirmed = invoice sent)
  if (newStatus === 'convention_signed') {
    try {
      // Convention email to intern
      const adminConv = getAdmin()
      const { data: convRow } = await adminConv
        .from('cases')
        .select('portal_token, interns(first_name, email)')
        .eq('id', id).single()
      if (convRow) {
        const convIntern = (convRow as Record<string,unknown>).interns as { first_name?: string; email?: string } | null
        const convToken = (convRow as Record<string,unknown>).portal_token as string | null
        if (convIntern?.email) {
          const { sendFromTemplate } = await import('@/lib/email/resend')
          void sendFromTemplate({
            slug: 'convention_request',
            to: convIntern.email,
            vars: {
              first_name: convIntern.first_name ?? '',
              portal_url: convToken ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portal/${convToken}` : '',
            },
          })
        }
      }
      // Sponsor contract to employer
      void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cases/${id}/send-sponsor-contract`, { method: 'POST', headers: { 'x-internal-key': process.env.CRON_SECRET ?? '' } })
      // Auto-transition to payment_pending — convention_signed is just a confirmation step
      // payment_pending trigger will handle sending the payment email
      setTimeout(() => {
        void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cases/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.CRON_SECRET ?? '' },
          body: JSON.stringify({ status: 'payment_pending' }),
        })
      }, 2000)
    } catch { /* non-blocking */ }
  }

  // ── Auto-create billing_entry (revenue) when payment_received ────────────
  if (newStatus === 'payment_received' && oldStatus !== 'payment_received') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('payment_amount, billing_company_id, interns(first_name, last_name, email), packages(name, price_eur)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; email?: string } | null
        const pkg = (caseRow as Record<string, unknown>).packages as { name?: string; price_eur?: number } | null
        const amount = ((caseRow as Record<string, unknown>).payment_amount as number) ?? pkg?.price_eur ?? 0
        if (amount > 0) {
          await admin.from('billing_entries').insert({
            case_id: id, type: 'revenue', category: 'package',
            label: `Payment ${intern?.first_name ?? ''} ${intern?.last_name ?? ''} — ${pkg?.name ?? 'Package'}`,
            amount_eur: amount,
            paid_at: new Date().toISOString(), recorded_at: new Date().toISOString(), billing_type: 'payment',
          })
        }
        // Send payment confirmed email
        if (intern?.email && intern.first_name) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'
          const { data: caseTokenRow } = await admin.from('cases').select('portal_token').eq('id', id).single()
          const token = (caseTokenRow as Record<string, unknown>)?.portal_token as string | null
          if (token) {
            void sendWelcomeKitShortProxy(intern.email, intern.first_name, token, appUrl)
          }
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── Validation avant visa_in_progress ────────────────────────────────────
  if (newStatus === 'visa_in_progress') {
    const adminChk = getAdmin()
    const { data: chkRow } = await adminChk.from('cases')
      .select('visa_type_id, actual_start_date')
      .eq('id', id).single()
    const warnings: string[] = []
    if (!chkRow?.visa_type_id) warnings.push('visa_type_id is not set')
    if (!chkRow?.actual_start_date) warnings.push('actual_start_date is not set')
    // Log warnings but don't block — Charly decides
    if (warnings.length > 0) {
      void adminChk.from('admin_notifications').insert({
        type: 'visa_missing_fields',
        title: `⚠️ Visa dossier missing fields — ${warnings.join(', ')}`,
        body: 'Check the case before submitting to the agent.',
        case_id: id,
        priority: 'high',
        is_read: false,
      }).then(() => null, () => null)
    }
  }

  // ── visa_in_progress → create portal_access + email to agent ─────────────
  if (newStatus === 'visa_in_progress' && oldStatus !== 'visa_in_progress') {
    try {
      const admin = getAdmin()
      const { data: fullCase } = await admin
        .from('cases')
        .select(`
          id, portal_token, note_for_agent, visa_type_id, actual_start_date, actual_end_date,
          fazza_transfer_amount_idr, visa_submitted_to_agent_at,
          interns(first_name, last_name, email, whatsapp, nationality, passport_expiry, birth_date, spoken_languages, cv_url),
          contacts!cases_employer_contact_id_fkey(companies!contacts_company_id_fkey(name)),
          packages(name, visa_cost_idr, visa_agents(company_name, name, email, whatsapp)),
          visa_types(code, name)
        `)
        .eq('id', id).single()

      if (fullCase) {
        const intern = (fullCase as Record<string, unknown>).interns as Record<string, unknown> | null
        const pkg = (fullCase as Record<string, unknown>).packages as Record<string, unknown> | null
        const agent = (pkg?.visa_agents as Record<string, unknown>) ?? null
        const company = ((fullCase as Record<string, unknown>).contacts as Record<string, unknown>)?.companies as Record<string, unknown> | null
        const visaType = (fullCase as Record<string, unknown>).visa_types as Record<string, unknown> | null

        // 1. Create/update visa_agent_portal_access
        const agentToken = crypto.randomUUID().replace(/-/g, '')
        const defaultAgentId = agent ? null : (await admin.from('visa_agents').select('id').eq('is_default', true).single())?.data?.id
        const { data: existingAccess } = await admin.from('visa_agent_portal_access')
          .select('id').eq('case_id', id).maybeSingle()
        if (!existingAccess) {
          await admin.from('visa_agent_portal_access').insert({
            case_id: id,
            visa_agent_id: (pkg?.visa_agent_id as string) ?? defaultAgentId,
            token: agentToken,
            sent_at: new Date().toISOString(),
            agent_status: 'pending',
          })
        }

        // 2. Mark case as submitted to agent
        await admin.from('cases').update({ visa_submitted_to_agent_at: new Date().toISOString() }).eq('id', id)

        // 3. Email to agent (if configured)
        if (agent?.email && intern) {
          const startDate = (fullCase as Record<string, unknown>).actual_start_date as string ?? ''
          const endDate = (fullCase as Record<string, unknown>).actual_end_date as string ?? ''
          const days = startDate && endDate
            ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
            : 90
          // Visa agent email via sendDossierPretAgent (template visa_agent_submission)
          void sendDossierPretAgent({
            caseId: id,
            agentEmail: String(agent.email),
            noteForAgent: String((fullCase as Record<string, unknown>).note_for_agent ?? ''),
          })
        }
      }
    } catch (e) { console.log('[visa_in_progress trigger]', e) }
  }

  // ── job_retained → email to intern ───────────────────────────────────────
  if (newStatus === 'job_retained' && oldStatus !== 'job_retained') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('portal_token, interns(first_name, email), contacts!cases_employer_contact_id_fkey(companies!contacts_company_id_fkey(name))')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
        const company = ((caseRow as Record<string, unknown>).contacts as Record<string, unknown>)?.companies as { name?: string } | null
        const token = (caseRow as Record<string, unknown>).portal_token as string | null
        if (intern?.email && token) {
          void sendJobRetenu({
            internEmail: intern.email,
            prenom: intern.first_name ?? 'Intern',
            companyName: company?.name ?? 'l\'entreprise',
            portalToken: token,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── arrival_prep → send arrival guide to intern ───────────────────────────

  // ── arrival_prep → driver notification (manager) ──────────────────────────
  if (newStatus === 'arrival_prep' && oldStatus !== 'arrival_prep') {
    try {
      const adminDrv = getAdmin()
      const { data: drvRow } = await adminDrv
        .from('cases')
        .select('interns(first_name, last_name, whatsapp), flight_number, flight_arrival_time_local, dropoff_address')
        .eq('id', id).single()
      if (drvRow) {
        const drvIntern = (drvRow as Record<string,unknown>).interns as { first_name?: string; last_name?: string; whatsapp?: string } | null
        const { sendFromTemplate } = await import('@/lib/email/resend')
        void sendFromTemplate({
          slug: 'driver_notification',
          to: 'charly@bali-interns.com',
          vars: {
            intern_name: `${drvIntern?.first_name ?? ''} ${drvIntern?.last_name ?? ''}`.trim(),
            intern_whatsapp: drvIntern?.whatsapp ?? '—',
            flight_number: String((drvRow as Record<string,unknown>).flight_number ?? '—'),
            arrival_time: String((drvRow as Record<string,unknown>).flight_arrival_time_local ?? '—'),
            dropoff_address: String((drvRow as Record<string,unknown>).dropoff_address ?? '—'),
          },
        })
      }
    } catch { /* non-blocking */ }
  }

  // ── Email visa reçu ───────────────────────────────────────────────────
  if (newStatus === 'visa_received' && oldStatus !== 'visa_received') {
    try {
      const adminVr = getAdmin()
      const { data: vrRow } = await adminVr.from('cases')
        .select('portal_token, visa_url, interns(first_name, email)')
        .eq('id', id).single()
      if (vrRow) {
        const vrIntern = (vrRow as Record<string,unknown>).interns as { first_name?: string; email?: string } | null
        const vrToken = (vrRow as Record<string,unknown>).portal_token as string | null
        const vrVisaUrl = (vrRow as Record<string,unknown>).visa_url as string | null
        if (vrIntern?.email && vrToken) {
          void sendVisaReceived({
            internEmail: vrIntern.email,
            prenom: vrIntern.first_name ?? 'Intern',
            portalToken: vrToken ?? undefined,
            visaUrl: vrVisaUrl ?? undefined,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  if (newStatus === 'arrival_prep' && oldStatus !== 'arrival_prep') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('portal_token, interns(first_name, email), actual_start_date')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
        const startDate = (caseRow as Record<string, unknown>).actual_start_date as string | null
        const token = (caseRow as Record<string, unknown>).portal_token as string | null
        if (intern?.email) {
          const { sendArrivalPrep } = await import('@/lib/email/resend')
          void sendArrivalPrep({
            internEmail: intern.email,
            prenom: intern.first_name ?? 'Intern',
            portalToken: token ?? '',
            startDate: startDate ?? undefined,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── active → send welcome kit ─────────────────────────────────────────────
  if (newStatus === 'active' && oldStatus !== 'active') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('portal_token, interns(first_name, email)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
        const token = (caseRow as Record<string, unknown>).portal_token as string | null
        if (intern?.email && token) {
          void sendWelcomeKit({
            internEmail: intern.email,
            prenom: intern.first_name ?? 'Intern',
            portalToken: token,
          })
        }
        await admin.from('cases').update({ welcome_kit_sent_at: new Date().toISOString() }).eq('id', id)
      }
    } catch { /* non-blocking */ }
  }


  // ── Email alumni ──────────────────────────────────────────────────────
  if (newStatus === 'alumni' && oldStatus !== 'alumni') {
    try {
      const adminAl = getAdmin()
      const { data: alRow } = await adminAl.from('cases').select('portal_token, interns(first_name, email)').eq('id', id).single()
      if (alRow) {
        const alIntern = (alRow as Record<string,unknown>).interns as { first_name?: string; email?: string } | null
        const alToken = (alRow as Record<string,unknown>).portal_token as string | null
        if (alIntern?.email && alToken) {
          const { data: jsData } = await adminAl.from('job_submissions').select('jobs(companies(name))').eq('case_id', id).eq('status', 'retained').limit(1).maybeSingle()
          const coName = (((jsData?.jobs as unknown) as Record<string,unknown> | null)?.companies as Record<string,unknown> | null)?.name as string ?? 'your host company'
          void sendAlumniCongrats({ internEmail: alIntern.email, prenom: alIntern.first_name ?? 'Candidat', companyName: coName, portalToken: alToken })
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── admin notification for key transitions ────────────────────────────────
  const notifConfig: Record<string, { title: string; type: string; priority: string }> = {
    rdv_booked:         { title: `📅 RDV booké — ${internName}`, type: 'rdv', priority: 'normal' },
    qualification_done: { title: `✅ Qualif OK — ${internName}`, type: 'qualif', priority: 'normal' },
    job_submitted:      { title: `💼 Jobs proposés — ${internName}`, type: 'job', priority: 'normal' },
    job_retained:       { title: `🎉 Job retenu — ${internName}`, type: 'job', priority: 'high' },
    convention_signed:  { title: `📝 Convention signée — ${internName}`, type: 'contract', priority: 'high' },
    payment_received:   { title: `💰 Paiement reçu — ${internName}`, type: 'payment', priority: 'critical' },
    visa_received:      { title: `🛂 Visa received — ${internName} — next: arrival prep`, type: 'visa', priority: 'high' },
    visa_refused:       { title: `❌ Visa refused — ${internName} — contact agent for reason`, type: 'visa', priority: 'critical' },
    active:             { title: `🌴 Internship started — ${internName}`, type: 'stage', priority: 'normal' },
    alumni:             { title: `🎓 Internship completed — ${internName}`, type: 'alumni', priority: 'normal' },
    to_recontact:       { title: `🔄 À recontacter — ${internName}`, type: 'recontact', priority: 'normal' },
  }
  const notifEntry = notifConfig[newStatus]
  if (notifEntry) {
    try {
      const admin = getAdmin()
      await admin.from('admin_notifications').insert({
        title: notifEntry.title,
        message: `Statut : ${STATUS_LABELS[oldStatus] ?? oldStatus} → ${STATUS_LABELS[newStatus] ?? newStatus}`,
        type: notifEntry.type,
        case_id: id,
        is_read: false,
        action_url: `/fr/cases/${id}`,
      })
    } catch { /* non-blocking */ }
  }


  // ── Disqualification → flag pending email draft (Charly reviews before sending) ──
  const DISQUALIFICATION_STATUSES = [
    'not_interested', 'not_qualified', 'no_show',
    'hors_qualification', 'no_budget', 'refus_general',
  ]
  if (DISQUALIFICATION_STATUSES.includes(newStatus) && !DISQUALIFICATION_STATUSES.includes(oldStatus)) {
    try {
      const adminDq = getAdmin()
      // Fetch current flags to merge
      const { data: flagRow } = await adminDq
        .from('cases')
        .select('alert_sent_flags')
        .eq('id', id).single()
      const existingFlags = (flagRow?.alert_sent_flags ?? {}) as Record<string, unknown>
      await adminDq.from('cases').update({
        alert_sent_flags: {
          ...existingFlags,
          pending_thank_you_email: true,   // draft shown in case detail
          thank_you_disqualification_reason: newStatus,
        },
      }).eq('id', id)
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true, new_status: newStatus })
}

// Helper: send payment confirmed email (reuse welcome_kit_short)
async function sendWelcomeKitShortProxy(email: string, prenom: string, token: string, appUrl: string) {
  const { sendWelcomeKitShort } = await import('@/lib/email/resend')
  void sendWelcomeKitShort({ internEmail: email, prenom })
  void fetch(`${appUrl}/api/notifications/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'payment_confirmed', intern_name: prenom, portal_token: token }),
  }).catch(() => null)
}
