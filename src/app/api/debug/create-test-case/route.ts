import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Create test intern
  const { data: intern, error: ie } = await supabase.from('interns').insert({
    first_name: 'Test',
    last_name: 'Candidat',
    email: `test.${Date.now()}@example.com`,
    nationality: 'France',
    school_name: 'Universit\u00e9 de Paris',
    main_desired_job: 'Marketing Digital',
    preferred_language: 'fr',
  }).select('id').single()

  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  // 2. Create case
  const { data: caseRow, error: ce } = await supabase.from('cases').insert({
    intern_id: intern.id,
    status: 'lead',
    source: 'apply_form',
  }).select('id').single()

  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 })

  // 3. Create activity feed entry
  await supabase.from('activity_feed').insert({
    case_id: caseRow.id,
    type: 'case_created',
    title: 'Test Candidat a candidat\u00e9',
    description: 'Test de cr\u00e9ation depuis debug endpoint',
  }).then(null, () => null)

  // 4. Admin notification
  await supabase.from('admin_notifications').insert({
    type: 'new_application',
    title: 'Test Candidat \u2014 Nouvelle candidature',
    message: 'Test candidature depuis endpoint debug',
    link: `/fr/cases/${caseRow.id}`,
  }).then(null, () => null)

  return NextResponse.json({ ok: true, intern_id: intern.id, case_id: caseRow.id })
}
