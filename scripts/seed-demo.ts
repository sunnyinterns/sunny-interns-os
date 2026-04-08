import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATUSES = [
  'lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained',
  'convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent',
  'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni',
  'not_interested', 'no_job_found', 'lost',
] as const

const FIRST_NAMES_M = ['Lucas', 'Hugo', 'Nathan', 'Théo', 'Léo', 'Arthur', 'Louis', 'Raphaël', 'Jules', 'Ethan', 'Adam', 'Noah', 'Gabriel', 'Paul', 'Victor', 'Maxime', 'Alexandre', 'Antoine']
const FIRST_NAMES_F = ['Emma', 'Léa', 'Chloé', 'Manon', 'Inès', 'Louise', 'Jade', 'Lina', 'Camille', 'Sarah', 'Alice', 'Juliette', 'Eva', 'Clara', 'Zoé', 'Margot', 'Ambre', 'Romane']
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux']
const JOBS = ['Assistant marketing digital', 'Community Manager', 'Création de contenu', 'SEO/SEA', 'Prospection B2B', 'Account manager', 'E-commerce', 'RP/Events', 'Email CRM']
const TOUCHPOINTS = ['Instagram', 'TikTok', 'Google', 'Bouche à oreille', 'École', 'Facebook']
const LANGUAGES_OPTIONS = [['Français', 'Anglais'], ['Français', 'Anglais', 'Espagnol'], ['Français', 'Anglais', 'Allemand'], ['Français']]
const MANAGER_NAMES = ['Charly Gestede']

function randomEl<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

