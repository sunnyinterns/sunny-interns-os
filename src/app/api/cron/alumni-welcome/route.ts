import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendAlumniCongrats } from '@/lib/email/resend'

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = svc()

  const j2 = new Date(); j2.setDate(j2.getDate() - 2)
  const j2str = j2.toISOString().split('T')[0]

  const { data: cases, error } = await sb
    .from('cases')
    .select(`
      id, portal_token, actual_end_date,
      interns(first_name, last_name, email),
      contacts!cases_employer_contact_id_fkey(
        companies!contacts_company_id_fkey(name)
      )
    `)
    .eq('status', 'alumni')
    .eq('actual_end_date', j2str)
    .is('alumni_welcome_sent_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cases?.length) return NextResponse.json({ sent: 0, message: `No alumni for ${j2str}` })

  let sent = 0
  for (const c of cases) {
    const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as { first_name: string; last_name: string; email: string } | null
    if (!intern?.email) continue

    const portalToken = (c as Record<string, unknown>).portal_token as string | null

    try {
      await sendAlumniCongrats({
        internEmail: intern.email,
        prenom: intern.first_name,
        portalToken: portalToken ?? undefined,
      })
      await sb.from('cases').update({ alumni_welcome_sent_at: new Date().toISOString() }).eq('id', c.id)
      await sb.from('activity_feed').insert({
        case_id: c.id,
        type: 'alumni_welcome_sent',
        title: 'Alumni welcome email sent',
        description: `Sent to ${intern.first_name} ${intern.last_name} — J+2 after end date`,
        source: 'cron',
        status: 'completed',
      }).then(() => {}, () => {})
      sent++
    } catch (e) {
      console.error(`[alumni-welcome] ${intern.email}:`, e)
    }
  }

  return NextResponse.json({ sent, total: cases.length, date: j2str })
}
