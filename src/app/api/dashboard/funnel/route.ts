import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface InternRow { id: string; first_name: string; last_name: string; email: string; main_desired_job: string | null }
interface CaseRow { id: string; status: string; created_at: string; updated_at: string; desired_start_date: string | null; interns: InternRow | InternRow[] | null }

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
  }
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  // Fetch ALL cases with interns in one query
  const { data: allCases } = await admin
    .from('cases')
    .select('id, status, created_at, updated_at, desired_start_date, interns(id, first_name, last_name, email, main_desired_job)')
    .not('status', 'in', '(archived,completed,no_job_found)')
    .order('created_at', { ascending: false })
    .limit(2000) as { data: CaseRow[] | null }

  const cases = allCases ?? []

  // Group by stage
  const byStatus = (statuses: string[]) => cases.filter(c => statuses.includes(c.status))
  const countStatus = (statuses: string[]) => byStatus(statuses).length
  const profilesOf = (statuses: string[]) => byStatus(statuses).map(toProfile)

  const candidatures = byStatus(['lead'])
  const rdvPlanifies = byStatus(['rdv_booked'])
  const rejetes = byStatus(['not_qualified', 'not_interested', 'lost', 'suspended'])
  const aRecontacter = byStatus(['on_hold'])
  const qualifies = byStatus(['qualification_done'])
  const jobsPropose = byStatus(['job_submitted'])
  const jobsRetenus = byStatus(['job_retained'])
  const retenus = byStatus(['convention_signed', 'payment_pending', 'payment_received'])
  const paiementsRecus = byStatus(['payment_received'])
  const paiementsAttente = byStatus(['payment_pending'])
  const enStage = byStatus(['active'])
  const alumni = byStatus(['alumni'])

  // Départs ce mois: arrival_prep OU visa_received OU cases avec desired_start_date ce mois
  const departsMonth = cases.filter(c =>
    ['arrival_prep', 'visa_received'].includes(c.status) ||
    (c.desired_start_date && c.desired_start_date >= startOfMonth && c.desired_start_date <= endOfMonth)
  )

  // Stages terminés prévus: alumni ce mois
  const terminesPrevu = cases.filter(c =>
    c.status === 'alumni' && c.updated_at >= startOfMonth
  )

  // Taux de transformation (conversion vers embauche = payment_received)
  const totalEmbauches = paiementsRecus.length
  const totalCandidatures = candidatures.length || 1

  function convFromPrev(curr: number, prev: number): string {
    if (prev === 0) return '—'
    return `${Math.round((curr / prev) * 100)}%`
  }

  const stages = [
    {
      key: 'candidatures',
      label: 'Candidatures',
      emoji: '📥',
      count: candidatures.length,
      color: 'blue',
      profiles: candidatures.map(toProfile),
      conv_prev: '—',
      conv_embauche: `${Math.round((totalEmbauches / (candidatures.length || 1)) * 100)}%`,
      description: 'Formulaire rempli sur le site',
    },
    {
      key: 'rdv_planifies',
      label: 'RDV planifiés',
      emoji: '📅',
      count: rdvPlanifies.length,
      color: 'indigo',
      profiles: rdvPlanifies.map(toProfile),
      conv_prev: convFromPrev(rdvPlanifies.length, candidatures.length),
      conv_embauche: `${Math.round((totalEmbauches / (rdvPlanifies.length || 1)) * 100)}%`,
      description: 'Entretien de qualification booké',
    },
    {
      key: 'rejetes',
      label: 'Non qualifié / Rejeté',
      emoji: '❌',
      count: rejetes.length,
      color: 'red',
      profiles: rejetes.map(toProfile),
      conv_prev: convFromPrev(rejetes.length, rdvPlanifies.length),
      conv_embauche: '0%',
      description: 'No-show, non qualifiable ou rejeté',
    },
    {
      key: 'a_recontacter',
      label: 'À recontacter',
      emoji: '🔁',
      count: aRecontacter.length,
      color: 'amber',
      profiles: aRecontacter.map(toProfile),
      conv_prev: convFromPrev(aRecontacter.length, rdvPlanifies.length),
      conv_embauche: `${Math.round((totalEmbauches / (totalCandidatures)) * 100)}%`,
      description: 'RDV trop tôt — à replanifier',
    },
    {
      key: 'qualifies',
      label: 'Qualifiés',
      emoji: '✅',
      count: qualifies.length,
      color: 'violet',
      profiles: qualifies.map(toProfile),
      conv_prev: convFromPrev(qualifies.length, rdvPlanifies.length),
      conv_embauche: `${Math.round((totalEmbauches / (qualifies.length || 1)) * 100)}%`,
      description: 'Entretien réussi — recherche de stage',
    },
    {
      key: 'jobs_proposes',
      label: 'Jobs proposés',
      emoji: '📋',
      count: jobsPropose.length,
      color: 'orange',
      profiles: jobsPropose.map(toProfile),
      conv_prev: convFromPrev(jobsPropose.length, qualifies.length),
      conv_embauche: `${Math.round((totalEmbauches / (jobsPropose.length || 1)) * 100)}%`,
      description: 'Offres de stage envoyées',
    },
    {
      key: 'jobs_retenus',
      label: 'Jobs retenus',
      emoji: '🎯',
      count: jobsRetenus.length,
      color: 'green',
      profiles: jobsRetenus.map(toProfile),
      conv_prev: convFromPrev(jobsRetenus.length, jobsPropose.length),
      conv_embauche: `${Math.round((totalEmbauches / (jobsRetenus.length || 1)) * 100)}%`,
      description: 'Offre acceptée par le candidat',
    },
    {
      key: 'retenus_clients',
      label: 'Retenus (Clients)',
      emoji: '🤝',
      count: retenus.length,
      color: 'emerald',
      profiles: retenus.map(toProfile),
      conv_prev: convFromPrev(retenus.length, jobsRetenus.length),
      conv_embauche: `${Math.round((totalEmbauches / (retenus.length || 1)) * 100)}%`,
      description: 'Convention signée ou paiement',
    },
    {
      key: 'paiements_recus',
      label: 'Paiements reçus',
      emoji: '💶',
      count: paiementsRecus.length,
      color: 'teal',
      profiles: paiementsRecus.map(toProfile),
      conv_prev: convFromPrev(paiementsRecus.length, retenus.length),
      conv_embauche: '100%',
      description: 'Paiement confirmé ✓',
    },
    {
      key: 'paiements_attente',
      label: 'Paiements en attente',
      emoji: '⏳',
      count: paiementsAttente.length,
      color: 'yellow',
      profiles: paiementsAttente.map(toProfile),
      conv_prev: '—',
      conv_embauche: '—',
      description: 'En attente de règlement',
    },
    {
      key: 'departs_mois',
      label: 'Départs ce mois',
      emoji: '🛫',
      count: departsMonth.length,
      color: 'sky',
      profiles: departsMonth.map(toProfile),
      conv_prev: '—',
      conv_embauche: '—',
      description: `Départs prévus en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`,
    },
    {
      key: 'en_stage',
      label: 'En stage à Bali',
      emoji: '🌴',
      count: enStage.length,
      color: 'emerald',
      profiles: enStage.map(toProfile),
      conv_prev: '—',
      conv_embauche: '—',
      description: 'Actuellement en stage',
    },
    {
      key: 'termines_prevus',
      label: 'Stages terminés (mois)',
      emoji: '🎓',
      count: terminesPrevu.length,
      color: 'zinc',
      profiles: terminesPrevu.map(toProfile),
      conv_prev: '—',
      conv_embauche: '—',
      description: `Terminés ce mois`,
    },
  ]

  return NextResponse.json({ stages, total_cases: cases.length })
}
