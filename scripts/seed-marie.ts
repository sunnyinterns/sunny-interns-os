import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL = 'marie.dupont.test@bali-interns.com'

async function main() {
  console.log('🌴 Seed candidat test: Marie Dupont (rdv_booked)…')

  // Nettoyage si déjà présent
  const { data: existing } = await supabase
    .from('interns')
    .select('id')
    .eq('email', EMAIL)
    .maybeSingle()

  if (existing) {
    console.log('→ suppression des anciennes données…')
    const { data: oldCases } = await supabase.from('cases').select('id').eq('intern_id', existing.id)
    if (oldCases) {
      for (const c of oldCases) {
        await supabase.from('activity_feed').delete().eq('case_id', c.id)
        await supabase.from('cases').delete().eq('id', c.id)
      }
    }
    await supabase.from('leads').delete().eq('email', EMAIL)
    await supabase.from('interns').delete().eq('id', existing.id)
  }

  const { data: intern, error: iErr } = await supabase
    .from('interns')
    .insert({
      first_name: 'Marie',
      last_name: 'Dupont',
      email: EMAIL,
      whatsapp: '+33600000001',
      school_name: 'ESSEC Business School',
      school_country: 'France',
      main_desired_job: 'Marketing Digital',
      desired_duration_months: 6,
      desired_start_date: '2026-07-01',
      spoken_languages: ['fr', 'en'],
      linkedin_url: 'https://linkedin.com/in/marie-dupont-test',
      stage_ideal: 'Stage en marketing digital dans une startup innovante à Bali',
      source: 'demo_seed',
    })
    .select('id')
    .single()
  if (iErr || !intern) throw iErr ?? new Error('intern insert failed')

  const { data: kase, error: cErr } = await supabase
    .from('cases')
    .insert({
      intern_id: intern.id,
      status: 'rdv_booked',
      destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
      google_meet_link: 'https://meet.google.com/test-demo-link',
      intern_first_meeting_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      cv_status: 'pending',
      portal_token: crypto.randomUUID(),
      assigned_manager_name: 'Charly Gestede',
    })
    .select('id')
    .single()
  if (cErr || !kase) throw cErr ?? new Error('case insert failed')

  await supabase.from('leads').insert({
    email: EMAIL,
    status: 'converted',
    converted_case_id: kase.id,
    converted_at: new Date().toISOString(),
  }).then(() => null, () => null)

  console.log(`✅ Marie Dupont créée — case ${kase.id}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