async function seed() {
  console.log('🌴 Seeding demo data...')

  // Get destination
  const { data: destinations } = await supabase.from('destinations').select('id').limit(1)
  const destinationId = destinations?.[0]?.id ?? null

  // Get schools
  const { data: schools } = await supabase.from('schools').select('id').limit(6)
  const schoolIds = schools?.map(s => s.id) ?? []

  // Get package (C22B Standard)
  const { data: packages } = await supabase.from('packages').select('id').limit(1)
  const packageId = packages?.[0]?.id ?? null

  // Get visa type
  const { data: visaTypes } = await supabase.from('visa_types').select('id').eq('code', 'C22B').limit(1)
  const visaTypeId = visaTypes?.[0]?.id ?? null

  const now = new Date()
  let idx = 0

  for (const status of STATUSES) {
    for (let pair = 0; pair < 2; pair++) {
      const isMale = (idx % 2) === 0
      const firstName = isMale ? randomEl(FIRST_NAMES_M) : randomEl(FIRST_NAMES_F)
      const lastName = randomEl(LAST_NAMES)
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idx}@demo.sunny-interns.com`
      const birthYear = 1999 + (idx % 4)
      const birthDate = `${birthYear}-${String((idx % 12) + 1).padStart(2, '0')}-${String((idx % 28) + 1).padStart(2, '0')}`
      const passportExpiry = `${2027 + (idx % 3)}-${String((idx % 12) + 1).padStart(2, '0')}-15`

      // Insert intern
      const internData: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        email,
        whatsapp: `+336${String(10000000 + idx * 1111).slice(0, 8)}`,
        nationality: 'Française',
        sexe: isMale ? 'M' : 'F',
        birth_date: birthDate,
        passport_expiry: passportExpiry,
        main_desired_job: randomEl(JOBS),
        spoken_languages: randomEl(LANGUAGES_OPTIONS),
        touchpoint: randomEl(TOUCHPOINTS),
        stage_ideal: 'Découvrir le marketing digital dans un environnement international à Bali',
      }

      // visa_docs_sent+ : docs
      const visaDocsStatuses = ['visa_docs_sent', 'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni']
      if (visaDocsStatuses.includes(status)) {
        internData.passport_page4_url = 'https://placehold.co/600x400?text=Passport'
        internData.photo_id_url = 'https://placehold.co/400x400?text=Photo+ID'
        internData.bank_statement_url = 'https://placehold.co/600x400?text=Bank+Statement'
        internData.return_plane_ticket_url = 'https://placehold.co/600x400?text=Plane+Ticket'
      }

      const { data: intern, error: internErr } = await supabase.from('interns').insert(internData).select('id').single()
      if (internErr || !intern) {
        console.error(`  ✗ Intern ${firstName} ${lastName}: ${internErr?.message}`)
        idx++
        continue
      }

      // Build case data
      const schoolId = schoolIds.length > 0 ? schoolIds[idx % schoolIds.length] : null
      const caseData: Record<string, unknown> = {
        intern_id: intern.id,
        destination_id: destinationId,
        status,
        school_id: schoolId,
        desired_start_date: randomDate(new Date(2026, 4, 1), new Date(2026, 8, 1)),
        desired_duration_months: [3, 4, 5, 6][idx % 4],
        assigned_manager_name: randomEl(MANAGER_NAMES),
      }

      // visa_submitted+
      const visaSubmittedStatuses = ['visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni']
      if (visaSubmittedStatuses.includes(status)) {
        caseData.visa_submitted_to_agent_at = new Date(now.getTime() - 15 * 86400000).toISOString()
        caseData.fazza_transfer_sent = true
        caseData.fazza_transfer_amount_idr = 8000000
      }

      // visa_received+
      if (['visa_received', 'arrival_prep', 'active', 'alumni'].includes(status)) {
        caseData.visa_recu = true
      }

      // arrival_prep
      if (status === 'arrival_prep') {
        caseData.actual_start_date = new Date(now.getTime() + 8 * 86400000).toISOString().split('T')[0]
        caseData.actual_end_date = new Date(now.getTime() + 128 * 86400000).toISOString().split('T')[0]
        caseData.flight_number = 'AF095'
        caseData.flight_departure_city = 'Paris CDG'
        caseData.housing_reserved = true
        caseData.welcome_kit_sent_at = now.toISOString()
        caseData.billet_avion = true
        caseData.papiers_visas = true
      }

      // active
      if (status === 'active') {
        caseData.actual_start_date = new Date(now.getTime() - 20 * 86400000).toISOString().split('T')[0]
        caseData.actual_end_date = new Date(now.getTime() + 100 * 86400000).toISOString().split('T')[0]
        caseData.billet_avion = true
        caseData.papiers_visas = true
        caseData.housing_reserved = true
        // Update intern card
        await supabase.from('interns').update({ intern_card_generated_at: now.toISOString() }).eq('id', intern.id)
      }

      // alumni
      if (status === 'alumni') {
        caseData.actual_start_date = new Date(now.getTime() - 150 * 86400000).toISOString().split('T')[0]
        caseData.actual_end_date = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
        caseData.billet_avion = true
        caseData.papiers_visas = true
        caseData.housing_reserved = true
      }

      // payment_pending+
      const paymentStatuses = ['payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni']
      if (paymentStatuses.includes(status)) {
        caseData.payment_amount = 990
        caseData.package_id = packageId
        caseData.visa_type_id = visaTypeId
      }

      // payment_received+
      const paidStatuses = ['payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni']
      if (paidStatuses.includes(status)) {
        caseData.payment_date = randomDate(new Date(2026, 2, 1), new Date(2026, 3, 8))
        caseData.payment_type = 'Virement'
        caseData.invoice_number = `BI-2026-${String(idx).padStart(2, '0')}-${firstName}${lastName}`
        caseData.convention_signee_check = true
      }

      if (visaDocsStatuses.includes(status)) {
        caseData.billet_avion = true
        caseData.papiers_visas = true
      }

      const { data: caseRow, error: caseErr } = await supabase.from('cases').insert(caseData).select('id').single()
      if (caseErr || !caseRow) {
        console.error(`  ✗ Case for ${firstName}: ${caseErr?.message}`)
        idx++
        continue
      }

      // job_submitted: 2 job_submissions
      if (status === 'job_submitted') {
        const { data: jobs } = await supabase.from('jobs').select('id').limit(2)
        if (jobs) {
          for (let j = 0; j < Math.min(2, jobs.length); j++) {
            await supabase.from('job_submissions').insert({
              case_id: caseRow.id,
              intern_id: intern.id,
              job_id: jobs[j].id,
              status: 'proposed',
              intern_interested: j === 0,
            })
          }
        }
      }

      // job_retained+: 1 job_submission retained
      const retainedStatuses = ['job_retained', 'convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni']
      if (retainedStatuses.includes(status)) {
        const { data: jobs } = await supabase.from('jobs').select('id').limit(1)
        if (jobs?.[0]) {
          await supabase.from('job_submissions').insert({
            case_id: caseRow.id,
            intern_id: intern.id,
            job_id: jobs[0].id,
            status: 'retained',
            intern_interested: true,
          })
        }
      }

      // Generate affiliate code for each case
      const code = `${firstName.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      await supabase.from('affiliate_codes').insert({
        code,
        intern_id: intern.id,
        case_id: caseRow.id,
      })

      console.log(`  ✓ ${status} — ${firstName} ${lastName} (${email})`)
      idx++
    }
  }

  console.log(`\n✅ Seeded ${idx} candidats across ${STATUSES.length} statuts.`)
}

seed().catch(console.error)
