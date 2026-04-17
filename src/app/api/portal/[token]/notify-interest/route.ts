import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json() as { submission_id?: string }
  const supabase = getAdmin()

  const { data: c } = await supabase
    .from('cases')
    .select('id, interns(first_name, last_name)')
    .eq('portal_token', token)
    .maybeSingle()

  if (!c) return NextResponse.json({ ok: false })

  const intern = c.interns as { first_name?: string; last_name?: string } | null
  const name = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')

  // Get job title if submission_id provided
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

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Bali Interns <team@bali-interns.com>',
    to: 'charly@bali-interns.com',
    subject: `⭐ ${name} est intéressé${jobTitle ? ` par "${jobTitle}"` : ' par une offre'}`,
    html: `<p><strong>${name}</strong> vient de marquer son intérêt${jobTitle ? ` pour "${jobTitle}"` : ' pour une offre de stage'}. <a href="https://sunny-interns-os.vercel.app/fr/cases/${c.id}">Voir le dossier →</a></p>`,
  })

  return NextResponse.json({ ok: true })
}
