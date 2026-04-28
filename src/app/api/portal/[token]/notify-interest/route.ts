import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendInternCommentNotification } from '@/lib/email/resend'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json() as { submission_id?: string }
  const supabase = getAdmin()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  const { data: c } = await supabase
    .from('cases')
    .select('id, interns(first_name, last_name)')
    .eq('portal_token', token)
    .maybeSingle()

  if (!c) return NextResponse.json({ ok: false })

  const intern = c.interns as { first_name?: string; last_name?: string } | null
  const name = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')

  let jobTitle = ''
  if (body.submission_id) {
    const { data: sub } = await supabase
      .from('job_submissions')
      .select('jobs(title, public_title)')
      .eq('id', body.submission_id)
      .maybeSingle()
    const job = (sub as Record<string, unknown>)?.jobs as { title?: string; public_title?: string } | null
    jobTitle = job?.public_title ?? job?.title ?? ''
  }

  await sendInternCommentNotification({
    caseId: c.id,
    prenom: intern?.first_name ?? '',
    nom: intern?.last_name ?? '',
    comment: jobTitle ? `Interested in "${jobTitle}"` : 'Marked interest in an internship offer',
    caseUrl: `${appUrl}/fr/cases/${c.id}`,
  })

  return NextResponse.json({ ok: true })
}
