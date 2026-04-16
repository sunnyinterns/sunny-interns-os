/**
 * POST /api/cases/[id]/send-sponsor-contract
 * Déclenché automatiquement quand convention_signed
 * 1. Crée employer_portal_access (per-case, nouveau token)
 * 2. Envoie email à l'employeur avec le lien
 * 3. Marque sponsor_contract_sent_at sur le case
 * 4. Crée en_attente "employer doit signer" + "intern doit signer lettre"
 */
import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params
  const sb = svc()

  // 1. Fetch case with all needed relations
  const { data: c, error } = await sb
    .from('cases')
    .select(`
      id, status, sponsor_contract_sent_at, portal_token,
      interns(first_name, last_name, email),
      contacts!cases_employer_contact_id_fkey(
        id, first_name, last_name, email,
        companies!contacts_company_id_fkey(id, name)
      ),
      job_submissions!job_submissions_case_id_fkey(
        status,
        jobs!job_submissions_job_id_fkey(
          id, public_title, title,
          companies!jobs_company_id_fkey(id, name)
        )
      )
    `)
    .eq('id', caseId)
    .single()

  if (error || !c) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  // Already sent — idempotent
  if (c.sponsor_contract_sent_at) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_sent' })
  }

  const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as { first_name: string; last_name: string; email: string } | null
  const _contacts = c.contacts as unknown
  const employerContact = (Array.isArray(_contacts) ? _contacts[0] : _contacts) as {
    id: string; first_name: string | null; last_name: string | null; email: string | null
    companies: { id: string; name: string } | null
  } | null

  if (!employerContact?.email) {
    return NextResponse.json({ error: 'No employer contact email on case' }, { status: 400 })
  }

  const company = employerContact.companies
  const retainedSub = (c.job_submissions as unknown as Array<{ status: string; jobs: { id: string; public_title: string | null; title: string | null; companies: { id: string; name: string } | null } | null }>)
    ?.find(s => s.status === 'retained')
  const companyId = company?.id ?? retainedSub?.jobs?.companies?.id
  const companyName = company?.name ?? retainedSub?.jobs?.companies?.name ?? 'your company'
  const internName = intern ? `${intern.first_name} ${intern.last_name}` : 'the intern'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // 2. Create employer_portal_access (per-case)
  const { data: existingAccess } = await sb
    .from('employer_portal_access')
    .select('token')
    .eq('case_id', caseId)
    .maybeSingle()

  let portalToken = existingAccess?.token

  if (!portalToken) {
    const { data: newAccess, error: accessErr } = await sb
      .from('employer_portal_access')
      .insert({
        company_id: companyId,
        contact_id: employerContact.id,
        case_id: caseId,
        sent_at: new Date().toISOString(),
      })
      .select('token')
      .single()

    if (accessErr || !newAccess) {
      console.error('[SEND_SPONSOR_CONTRACT] Failed to create portal access:', accessErr?.message)
      return NextResponse.json({ error: 'Failed to create portal access' }, { status: 500 })
    }
    portalToken = newAccess.token
  }

  const portalUrl = `${appUrl}/portal/employer/${portalToken}`

  // 3. Send email to employer
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Sunny Interns <team@bali-interns.com>',
      to: employerContact.email,
      replyTo: 'sidney@bali-interns.com',
      subject: `Partnership Agreement to sign — ${internName} @ ${companyName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1918">
          <div style="background:#c8a96e;padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Sunny Interns</h1>
          </div>
          <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p>Dear ${employerContact.first_name ?? 'Partner'},</p>
            <p>The internship convention for <strong>${internName}</strong> at <strong>${companyName}</strong> has been signed.</p>
            <p>You are now invited to complete your company information and sign the <strong>Partnership Agreement</strong> for this internship placement.</p>
            <div style="text-align:center;margin:28px 0">
              <a href="${portalUrl}" style="background:#c8a96e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                Access Partner Portal →
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af">This link is specific to <strong>${internName}</strong>'s placement. A new agreement will be required for each intern.</p>
            <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0">
            <p style="font-size:12px;color:#6b7280">Questions? Reply to this email or contact us on WhatsApp.<br>Sunny Interns · Canggu, Bali</p>
          </div>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[SEND_SPONSOR_CONTRACT] Email failed:', emailErr)
    // Non-blocking — continue even if email fails
  }

  // 4. Update case: mark sponsor_contract_sent_at
  await sb.from('cases')
    .update({ sponsor_contract_sent_at: new Date().toISOString() })
    .eq('id', caseId)

  // 5. Create en_attente items
  await sb.from('en_attente').insert([
    {
      case_id: caseId,
      type: 'convention',
      waiting_for: 'employer',
      notes: `${companyName} doit signer le Partnership Agreement`,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    {
      case_id: caseId,
      type: 'engagement_letter',
      waiting_for: 'intern',
      notes: `${internName} doit signer la Liability Agreement Letter`,
      due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
  ]).then(() => {}, () => {})

  // 6. Log activity
  await sb.from('activity_feed').insert({
    case_id: caseId,
    type: 'contract_sent',
    title: 'Partnership Agreement envoyé à l\'employeur',
    description: `Lien portail envoyé à ${employerContact.email} pour ${companyName}`,
    metadata: { portal_url: portalUrl, employer_email: employerContact.email },
  }).then(() => {}, () => {})

  return NextResponse.json({
    ok: true,
    portal_url: portalUrl,
    employer_email: employerContact.email,
    company: companyName,
    intern: internName,
  })
}
