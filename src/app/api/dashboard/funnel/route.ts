import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface InternRow { id: string; first_name: string; last_name: string; email: string; main_desired_job: string | null }
interface CaseRow {
  id: string
  status: string
  created_at: string
  updated_at: string
  desired_start_date: string | null
  desired_duration_months: number | null
  desired_sectors: string[] | null
  intern_first_meeting_date: string | null
  interns: InternRow | InternRow[] | null
}

function getIntern(row: CaseRow): InternRow | null {
  if (!row.interns) return null
  if (Array.isArray(row.interns)) return row.interns[0] ?? null
  return row.interns
}

function toProfile(row: CaseRow) {
  const i = getIntern(row)
  return {
    case_id: row.id,
    name: i ? `${i.first_name} ${i.last_name}`.trim() : '—',
    email: i?.email ?? null,
    job: i?.main_desired_job ?? null,
    status: row.status,
    date: row.updated_at ?? row.created_at,
    start_date: row.desired_start_date ?? null,
    duration_months: row.desired_duration_months ?? null,
    rdv_date: row.intern_first_meeting_date ? String(row.intern_first_meeting_date) : null,
    desired_sectors: row.desired_sectors ?? null,
  }
}

export interface FunnelSection {
  id: string
  label: string
  emoji: string
  color: string
  stages: FunnelStage[]
}

export interface FunnelStage {
  key: string
  label: string
  emoji: string
  count: number
  color: string
  profiles: ReturnType<typeof toProfile>[]
  conv_prev: string
  description: string
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString()

  const { data: allCases } = await admin
    .from('cases')
    .select('id, status, created_at, updated_at, desired_start_date, desired_duration_months, desired_sectors, intern_first_meeting_date, interns(id, first_name, last_name, email, main_desired_job)')
    .not('status', 'in', '(archived,completed)')
    .order('created_at', { ascending: false })
    .limit(2000) as { data: CaseRow[] | null }

  // Fetch leads for stats
  const { data: allLeads } = await admin
    .from('leads')
    .select('id, status, created_at')
    .not('status', 'eq', 'converted')
  const leads = allLeads ?? []
  const leadsToday = leads.filter(l => l.created_at >= startOfToday).length
  const leadsConverted = allLeads ? allLeads.filter(l => l.status === 'converted').length : 0
  const totalLeads = leads.length
  const conversionRate = totalLeads > 0 ? Math.round((leadsConverted / (totalLeads + leadsConverted)) * 100) : 0

  const cases = allCases ?? []
  const by = (statuses: string[]) => cases.filter(c => statuses.includes(c.status))
  const conv = (curr: number, prev: number) => prev === 0 ? '—' : `${Math.round((curr / prev) * 100)}%`

  // RDV stats
  const rdvsThisWeek = cases.filter(c =>
    c.intern_first_meeting_date &&
    c.intern_first_meeting_date >= startOfToday &&
    c.intern_first_meeting_date <= endOfWeek
  )
  const upcomingRdvs = cases
    .filter(c => c.intern_first_meeting_date && c.intern_first_meeting_date >= startOfToday)
    .sort((a, b) => (a.intern_first_meeting_date! > b.intern_first_meeting_date! ? 1 : -1))
    .slice(0, 3)
    .map(toProfile)

  // Pipeline stats
  const inProgressStatuses = ['rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep']
  const inProgress = cases.filter(c => inProgressStatuses.includes(c.status)).length
  const completedThisMonth = cases.filter(c => c.status === 'alumni' && c.updated_at >= startOfMonth).length

  // ── SECTION 1: LEADS (Candidature → À recontacter) ──────────────────────
  const candidatures = by(['lead'])
  const rdvPlanifies = by(['rdv_booked'])
  const rejetes = by(['not_qualified', 'not_interested', 'lost', 'visa_refused'])
  const aRecontacter = by(['on_hold', 'suspended'])

  // ── SECTION 2: MATCHING (Qualifiés → Job retenu) ────────────────────────
  const qualifies = by(['qualification_done'])
  const jobsPropose = by(['job_submitted'])
  const jobsRetenus = by(['job_retained'])

  // ── SECTION 3: CLIENTS EN PROCÉDURE (Convention → Départ) ───────────────
  const conventionAttente = by(['convention_signed'])  // convention signée en attente confirmation
  const paiementAttente = by(['payment_pending'])
  const paiementRecu = by(['payment_received'])
  const visaDocsAttente = by(['visa_docs_sent'])
  const visaEnCours = by(['visa_submitted', 'visa_in_progress'])
  const visaRecu = by(['visa_received'])
  const departsMois = cases.filter(c =>
    c.status === 'arrival_prep' ||
    (c.desired_start_date && c.desired_start_date >= startOfMonth && c.desired_start_date <= endOfMonth)
  )

  // ── SECTION 4: EN STAGE ───────────────────────────────────────────────────
  const enStage = by(['active'])
  const terminesMois = cases.filter(c => c.status === 'alumni' && c.updated_at >= startOfMonth)

