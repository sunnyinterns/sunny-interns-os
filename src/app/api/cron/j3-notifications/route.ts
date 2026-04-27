import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Trouver les cas avec vol dans exactement 3 jours
  const in3days = new Date()
  in3days.setDate(in3days.getDate() + 3)
  const dateStr = in3days.toISOString().split('T')[0]

  const { data: cases } = await supabase
    .from('cases')
    .select('id, flight_number, interns(first_name, email, whatsapp)')
    .like('flight_arrival_time_local', `${dateStr}%`)
    .in('status', ['visa_received', 'arrival_prep', 'active'])

  const sent: string[] = []
  const { sendAppAllIndonesia } = await import('@/lib/email/resend')

  for (const c of (cases ?? [])) {
    const intern = c.interns as { first_name?: string; email?: string } | null
    if (!intern?.email) continue
    try {
      await sendAppAllIndonesia({ internEmail: intern.email, prenom: intern.first_name ?? 'Intern' })
      sent.push(intern.email)

      // Admin notification
      await supabase.from('admin_notifications').insert({
        type: 'j3_departure',
        title: `✈️ Départ J-3 — ${intern.first_name}`,
        message: `Vol prévu dans 3 jours · Email All Indonesia envoyé`,
        action_url: `/fr/cases/${c.id}`,
        case_id: c.id,
        is_read: false,
      }).then(() => null, () => null)
    } catch (e) {
      console.error('[cron/j3] email error:', intern.email, e)
    }
  }

  return NextResponse.json({ sent, count: sent.length })
}
