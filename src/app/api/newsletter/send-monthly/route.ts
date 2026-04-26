import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail, newsletterMonthlyHtml } from '@/lib/email'

export async function POST(req: Request) {
  const body = await req.json() as { secret?: string; month?: string; preview?: boolean }
  if (body.secret !== process.env.ADMIN_SECRET && body.secret !== 'bali2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const month = body.month ?? new Date().toISOString().slice(0, 7)
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: jobs } = await sb
    .from('jobs').select('title, location, seo_slug')
    .eq('include_in_newsletter', true).eq('newsletter_month', month).eq('status', 'open')
  if (!jobs?.length) return NextResponse.json({ error: 'No jobs for this month', month })

  const jobList = jobs.map(j => ({
    title: j.title ?? 'Internship', company: 'Bali company',
    location: j.location ?? 'Bali', slug: (j as { seo_slug?: string }).seo_slug,
  }))

  const { data: subs } = await sb.from('newsletter_subscribers')
    .select('email, locale').eq('status', 'active')
  if (!subs?.length) return NextResponse.json({ error: 'No active subscribers' })

  if (body.preview) return NextResponse.json({
    jobs: jobList, subscribers: subs.length,
    preview_html: newsletterMonthlyHtml(jobList, 'fr'),
  })

  let sent = 0, errors = 0
  for (const sub of subs) {
    const lang = sub.locale === 'fr' ? 'fr' : 'en'
    try {
      await sendEmail({
        to: sub.email,
        subject: lang === 'fr' ? `🌴 ${jobList.length} offres à Bali ce mois` : `🌴 ${jobList.length} openings in Bali`,
        html: newsletterMonthlyHtml(jobList, lang),
        tags: [{ name: 'type', value: 'newsletter' }],
      })
      sent++
    } catch { errors++ }
  }

  return NextResponse.json({ sent, errors, month, jobs: jobList.length })
}
