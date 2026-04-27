import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Cron J-1 : Envoie un rappel aux candidats dont l'entretien est demain
 * Schedule: 0 8 * * * (8h UTC = 16h Bali)
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // RDV demain (entre minuit UTC demain et minuit UTC après-demain)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const { data: cases } = await supabase
    .from('cases')
    .select('id, intern_first_meeting_date, intern_first_meeting_link, portal_token, interns(first_name, last_name, email)')
    .gte('intern_first_meeting_date', tomorrow.toISOString())
    .lt('intern_first_meeting_date', dayAfter.toISOString())
    .in('status', ['rdv_booked'])
    .is('rdv_reminder_sent_at', null) // idempotency — ne pas envoyer deux fois

  const sent: string[] = []
  const { sendRdvReminder } = await import('@/lib/email/resend')

  for (const c of (cases ?? [])) {
    const intern = c.interns as { first_name?: string; last_name?: string; email?: string } | null
    if (!intern?.email) continue

    const rdvDate = c.intern_first_meeting_date
      ? new Date(c.intern_first_meeting_date).toLocaleString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          timeZone: 'Europe/Paris',
        })
      : '—'

    try {
      await sendRdvReminder({
        internEmail: intern.email,
        firstName: intern.first_name ?? 'Candidate',
        rdvDate,
        meetLink: c.intern_first_meeting_link ?? undefined,
        portalToken: c.portal_token ?? undefined,
      })

      // Marquer comme envoyé
      await supabase.from('cases').update({ rdv_reminder_sent_at: new Date().toISOString() }).eq('id', c.id)
      sent.push(intern.email)
    } catch (e) {
      console.error('[cron/rdv-reminders] error:', intern.email, e)
    }
  }

  return NextResponse.json({ sent, count: sent.length })
}
