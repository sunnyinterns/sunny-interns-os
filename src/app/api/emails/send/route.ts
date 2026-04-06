import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPaymentRequest, sendNewLeadInternal, sendJobSubmittedEmployer } from '@/lib/email/resend'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    type: string
    caseId?: string
    internEmail?: string
    paymentAmount?: number
    filloutBillFormUrl?: string
    to?: string
    subject?: string
    html?: string
    templateId?: string
    variables?: Record<string, string>
  }

  try {
    if (body.type === 'payment_request' && body.caseId) {
      // Fetch intern email from case if not provided
      let internEmail = body.internEmail
      let internFirstName = 'Stagiaire'
      if (body.caseId && !internEmail) {
        const { data: c } = await supabase
          .from('cases')
          .select('first_name, last_name, interns(email)')
          .eq('id', body.caseId)
          .single()
        if (c) {
          internFirstName = (c as Record<string, unknown>).first_name as string ?? 'Stagiaire'
          const intern = (c as Record<string, unknown>).interns as { email?: string } | null
          internEmail = intern?.email
        }
      }
      if (!internEmail) return NextResponse.json({ error: 'Email stagiaire introuvable' }, { status: 400 })
      await sendPaymentRequest({
        internEmail,
        internFirstName,
        amount: body.paymentAmount ?? 0,
        invoiceUrl: body.filloutBillFormUrl ?? null,
      })
      return NextResponse.json({ success: true })
    }

    if (body.type === 'employer_docs_reminder' && body.caseId) {
      // Fetch employer email from active job submission
      const { data: sub } = await supabase
        .from('job_submissions')
        .select('jobs(title, companies(name, email))')
        .eq('case_id', body.caseId)
        .eq('status', 'retained')
        .maybeSingle()

      if (sub) {
        const job = (sub as Record<string, unknown>).jobs as Record<string, unknown> | null
        const company = job?.companies as Record<string, unknown> | null
        if (company?.email) {
          const { data: c } = await supabase
            .from('cases')
            .select('first_name, last_name')
            .eq('id', body.caseId)
            .single()
          await sendJobSubmittedEmployer({
            employerEmail: company.email as string,
            employerName: company.name as string | undefined,
            internFirstName: (c as Record<string, unknown>)?.first_name as string ?? '',
            internLastName: (c as Record<string, unknown>)?.last_name as string ?? '',
            jobTitle: job?.title as string ?? 'Stage',
            caseId: body.caseId,
          })
          return NextResponse.json({ success: true })
        }
      }
      return NextResponse.json({ error: 'Employeur introuvable' }, { status: 404 })
    }

    // Generic / legacy email
    if (body.to && (body.html || body.subject)) {
      console.log('[EMAIL]', { to: body.to, subject: body.subject, templateId: body.templateId })
      return NextResponse.json({ success: true, provider: 'console' })
    }

    return NextResponse.json({ error: 'Type email non reconnu' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
