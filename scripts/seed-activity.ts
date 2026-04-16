import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CaseRow {
  id: string
  status: string
  interns: { first_name: string; last_name: string } | null
}

const STATUS_ACTIVITIES: Record<string, { type: string; title: string; description: string; priority?: string }[]> = {
  lead: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue via /apply' },
  ],
  rdv_booked: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue via /apply' },
    { type: 'status_changed', title: 'Statut changé → RDV booké', description: 'Le dossier est passé de "Nouveau lead" à "RDV booké"' },
    { type: 'rdv_booked', title: 'RDV de qualification planifié', description: 'Entretien prévu avec le candidat' },
  ],
  qualification_done: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue via /apply' },
    { type: 'status_changed', title: 'Statut changé → Qualifié', description: 'Le dossier est passé de "RDV booké" à "Qualifié"' },
    { type: 'cv_uploaded', title: 'CV uploadé', description: 'Nouveau CV uploadé par le candidat (v1)' },
  ],
  job_submitted: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue' },
    { type: 'cv_uploaded', title: 'CV uploadé', description: 'Nouveau CV uploadé par le candidat (v1)' },
    { type: 'job_proposed', title: 'Offre proposée : Marketing Assistant', description: 'L\'offre "Marketing Assistant" chez Bali Digital a été proposée' },
    { type: 'email_sent', title: 'Email envoyé à l\'employeur', description: 'Email "CV candidat" envoyé à l\'employeur' },
  ],
  job_retained: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue' },
    { type: 'job_proposed', title: 'Offre proposée : Content Creator', description: 'L\'offre "Content Creator" chez Bali Surf Co. a été proposée' },
    { type: 'job_retained', title: 'Job retenu : Content Creator', description: 'Le poste "Content Creator" chez Bali Surf Co. a été retenu', priority: 'high' },
    { type: 'status_changed', title: 'Statut changé → Job retenu', description: 'Le dossier est passé de "Jobs proposés" à "Job retenu"' },
  ],
  convention_signed: [
    { type: 'case_created', title: 'Nouveau dossier créé', description: 'Candidature reçue' },
    { type: 'job_retained', title: 'Job retenu : Social Media Manager', description: 'Le poste a été retenu', priority: 'high' },
    { type: 'convention_signed', title: 'Convention de stage signée', description: 'Convention signée par les 3 parties' },
    { type: 'status_changed', title: 'Statut changé → Convention signée', description: 'Le dossier est passé à "Convention signée"' },
  ],
  payment_pending: [
    { type: 'convention_signed', title: 'Convention de stage signée', description: 'Convention signée par les 3 parties' },
    { type: 'status_changed', title: 'Statut changé → Paiement en attente', description: 'Le dossier est passé à "Paiement en attente"', priority: 'high' },
    { type: 'email_sent', title: 'Email de demande de paiement envoyé', description: 'Email "Demande de paiement" envoyé au stagiaire' },
  ],
  payment_received: [
    { type: 'payment_received', title: 'Paiement reçu — 990€', description: 'Paiement de 990€ confirmé par virement', priority: 'high' },
    { type: 'email_sent', title: 'Email confirmation paiement envoyé', description: 'Email de confirmation envoyé au stagiaire' },
    { type: 'status_changed', title: 'Statut changé → Payé', description: 'Le dossier est passé à "Paiement reçu"' },
  ],
  visa_in_progress: [
    { type: 'payment_received', title: 'Paiement reçu — 1290€', description: 'Paiement de 1290€ confirmé par virement', priority: 'high' },
    { type: 'visa_docs_completed', title: 'Documents visa complétés', description: 'Le candidat a uploadé tous les documents requis pour le visa', priority: 'high' },
    { type: 'fazza_transfer', title: 'Virement FAZZA envoyé', description: 'Virement de 8.000.000 IDR envoyé à l\'agent visa' },
    { type: 'status_changed', title: 'Statut changé → Visa en cours', description: 'Le dossier est passé à "Visa en cours"' },
  ],
  visa_received: [
    { type: 'visa_docs_completed', title: 'Documents visa complétés', description: 'Tous les documents requis uploadés', priority: 'high' },
    { type: 'fazza_transfer', title: 'Virement FAZZA envoyé', description: 'Virement de 8.000.000 IDR envoyé à l\'agent visa' },
    { type: 'visa_received', title: 'Visa reçu de l\'agent FAZZA', description: 'Le visa a été reçu et est prêt pour le départ', priority: 'high' },
    { type: 'status_changed', title: 'Statut changé → Visa reçu', description: 'Le dossier est passé à "Visa reçu"' },
  ],
  arrival_prep: [
    { type: 'visa_received', title: 'Visa reçu', description: 'Le visa B211A a été reçu', priority: 'high' },
    { type: 'welcome_kit_sent', title: 'Welcome kit envoyé', description: 'Le welcome kit Bali Interns a été envoyé au stagiaire' },
    { type: 'driver_booked', title: 'Chauffeur réservé', description: 'Le chauffeur pour l\'arrivée à l\'aéroport a été confirmé' },
    { type: 'status_changed', title: 'Statut changé → Préparation départ', description: 'Le dossier est passé à "Préparation départ"' },
  ],
  active: [
    { type: 'visa_received', title: 'Visa reçu', description: 'Le visa B211A a été reçu', priority: 'high' },
    { type: 'welcome_kit_sent', title: 'Welcome kit envoyé', description: 'Le welcome kit a été envoyé' },
    { type: 'driver_booked', title: 'Chauffeur réservé', description: 'Chauffeur confirmé pour l\'aéroport' },
    { type: 'intern_arrived', title: 'Stagiaire arrivé à Bali', description: 'Le stagiaire est arrivé et a été déposé à son logement' },
    { type: 'status_changed', title: 'Statut changé → En stage', description: 'Le dossier est passé à "En stage"' },
  ],
  alumni: [
    { type: 'intern_arrived', title: 'Stagiaire arrivé à Bali', description: 'Le stagiaire est arrivé' },
    { type: 'intern_departed', title: 'Stage terminé', description: 'Le stagiaire a terminé son stage avec succès' },
    { type: 'status_changed', title: 'Statut changé → Alumni', description: 'Le dossier est passé à "Alumni"' },
  ],
}

