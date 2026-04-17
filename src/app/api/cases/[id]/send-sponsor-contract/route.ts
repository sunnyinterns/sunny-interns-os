import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params
  const sb = svc()

  const { data: c, error } = await sb
    .from('cases')
    .select(`
      id, status, sponsor_contract_sent_at,
      interns(first_name, last_name, email),
      contacts!cases_employer_contact_id_fkey(
        id, first_name, last_name, email,
        companies!contacts_company_id_fkey(id, name)
      ),
      job_submissions!job_submissions_case_id_fkey(
        status,
        jobs!job_submissions_job_id_fkey(
          id, public_title, title,
          wished_duration_months,
          companies!jobs_company_id_fkey(id, name)
        )
      )
    `)
    .eq('id', caseId)
    .single()

  if (error || !c) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  if (c.sponsor_contract_sent_at) return NextResponse.json({ ok: true, skipped: true, reason: 'already_sent' })

  const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as {
    first_name: string; last_name: string; email: string
  } | null

  const ec = (Array.isArray(c.contacts) ? c.contacts[0] : c.contacts as unknown) as {
    id: string; first_name: string | null; last_name: string | null; email: string | null
    companies: { id: string; name: string } | null
  } | null

  if (!ec?.email) return NextResponse.json({ error: 'No employer contact email' }, { status: 400 })

  const subs = c.job_submissions as unknown as Array<{
    status: string
    jobs: { id: string; public_title: string | null; title: string | null; wished_duration_months: number | null; companies: { id: string; name: string } | null } | null
  }>
  const retained = subs?.find(s => s.status === 'retained')

  const companyId = ec.companies?.id ?? retained?.jobs?.companies?.id
  const companyName = ec.companies?.name ?? retained?.jobs?.companies?.name ?? 'your company'
  const internName = intern ? `${intern.first_name} ${intern.last_name}` : 'the intern'
  const jobTitle = retained?.jobs?.public_title ?? retained?.jobs?.title ?? 'Internship'
  const duration = retained?.jobs?.wished_duration_months ?? '?'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // Create portal access
  const { data: existing } = await sb.from('employer_portal_access').select('token').eq('case_id', caseId).maybeSingle()
  let portalToken = existing?.token

  if (!portalToken) {
    const { data: newAccess, error: ae } = await sb
      .from('employer_portal_access')
      .insert({ company_id: companyId, contact_id: ec.id, case_id: caseId, sent_at: new Date().toISOString() })
      .select('token').single()
    if (ae || !newAccess) return NextResponse.json({ error: 'Failed to create portal access' }, { status: 500 })
    portalToken = newAccess.token
  }

  const portalUrl = `${appUrl}/portal/employer/${portalToken}`

  // Fetch email template from DB
  const { data: tmpl } = await sb
    .from('email_templates')
    .select('subject, body_html')
    .eq('slug', 'sponsor_contract_employer')
    .single()

  const subject = (tmpl?.subject ?? 'Partnership Agreement to sign — {{intern_name}} at {{company_name}}')
    .replace('{{intern_name}}', internName)
    .replace('{{company_name}}', companyName)

  const body = (tmpl?.body_html ?? '')
    .replace(/{{contact_name}}/g, ec.first_name ?? 'Partner')
    .replace(/{{intern_name}}/g, internName)
    .replace(/{{company_name}}/g, companyName)
    .replace(/{{job_title}}/g, jobTitle)
    .replace(/{{duration}}/g, String(duration))
    .replace(/{{start_date}}/g, 'TBD')
    .replace(/{{sponsor_name}}/g, 'PT Bintang Beruntung Indonesia')
    .replace(/{{employer_portal_url}}/g, portalUrl)
    .replace(/{{manager_name}}/g, 'Sidney, Bali Interns')

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Bali Interns <team@bali-interns.com>',
      to: ec.email,
      replyTo: 'sidney@bali-interns.com',
      subject,
      html: body,
    })
  } catch (e) {
    console.error('[send-sponsor-contract] Email failed:', e)
  }

  await sb.from('cases').update({ sponsor_contract_sent_at: new Date().toISOString() }).eq('id', caseId)

  await sb.from('en_attente').insert([
    { case_id: caseId, type: 'convention', waiting_for: 'employer', notes: `${companyName} doit signer le Partnership Agreement`, due_date: new Date(Date.now() + 5*86400000).toISOString() },
    { case_id: caseId, type: 'engagement_letter', waiting_for: 'intern', notes: `${internName} doit signer la Liability Agreement Letter`, due_date: new Date(Date.now() + 5*86400000).toISOString() },
  ]).then(() => {}, () => {})

  await sb.from('activity_feed').insert({
    case_id: caseId, type: 'contract_sent',
    title: 'Partnership Agreement envoyé à l\'employeur',
    description: `Email envoyé à ${ec.email} — portail: ${portalUrl}`,
    metadata: { portal_url: portalUrl, employer_email: ec.email },
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, portal_url: portalUrl, employer_email: ec.email, company: companyName, intern: internName })
}
