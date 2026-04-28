import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-logger'
import { sendJobSubmittedEmployer } from '@/lib/email/resend'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getSignedCvUrl(admin: ReturnType<typeof getAdmin>, rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null
  // If already a public URL (no token), return as-is
  if (!rawUrl.includes('sign') && !rawUrl.includes('token=')) return rawUrl
  // Try to extract bucket + path and create a signed URL (7 days)
  try {
    const urlObj = new URL(rawUrl)
    const parts = urlObj.pathname.split('/object/')
    if (parts.length < 2) return rawUrl
    const [bucket, ...pathParts] = parts[1].split('/')
    const filePath = pathParts.join('/')
    const { data } = await admin.storage
      .from(bucket)
      .createSignedUrl(filePath, 7 * 24 * 3600) // 7 days
    return data?.signedUrl ?? rawUrl
  } catch {
    return rawUrl
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, subId } = await params
  const admin = getAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  // Fetch submission + job + company
  const { data: sub } = await admin
    .from('job_submissions')
    .select(`*,
      jobs(id, title, public_title, public_description, wished_duration_months, wished_start_date,
        companies(id, name, email),
        contacts!jobs_contact_id_fkey(id, first_name, last_name, email, whatsapp)
      )`)
    .eq('id', subId)
    .single()

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  // Gate: CV must be validated
  const { data: caseRow } = await admin
    .from('cases')
    .select('*, interns(first_name, last_name, email, cv_url, local_cv_url, linkedin_url, nationality, date_of_birth, spoken_languages, desired_duration_months, desired_start_date)')
    .eq('id', id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const cvStatus = (caseRow as Record<string, unknown>).cv_status as string | null
  if (cvStatus && cvStatus !== 'validated') {
    return NextResponse.json({
      error: 'CV must be validated before sending to employer',
      cv_status: cvStatus,
    }, { status: 422 })
  }

  const intern = (caseRow.interns ?? {}) as Record<string, unknown>
  const job = (sub.jobs ?? {}) as Record<string, unknown>
  const company = ((job.companies ?? {}) as Record<string, unknown>)
  const contact = ((job.contacts ?? {}) as Record<string, unknown>)
  const companyId = company.id as string | null
  const contactEmail = (contact.email ?? company.email) as string | null
  const rawCvUrl = (intern.local_cv_url ?? intern.cv_url) as string | null

  // Get CV URL with long-lived access
  const cvUrl = await getSignedCvUrl(admin, rawCvUrl)

  // ── Upsert employer_portal_access per company ────────────────
  let portalToken: string | null = null
  if (companyId) {
    const { data: existingAccess } = await admin
      .from('employer_portal_access')
      .select('token')
      .eq('company_id', companyId)
      .maybeSingle()

    if (existingAccess?.token) {
      portalToken = existingAccess.token
    } else {
      // Create new portal access for this company
      const { data: newAccess } = await admin
        .from('employer_portal_access')
        .insert({
          company_id: companyId,
          contact_id: contact.id as string | null,
          token: crypto.randomUUID(),
          sent_at: new Date().toISOString(),
        })
        .select('token')
        .single()
      portalToken = newAccess?.token ?? null
    }
    // Update last_active_at
    if (portalToken) {
      await admin
        .from('employer_portal_access')
        .update({ last_active_at: new Date().toISOString() })
        .eq('token', portalToken)
    }
  }

  const portalUrl = portalToken
    ? `${appUrl}/portal/employer/${portalToken}`
    : null

  // ── Send email ────────────────────────────────────────────────
  let emailSent = false
  if (contactEmail) {
    try {
      await sendJobSubmittedEmployer({
        employerEmail: contactEmail,
        employerName: contact.first_name as string | undefined ?? company.name as string | undefined,
        internFirstName: String(intern.first_name ?? ''),
        internLastName: String(intern.last_name ?? ''),
        jobTitle: String(job.public_title ?? job.title ?? ''),
        cvUrl: cvUrl ?? undefined,
        caseId: id,
        portalUrl: portalUrl ?? undefined,
      })
      emailSent = true
    } catch (e) {
      console.error('[send-to-employer] email error:', e)
    }
  }

  // ── Update job_submission ─────────────────────────────────────
  await admin
    .from('job_submissions')
    .update({
      status: 'sent',
      submitted_at: new Date().toISOString(),
      cv_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subId)

  // ── Log activity ──────────────────────────────────────────────
  await logActivity({
    caseId: id,
    type: 'job_sent_employer',
    title: `Application sent to ${company.name ?? 'employer'}`,
    description: `"${job.public_title ?? job.title}" sent by email${emailSent ? '' : ' (EMAIL FAILED)'}`,
    metadata: { job_id: job.id, employer: company.name, emailSent, portalUrl },
  })

  // ── Alert admin if email failed ───────────────────────────────
  if (!emailSent) {
    await admin.from('admin_notifications').insert({
      type: 'email_failed',
      title: `⚠️ Email not sent — ${company.name ?? 'employer'} has no valid email`,
      message: `Could not send CV for ${intern.first_name} ${intern.last_name} to employer. Check company email in the OS.`,
      case_id: id,
      priority: 'high',
      read: false,
    }).then(() => null, () => null)
  }

  return NextResponse.json({ ok: true, emailSent, portalToken, portalUrl })
}