  const sections: FunnelSection[] = [
    {
      id: 'leads',
      label: 'Leads',
      emoji: '🎯',
      color: 'blue',
      stages: [
        {
          key: 'candidatures',
          label: 'Candidatures',
          emoji: '📥',
          count: candidatures.length,
          color: 'blue',
          profiles: candidatures.map(toProfile),
          conv_prev: '—',
          description: 'Formulaire rempli',
        },
        {
          key: 'rdv_planifies',
          label: 'RDV planifiés',
          emoji: '📅',
          count: rdvPlanifies.length,
          color: 'indigo',
          profiles: rdvPlanifies.map(toProfile),
          conv_prev: conv(rdvPlanifies.length, candidatures.length),
          description: 'Entretien booké',
        },
        {
          key: 'rejetes',
          label: 'Non qualifiés / Rejetés',
          emoji: '❌',
          count: rejetes.length,
          color: 'red',
          profiles: rejetes.map(toProfile),
          conv_prev: '—',
          description: 'No-show, non qualifiable, rejeté',
        },
        {
          key: 'a_recontacter',
          label: 'À recontacter',
          emoji: '🔁',
          count: aRecontacter.length,
          color: 'amber',
          profiles: aRecontacter.map(toProfile),
          conv_prev: '—',
          description: 'RDV trop tôt — à replanifier',
        },
      ],
    },
    {
      id: 'matching',
      label: 'Matching',
      emoji: '🤝',
      color: 'violet',
      stages: [
        {
          key: 'qualifies',
          label: 'Qualifiés',
          emoji: '✅',
          count: qualifies.length,
          color: 'violet',
          profiles: qualifies.map(toProfile),
          conv_prev: conv(qualifies.length, rdvPlanifies.length),
          description: 'Entretien réussi',
        },
        {
          key: 'jobs_proposes',
          label: 'Jobs proposés',
          emoji: '📋',
          count: jobsPropose.length,
          color: 'orange',
          profiles: jobsPropose.map(toProfile),
          conv_prev: conv(jobsPropose.length, qualifies.length),
          description: 'Offres envoyées',
        },
        {
          key: 'jobs_retenus',
          label: 'Jobs retenus',
          emoji: '🎯',
          count: jobsRetenus.length,
          color: 'green',
          profiles: jobsRetenus.map(toProfile),
          conv_prev: conv(jobsRetenus.length, jobsPropose.length),
          description: 'Offre acceptée',
        },
      ],
    },
    {
      id: 'procedure',
      label: 'Clients en procédure',
      emoji: '📁',
      color: 'teal',
      stages: [
        {
          key: 'convention_attente',
          label: 'Convention en attente',
          emoji: '📝',
          count: conventionAttente.length,
          color: 'yellow',
          profiles: conventionAttente.map(toProfile),
          conv_prev: conv(conventionAttente.length, jobsRetenus.length),
          description: 'Convention à signer',
        },
        {
          key: 'paiement_attente',
          label: 'Paiement en attente',
          emoji: '⏳',
          count: paiementAttente.length,
          color: 'amber',
          profiles: paiementAttente.map(toProfile),
          conv_prev: '—',
          description: 'En attente de règlement',
        },
        {
          key: 'paiement_recu',
          label: 'Paiement reçu',
          emoji: '💶',
          count: paiementRecu.length,
          color: 'teal',
          profiles: paiementRecu.map(toProfile),
          conv_prev: conv(paiementRecu.length, paiementAttente.length),
          description: 'Paiement confirmé ✓',
        },
        {
          key: 'visa_docs_attente',
          label: 'Éléments visa en attente',
          emoji: '📄',
          count: visaDocsAttente.length,
          color: 'sky',
          profiles: visaDocsAttente.map(toProfile),
          conv_prev: '—',
          description: 'Documents à collecter',
        },
        {
          key: 'visa_en_cours',
          label: 'Éléments visa reçus',
          emoji: '🛂',
          count: visaEnCours.length,
          color: 'blue',
          profiles: visaEnCours.map(toProfile),
          conv_prev: conv(visaEnCours.length, visaDocsAttente.length),
          description: 'Visa soumis / en traitement',
        },
        {
          key: 'visa_recu',
          label: 'Visa reçu',
          emoji: '✈️',
          count: visaRecu.length,
          color: 'emerald',
          profiles: visaRecu.map(toProfile),
          conv_prev: conv(visaRecu.length, visaEnCours.length),
          description: 'Visa obtenu ✓',
        },
        {
          key: 'departs_mois',
          label: 'Départs ce mois',
          emoji: '🛫',
          count: departsMois.length,
          color: 'red',
          profiles: departsMois.map(toProfile),
          conv_prev: '—',
          description: `Départs en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`,
        },
      ],
    },
    {
      id: 'en_stage',
      label: 'En stage',
      emoji: '🌴',
      color: 'emerald',
      stages: [
        {
          key: 'en_stage',
          label: 'En stage à Bali',
          emoji: '🌴',
          count: enStage.length,
          color: 'emerald',
          profiles: enStage.map(toProfile),
          conv_prev: '—',
          description: 'Actuellement en stage',
        },
        {
          key: 'termines_mois',
          label: 'Stages terminés ce mois',
          emoji: '🎓',
          count: terminesMois.length,
          color: 'zinc',
          profiles: terminesMois.map(toProfile),
          conv_prev: '—',
          description: `Terminés en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`,
        },
      ],
    },
  ]

  return NextResponse.json({
    sections,
    meta: {
      leads: { total: totalLeads, today: leadsToday, conversion_rate: conversionRate },
      rdvs: { this_week: rdvsThisWeek.length, upcoming: upcomingRdvs },
      pipeline: { in_progress: inProgress, completed_this_month: completedThisMonth },
      total_cases: cases.length,
    },
  })
}
