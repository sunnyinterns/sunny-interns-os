import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendPaymentRequest, sendQualificationEmail } from '@/lib/email/resend'
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
  job_submitted: 'Jobs proposés', job_retained: 'Job retenu', convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente', payment_received: 'Payé',
  visa_in_progress: 'Visa en cours', visa_received: 'Visa reçu',
  arrival_prep: 'Prép. arrivée', active: 'En stage', alumni: 'Alumni',
  not_interested: 'Pas intéressé', not_qualified: 'Non qualifié',
  on_hold: 'En attente', suspended: 'Suspendu', visa_refused: 'Visa refusé', archived: 'Archivé',
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
    message: 'Le statut visa reçu ne peut suivre que visa_in_progress ou visa_refused.',
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

const schema = z.object({ status: z.string() })

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
          hint: 'Confirmez le paiement en passant le dossier en "payment_received" d\'abord.',
        }, { status: 422 })
      }
    }
  }

  const { error } = await supabase
    .from('cases')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      // Track payment date automatically
      ...(newStatus === 'payment_received' ? { payment_received_at: new Date().toISOString() } : {}),
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
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
        const qualNotes = (caseRow as Record<string, unknown>).qualification_notes_for_intern as string ?? ''
        if (intern?.email) {
          void sendQualificationEmail({
            internEmail: intern.email, prenom: intern.first_name ?? 'Stagiaire',
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
      const { data: caseRow } = await supabase
        .from('cases')
        .select('payment_amount, fillout_bill_form_url, interns(first_name, email)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
        if (intern?.email) {
          void sendPaymentRequest({
            internEmail: intern.email,
            internFirstName: intern.first_name ?? 'Stagiaire',
            amount: (caseRow as Record<string, unknown>).payment_amount as number ?? 0,
            invoiceUrl: (caseRow as Record<string, unknown>).fillout_bill_form_url as string | null ?? null,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  // ── Auto-trigger convention letter when convention_signed ────────────────
  if (newStatus === 'convention_signed') {
    try {
      void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cases/${id}/send-sponsor-contract`, { method: 'POST' })
    } catch { /* non-blocking */ }
  }

  // ── Auto-create billing_entry (revenue) when payment_received ────────────
  if (newStatus === 'payment_received' && oldStatus !== 'payment_received') {
    try {
      const admin = getAdmin()
      const { data: caseRow } = await admin
        .from('cases')
        .select('payment_amount, billing_company_id, interns(first_name, last_name), packages(name, price_eur)')
        .eq('id', id).single()
      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string } | null
        const pkg = (caseRow as Record<string, unknown>).packages as { name?: string; price_eur?: number } | null
        const amount = ((caseRow as Record<string, unknown>).payment_amount as number)
          ?? pkg?.price_eur ?? 0
        if (amount > 0) {
          await admin.from('billing_entries').insert({
            case_id: id,
            type: 'revenue',
            category: 'package',
            label: `Paiement ${intern?.first_name ?? ''} ${intern?.last_name ?? ''} — ${pkg?.name ?? 'Package'}`,
            amount_eur: amount,
            paid_at: new Date().toISOString(),
            recorded_at: new Date().toISOString(),
            billing_type: 'payment',
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true, new_status: newStatus })
}
