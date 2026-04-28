import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendFromTemplate(opts: { slug: string; to: string; vars: Record<string, string> }) {
  const admin = getAdmin()
  const { data: tmpl } = await admin.from('email_templates').select('subject, body_html')
    .eq('slug', opts.slug).eq('is_active', true).single()
  if (!tmpl) return
  let subject = tmpl.subject as string
  let html = tmpl.body_html as string
  for (const [k, v] of Object.entries(opts.vars)) {
    const re = new RegExp(`{{${k}}}`, 'g')
    subject = subject.replace(re, v ?? '')
    html = html.replace(re, v ?? '')
  }
  const { Resend } = await import('resend')
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'Bali Interns <team@bali-interns.com>',
    to: opts.to,
    subject,
    html,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const admin = getAdmin()
  const body = await req.json() as { decision: 'interested' | 'not_interested' }

  if (!['interested', 'not_interested'].includes(body.decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  // Verify token
  const { data: access } = await admin
    .from('employer_portal_access')
    .select('company_id, contact_id')
    .eq('token', token)
    .single()
  if (!access) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  // Load submission
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`*, jobs(public_title, title, companies!jobs_company_id_fkey(name)),
      cases!job_submissions_case_id_fkey(interns(first_name, last_name))`)
    .eq('id', subId)
    .single()
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update decision
  await admin.from('job_submissions').update({
    employer_decision: body.decision,
    employer_decision_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subId)

  // Notify Charly
  const job = sub.jobs as Record<string, unknown> | null
  const caseData = sub.cases as Record<string, unknown> | null
  const intern = (caseData?.interns ?? {}) as Record<string, unknown>
  const company = (job?.companies ?? {}) as Record<string, unknown>
  const title = (job?.public_title ?? job?.title ?? 'internship') as string
  const internName = `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim()
  const decisionLabel = body.decision === 'interested' ? '✅ Interested' : '❌ Not a match'

  await admin.from('admin_notifications').insert({
    type: 'employer_decision',
    title: `Employer ${decisionLabel} — ${internName}`,
    message: `${company.name ?? 'Employer'} marked "${decisionLabel}" for ${internName} (${title}). ${body.decision === 'interested' ? 'Contact the candidate — they need to confirm their interest too.' : 'Consider proposing another candidate.'}`,
    case_id: sub.case_id,
    priority: body.decision === 'interested' ? 'high' : 'normal',
    read: false,
  }).then(() => null, () => null)

  // Notify Charly by email
  try {
    await sendFromTemplate({
      slug: 'internal_employer_decision',
      to: 'team@bali-interns.com',
      vars: {
        employer_name: company.name as string ?? '',
        intern_name: internName,
        job_title: title,
        decision: decisionLabel,
        action_needed: body.decision === 'interested'
          ? 'Contact the candidate directly — they need to confirm their interest on their portal or via WhatsApp.'
          : 'Consider sending another candidate profile.',
      },
    })
  } catch { /* non-blocking */ }

  await admin.from('activity_feed').insert({
    case_id: sub.case_id,
    type: 'employer_decision',
    title: `Employer: ${decisionLabel}`,
    description: `${company.name ?? 'Employer'} responded "${body.decision}" for "${title}"`,
    source: 'employer_portal',
    status: 'completed',
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true, decision: body.decision })
}
