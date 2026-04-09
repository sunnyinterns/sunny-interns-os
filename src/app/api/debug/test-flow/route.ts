import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const timestamp = Date.now()

  // 1. Intern
  const { data: intern, error: ie } = await supabase
    .from('interns')
    .insert({
      first_name: 'Test',
      last_name: `Candidat${timestamp}`,
      email: `test${timestamp}@example.com`,
      nationality: 'France',
      nationalities: ['France'],
      main_desired_job: 'Marketing Digital',
      preferred_language: 'fr',
      touchpoint: 'Instagram',
    })
    .select('id')
    .single()

  if (ie) return NextResponse.json({ error: 'intern: ' + ie.message }, { status: 500 })

  // 2. Case avec destination_id
  const { data: caseRow, error: ce } = await supabase
    .from('cases')
    .insert({
      intern_id: intern.id,
      status: 'lead',
      destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
    })
    .select('id')
    .single()

  if (ce) return NextResponse.json({ error: 'case: ' + ce.message }, { status: 500 })

  // 3. Activity
  const { error: ae } = await supabase.from('activity_feed').insert({
    case_id: caseRow.id,
    type: 'case_created',
    title: `Test Candidat${timestamp} a candidate`,
    description: 'Test flow /apply → pipeline → feed',
    priority: 'normal',
  })

  // 4. Notification
  await supabase.from('admin_notifications').insert({
    type: 'new_application',
    title: `Test Candidat${timestamp} — Nouvelle candidature`,
    message: `test${timestamp}@example.com vient de candidater`,
    link: `/fr/cases/${caseRow.id}`,
    is_read: false,
  }).then(() => null, () => null)

  // 5. Log
  await supabase.from('case_logs').insert({
    case_id: caseRow.id,
    author_name: 'Test Candidat',
    action: 'created',
    description: 'Dossier cree via test-flow endpoint',
  }).then(() => null, () => null)

  return NextResponse.json({
    ok: true,
    intern_id: intern.id,
    case_id: caseRow.id,
    activity_error: ae?.message ?? null,
    pipeline_url: `/fr/pipeline`,
    feed_url: `/fr/feed`,
    case_url: `/fr/cases/${caseRow.id}`,
  })
}
