import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendPaymentRequest } from '@/lib/email/resend'
import { logActivity } from '@/lib/activity-logger'

const STATUS_LABELS: Record<string, string> = {
  lead: 'Nouveau lead', rdv_booked: 'RDV booké', qualification_done: 'Qualifié',
  job_submitted: 'Jobs proposés', job_retained: 'Job retenu', convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente', payment_received: 'Payé',
  visa_in_progress: 'Visa en cours', visa_received: 'Visa reçu',
  arrival_prep: 'Prép. arrivée', active: 'En stage', alumni: 'Alumni',
  not_interested: 'Pas intéressé', not_qualified: 'Non qualifié',
  on_hold: 'En attente', suspended: 'Suspendu', visa_refused: 'Visa refusé', archived: 'Archivé',
}

const schema = z.object({
  status: z.string(),
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

  // Fetch old status before updating
  const { data: oldCase } = await supabase
    .from('cases')
    .select('status')
    .eq('id', id)
    .single()
  const oldStatus = (oldCase?.status as string) ?? 'unknown'

  const { error } = await supabase
    .from('cases')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get author name
  const authorUser = await supabase.from('app_users').select('full_name').eq('auth_user_id', user.id).maybeSingle()
  const authorName = authorUser?.data?.full_name ?? user.email ?? 'Équipe'

  // Get intern name
  const { data: caseWithIntern } = await supabase
    .from('cases')
    .select('interns(first_name, last_name)')
    .eq('id', id)
    .single()
  const internName = `${(caseWithIntern as any)?.interns?.first_name ?? ''} ${(caseWithIntern as any)?.interns?.last_name ?? ''}`.trim()

  // Log to case_logs
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
    title: `Statut changé → ${STATUS_LABELS[newStatus] ?? newStatus}`,
    description: `Le dossier est passé de "${STATUS_LABELS[oldStatus] ?? oldStatus}" à "${STATUS_LABELS[newStatus] ?? newStatus}"`,
    priority: ['payment_pending', 'arrival_prep'].includes(newStatus) ? 'high' : 'normal',
    metadata: { old_status: oldStatus, new_status: newStatus },
  })

  // Envoyer email paiement quand statut passe à payment_pending
  if (newStatus === 'payment_pending') {
    try {
      const { data: caseRow } = await supabase
        .from('cases')
        .select('payment_amount, fillout_bill_form_url, interns(first_name, email)')
        .eq('id', id)
        .single()

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

  return NextResponse.json({ success: true })
}
