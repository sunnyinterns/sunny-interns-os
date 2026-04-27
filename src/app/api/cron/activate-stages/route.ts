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
  console.log(`[CRON] Activated ${activated.length} stages`)

  // Créer notifications + activity pour chaque stage activé
  for (const c of activated) {
    const intern = c.interns as { first_name?: string; last_name?: string } | null
    const name = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()

    await Promise.allSettled([
      supabase.from('admin_notifications').insert({
        type: 'stage_started',
        title: `🌴 Stage démarré — ${name}`,
        message: 'Stage automatiquement activé (date de début atteinte)',
        action_url: `/fr/cases/${c.id}`,
        case_id: c.id,
        is_read: false,
      }),
      supabase.from('activity_feed').insert({
        case_id: c.id,
        type: 'status_changed',
        title: 'Stage démarré automatiquement',
        description: `${name} a commencé son stage — statut passé à "active"`,
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
        description: `Stage démarré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`,
      }),
    ])
  }

  return NextResponse.json({ activated: activated.length, cases: activated.map(c => c.id) })
}
