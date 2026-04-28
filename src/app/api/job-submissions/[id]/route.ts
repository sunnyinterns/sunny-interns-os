import { createClient as srv } from '@/lib/supabase/server'
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()
  const body = await req.json() as Record<string, unknown>

  // Load current submission to detect status change
  const { data: current } = await admin.from('job_submissions')
    .select('*, cases!job_submissions_case_id_fkey(portal_token, interns(first_name, email))')
    .eq('id', id).single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const oldStatus = current.status as string
  const newStatus = body.status as string | undefined

  await admin.from('job_submissions').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  // Trigger: status changed to 'interview' → email candidat
  if (newStatus === 'interview' && oldStatus !== 'interview') {
    try {
      const caseData = current.cases as Record<string, unknown> | null
      const internsRaw = caseData?.interns
      const intern = (Array.isArray(internsRaw) ? internsRaw[0] : internsRaw) as Record<string, unknown> ?? {}
      const portalToken = caseData?.portal_token as string | null
      const internEmail = intern.email as string | null
      const internFirstName = (intern.first_name ?? 'there') as string
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

      if (internEmail) {
        await sendFromTemplate({
          slug: 'interview_prep_candidate',
          to: internEmail,
          vars: {
            first_name: internFirstName,
            portal_url: portalToken ? `${APP_URL}/portal/${portalToken}/jobs` : APP_URL,
          },
        })
        // Mark email sent
        await admin.from('job_submissions').update({
          candidate_interview_notified_at: new Date().toISOString(),
        }).eq('id', id)
      }
    } catch (e) {
      console.error('[job-submissions PATCH] interview email error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
