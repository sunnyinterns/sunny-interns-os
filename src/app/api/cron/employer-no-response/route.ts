import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Runs daily — finds job_submissions sent 7+ days ago with no employer response
// Flags them in alert_sent_flags for Charly To-Do
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: subs } = await admin
    .from('job_submissions')
    .select(`
      id, case_id, submitted_at, no_response_alerted_at,
      jobs!job_submissions_job_id_fkey(title, public_title,
        contacts!jobs_contact_id_fkey(first_name, email, whatsapp,
          companies!contacts_company_id_fkey(name))
      ),
      cases!job_submissions_case_id_fkey(
        interns(first_name, last_name)
      )
    `)
    .eq('status', 'sent')
    .eq('employer_decision', 'pending')
    .lt('submitted_at', sevenDaysAgo.toISOString())
    .is('no_response_alerted_at', null)
    .limit(100)

  let alerted = 0
  for (const sub of subs ?? []) {
    const job = sub.jobs as unknown as Record<string, unknown>
    const contact = job?.contacts as unknown as Record<string, unknown> | null
    const company = contact?.companies as unknown as Record<string, unknown> | null
    const caseData = sub.cases as unknown as Record<string, unknown> | null
    const intern = caseData?.interns as unknown as Record<string, unknown> | null

    const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
    const jobTitle = ((job?.title || job?.public_title) as string) ?? ''
    const companyName = (company?.name as string) ?? 'employer'

    // Create To-Do notification for Charly
    await admin.from('admin_notifications').insert({
      type: 'employer_no_response',
      title: `⏰ No employer response — ${internName}`,
      message: `${companyName} hasn't responded in 7 days for ${jobTitle}. Send a follow-up.`,
      case_id: sub.case_id as string,
      priority: 'high',
      created_at: new Date().toISOString(),
    }).then(() => null, () => null)

    // Mark as alerted (idempotency)
    await admin.from('job_submissions').update({
      no_response_alerted_at: new Date().toISOString(),
    }).eq('id', sub.id)

    alerted++
  }

  return NextResponse.json({ checked: subs?.length ?? 0, alerted })
}
