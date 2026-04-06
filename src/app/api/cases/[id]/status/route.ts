import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendPaymentRequest } from '@/lib/email/resend'

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

  const { error } = await supabase
    .from('cases')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await supabase.from('activity_feed').insert({
      case_id: id,
      action_type: 'status_changed',
      description: `Statut → ${newStatus}`,
      created_by: user.id,
    })
  } catch { /* non-blocking */ }

  // Envoyer email paiement quand statut passe à payment_pending
  if (newStatus === 'payment_pending') {
    try {
      const { data: caseRow } = await supabase
        .from('cases')
        .select('first_name, last_name, payment_amount, fillout_bill_form_url, interns(email)')
        .eq('id', id)
        .single()

      if (caseRow) {
        const intern = (caseRow as Record<string, unknown>).interns as { email?: string } | null
        if (intern?.email) {
          void sendPaymentRequest({
            internEmail: intern.email,
            internFirstName: (caseRow as Record<string, unknown>).first_name as string ?? 'Stagiaire',
            amount: (caseRow as Record<string, unknown>).payment_amount as number ?? 0,
            invoiceUrl: (caseRow as Record<string, unknown>).fillout_bill_form_url as string | null ?? null,
          })
        }
      }
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true })
}
