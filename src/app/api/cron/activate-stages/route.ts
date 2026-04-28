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

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('cases')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .lte('actual_start_date', today)
    .in('status', ['arrival_prep', 'visa_received'])
    .select('id, interns(first_name, last_name, email)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activated = data ?? []

  // Créer notifications + activity pour chaque stage activé
  for (const c of activated) {
    const intern = c.interns as { first_name?: string; last_name?: string } | null
    const name = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()

    await Promise.allSettled([
      supabase.from('admin_notifications').insert({
        type: 'stage_started',
        title: `🌴 Internship started — ${name}`,
        message: 'Internship automatically activated (start date reached)',
        action_url: `/fr/cases/${c.id}`,
        case_id: c.id,
        is_read: false,
      }),
      supabase.from('activity_feed').insert({
        case_id: c.id,
        type: 'status_changed',
        title: 'Internship started automatically',
        description: `${name} has started their internship — status set to "active"`,
        priority: 'normal',
        status: 'done',
        source: 'automation',
        metadata: { trigger: 'cron_activate_stages', date: today },
      }),
      supabase.from('case_logs').insert({
        case_id: c.id,
        author_name: 'Automation',
        action: 'status_changed',
        field_name: 'status',
        old_value: 'arrival_prep',
        new_value: 'active',
        description: `Internship started automatically on ${new Date().toLocaleDateString('en-GB')}`,
      }),
    ])
  }

  // Send welcome_kit email for auto-activated cases
  const { sendWelcomeKit } = await import('@/lib/email/resend')
  for (const cas of activated) {
    const intern = cas.interns as { first_name?: string; email?: string } | null
    if (!intern?.email) continue
    const { data: tokenRow } = await supabase.from('cases').select('portal_token').eq('id', cas.id).single()
    const token = (tokenRow as Record<string,unknown>)?.portal_token as string | null
    if (token) {
      void sendWelcomeKit({
        internEmail: intern.email,
        prenom: intern.first_name ?? 'Intern',
        portalToken: token,
      }).catch(() => null)
    }
  }

  return NextResponse.json({ activated: activated.length, cases: activated.map(c => c.id) })
}
