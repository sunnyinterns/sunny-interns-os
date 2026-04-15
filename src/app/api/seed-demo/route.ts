import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ROUTE DEMO SEED — à désactiver en production si besoin
export async function POST() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const DEST_ID = 'fc9ece85-e5d5-41d2-9142-79054244bbce'
  const JOB_ID = '7661d5aa-0cfc-43c3-aa87-70ad7a6e713a'
  const CONTACT_ID = '6da51290-78a1-413b-ad82-d2f7e290c113'

  const INTERNS = [
    { id: 'seed-i-01', first_name: 'Emma', last_name: 'Martin', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340001', nationality: 'FR', main_desired_job: 'Marketing Digital', school_country: 'FR' },
    { id: 'seed-i-02', first_name: 'Lucas', last_name: 'Bernard', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340002', nationality: 'FR', main_desired_job: 'Business Developer', school_country: 'FR' },
    { id: 'seed-i-03', first_name: 'Chloé', last_name: 'Dupont', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340003', nationality: 'FR', main_desired_job: 'Community Manager', school_country: 'FR' },
    { id: 'seed-i-04', first_name: 'Thomas', last_name: 'Rousseau', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340004', nationality: 'FR', main_desired_job: 'Data Analyst', school_country: 'FR' },
    { id: 'seed-i-05', first_name: 'Léa', last_name: 'Petit', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340005', nationality: 'FR', main_desired_job: 'UX Designer', school_country: 'FR' },
    { id: 'seed-i-06', first_name: 'Hugo', last_name: 'Laurent', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340006', nationality: 'FR', main_desired_job: 'Développeur Web', school_country: 'FR' },
    { id: 'seed-i-07', first_name: 'Inès', last_name: 'Simon', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340007', nationality: 'FR', main_desired_job: 'RH & Recrutement', school_country: 'FR' },
    { id: 'seed-i-08', first_name: 'Baptiste', last_name: 'Michel', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340008', nationality: 'FR', main_desired_job: 'E-commerce', school_country: 'FR' },
    { id: 'seed-i-09', first_name: 'Camille', last_name: 'Garcia', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340009', nationality: 'FR', main_desired_job: 'Finance', school_country: 'FR' },
    { id: 'seed-i-10', first_name: 'Nathan', last_name: 'Lefebvre', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340010', nationality: 'BE', main_desired_job: 'Marketing Digital', school_country: 'BE' },
    { id: 'seed-i-11', first_name: 'Sarah', last_name: 'Dubois', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340011', nationality: 'CH', main_desired_job: 'Business Developer', school_country: 'CH' },
    { id: 'seed-i-12', first_name: 'Antoine', last_name: 'Morel', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340012', nationality: 'FR', main_desired_job: 'Design Graphique', school_country: 'FR' },
    { id: 'seed-i-13', first_name: 'Julie', last_name: 'Fontaine', email: 'sidney.ruby@gmail.com', whatsapp: '+33612340013', nationality: 'FR', main_desired_job: 'Communication', school_country: 'FR' },
    { id: 'seed-i-14', first_name: 'Maxime', last_name: 'Leroy', email: 'sidney.rubinsztejn@realcampus.fr', whatsapp: '+33612340014', nationality: 'FR', main_desired_job: 'Ingénierie', school_country: 'FR' },
  ]

  for (const intern of INTERNS) {
    await sb.from('interns').upsert(intern, { onConflict: 'id' })
  }

  const STATUSES = [
    'lead', 'lead',
    'rdv_booked', 'rdv_booked',
    'qualification_done', 'qualification_done',
    'job_submitted', 'job_submitted',
    'job_retained', 'job_retained',
    'convention_signed', 'convention_signed',
    'payment_received', 'payment_received',
  ]

  const STARTS = [
    '2026-07-01', '2026-08-01',
    '2026-06-01', '2026-06-15',
    '2026-05-15', '2026-06-01',
    '2026-05-01', '2026-05-15',
    '2026-04-15', '2026-05-01',
    '2026-04-01', '2026-04-15',
    '2026-03-15', '2026-04-01',
  ]

  const SECTORS = [
    ['Marketing'], ['Business'],
    ['Marketing'], ['Tech'],
    ['Design'], ['Tech'],
    ['RH'], ['E-commerce'],
    ['Finance'], ['Marketing'],
    ['Business'], ['Design'],
    ['Communication'], ['Ingenierie'],
  ]

  const DURATIONS = [4, 3, 4, 6, 4, 5, 3, 4, 4, 3, 5, 4, 4, 6]

  for (let i = 0; i < 14; i++) {
    const num = String(i + 1).padStart(2, '0')
    const status = STATUSES[i]
    const needsContact = i >= 6

    const caseData = {
      id: `seed-case-${num}`,
      intern_id: `seed-i-${num}`,
      destination_id: DEST_ID,
      status,
      desired_start_date: STARTS[i],
      desired_duration_months: DURATIONS[i],
      desired_sectors: SECTORS[i],
      intern_level: i % 2 === 0 ? 'licence' : 'master',
      employer_contact_id: needsContact ? CONTACT_ID : null,
      form_language: i % 2 === 0 ? 'fr' : 'en',
    }

    await sb.from('cases').upsert(caseData, { onConflict: 'id' })

    if (i >= 6) {
      const subStatus = i >= 8 ? 'retained' : 'proposed'
      const internInterested = i !== 7 ? true : null
      try {
        await sb.from('job_submissions').upsert({
          case_id: `seed-case-${num}`,
          job_id: JOB_ID,
          status: subStatus,
          intern_interested: internInterested,
          intern_priority: 1,
        }, { onConflict: 'case_id,job_id', ignoreDuplicates: true })
      } catch { /* ignore duplicate */ }
    }
  }

  const LEADS = [
    { email: 'sidney.ruby@gmail.com', first_name: 'Sophie', last_name: 'Renard', status: 'new', source: 'facebook', touchpoint: 'facebook' },
    { email: 'sidney.rubinsztejn@realcampus.fr', first_name: 'Pierre', last_name: 'Durand', status: 'new', source: 'instagram', touchpoint: 'instagram' },
    { email: 'sidney.ruby@gmail.com', first_name: 'Alice', last_name: 'Bertrand', status: 'in_progress', source: 'linkedin', touchpoint: 'linkedin' },
    { email: 'sidney.rubinsztejn@realcampus.fr', first_name: 'Marc', last_name: 'Lebrun', status: 'form_completed', source: 'website', touchpoint: 'organic' },
  ]

  for (const lead of LEADS) {
    try { await sb.from('leads').insert(lead) } catch { /* ignore */ }
  }

  return NextResponse.json({
    ok: true,
    message: `${INTERNS.length} interns + ${INTERNS.length} cases + ${LEADS.length} leads insérés`,
  })
}
