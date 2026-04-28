import { createClient } from '@supabase/supabase-js'
import { createClient as srv } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/**
 * Send "interview imminent" email to candidate when Charly marks job as 'interview'
 * POST /api/cases/[id]/send-interview-imminent
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { data: caseRow } = await admin
    .from('cases')
    .select('portal_token, interns(first_name, email)')
    .eq('id', id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const intern = (Array.isArray(caseRow.interns) ? caseRow.interns[0] : caseRow.interns) as Record<string, unknown> | null
  if (!intern?.email) return NextResponse.json({ error: 'No intern email' }, { status: 422 })

  // Deadline = 7 days from now
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 7)
  const deadlineStr = deadline.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const portalToken = caseRow.portal_token as string | null

  await sendFromTemplate({
    slug: 'interview_imminent',
    to: String(intern.email),
    vars: {
      first_name: String(intern.first_name ?? 'there'),
      contact_deadline: deadlineStr,
      portal_url: portalToken ? `${appUrl}/portal/${portalToken}/jobs` : `${appUrl}/portal`,
    },
  })

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'email_sent',
    title: 'Interview imminent email sent',
    description: `Sent to ${intern.email} — deadline: ${deadlineStr}`,
    source: 'manual',
    status: 'completed',
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true })
}