async function seed() {
  console.log('Fetching cases...')
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, status, interns(first_name, last_name)')
    .limit(30)

  if (error) { console.error(error); return }
  if (!cases?.length) { console.log('No cases found'); return }

  console.log(`Found ${cases.length} cases`)

  const rows: Record<string, unknown>[] = []

  for (const c of cases as unknown as CaseRow[]) {
    const activities = STATUS_ACTIVITIES[c.status]
    if (!activities) continue

    const internName = c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : 'Stagiaire'

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i]
      const daysAgo = (activities.length - i) * 2 + Math.floor(Math.random() * 3)
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

      rows.push({
        case_id: c.id,
        type: a.type,
        title: a.title.replace(/le candidat|le stagiaire/gi, internName),
        description: a.description.replace(/le candidat|le stagiaire/gi, internName),
        priority: a.priority ?? 'normal',
        status: 'done',
        source: 'system',
        metadata: {},
        created_at: createdAt,
      })
    }
  }

  if (rows.length === 0) { console.log('No activities to insert'); return }

  console.log(`Inserting ${rows.length} activity entries...`)
  const { error: insertError } = await supabase.from('activity_feed').insert(rows)
  if (insertError) {
    console.error('Insert error:', insertError)
  } else {
    console.log(`✅ Seeded ${rows.length} activity entries`)
  }
}

async function seedCaseLogs() {
  console.log('\nSeeding case_logs...')
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, status, created_at, interns(first_name, last_name)')
    .order('created_at', { ascending: true })

  if (error || !cases) { console.error('Failed to fetch cases:', error?.message); return }

  const STATUS_FLOW = [
    'lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained',
    'convention_signed', 'payment_pending', 'payment_received',
    'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received',
    'arrival_prep', 'active', 'alumni',
  ]
  const LABELS: Record<string, string> = {
    lead: 'Lead', rdv_booked: 'RDV booke', qualification_done: 'Qualifie',
    job_submitted: 'CV envoye', job_retained: 'CV retenu', convention_signed: 'Convention signee',
    payment_pending: 'Paiement en attente', payment_received: 'Paiement recu',
    visa_docs_sent: 'Docs visa', visa_submitted: 'Visa soumis',
    visa_in_progress: 'Visa en cours', visa_received: 'Visa recu',
    arrival_prep: 'Depart imminent', active: 'En stage', alumni: 'Alumni',
  }

  const logs: Record<string, unknown>[] = []
  for (const c of cases as any[]) {
    const statusIdx = STATUS_FLOW.indexOf(c.status)
    if (statusIdx < 0) continue
    const baseDate = new Date(c.created_at)

    for (let i = 0; i <= statusIdx; i++) {
      const prev = i === 0 ? null : STATUS_FLOW[i - 1]
      const cur = STATUS_FLOW[i]
      logs.push({
        case_id: c.id,
        author_name: 'Sidney Ruby',
        author_email: 'sidney.ruby@gmail.com',
        action: 'status_change',
        field_name: 'status',
        field_label: 'Statut',
        old_value: prev ? (LABELS[prev] ?? prev) : '—',
        new_value: LABELS[cur] ?? cur,
        description: prev ? `Statut: ${LABELS[prev]} → ${LABELS[cur]}` : `Dossier cree (${LABELS[cur]})`,
        created_at: new Date(baseDate.getTime() + i * 2 * 86400000).toISOString(),
      })
    }
  }

  if (logs.length === 0) { console.log('No logs to insert'); return }
  console.log(`Inserting ${logs.length} case_logs...`)
  const { error: err } = await supabase.from('case_logs').insert(logs)
  if (err) console.error('Insert error:', err)
  else console.log(`Seeded ${logs.length} case_logs`)
}

seed().then(() => seedCaseLogs()).catch(console.error)
