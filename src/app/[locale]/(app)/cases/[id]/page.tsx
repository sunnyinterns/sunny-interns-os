'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { TabProcess } from '@/components/cases/tabs/TabProcess'
import { TabProfil } from '@/components/cases/tabs/TabProfil'
import { TabJobs } from '@/components/cases/tabs/TabJobs'
import { TabVisa } from '@/components/cases/tabs/TabVisa'
import { TabArrivee } from '@/components/cases/tabs/TabArrivee'
import { TabFacturation } from '@/components/cases/tabs/TabFacturation'
import { InternCardDigital } from '@/components/cases/InternCardDigital'
import type { CaseStatus } from '@/lib/types'

// Minimal case shape from API
interface CaseDetail {
  id: string
  first_name: string
  last_name: string
  status: CaseStatus
  arrival_date?: string | null
  return_date?: string | null
  desired_start_date?: string | null
  desired_end_date?: string | null
  desired_duration_months?: number | null
  assigned_to?: string | null
  flight_number?: string | null
  flight_arrival_datetime?: string | null
  flight_departure_city?: string | null
  dropoff_address?: string | null
  last_stopover_city?: string | null
  intern_bali_phone?: string | null
  internship_type?: string | null
  visa_submitted_at?: string | null
  visa_submitted_to_agent_at?: string | null
  visa_received_at?: string | null
  portal_token?: string | null
  package_id?: string | null
  note_for_agent?: string | null
  payment_amount?: number | null
  payment_date?: string | null
  invoice_sent_at?: string | null
  discount_percentage?: number | null
  iban?: string | null
  legal_entity?: string | null
  billing_entity_id?: string | null
  fillout_bill_form_url?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  fazza_transfer_sent?: boolean | null
  fazza_transfer_amount_idr?: number | null
  fazza_transfer_date?: string | null
  whatsapp_ambassador_bali_msg?: string | null
  whatsapp_ambassador_done_msg?: string | null
  // Checklist booleans
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  logement_scooter_formulaire?: boolean | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  logement_reserve?: boolean | null
  housing_reserved?: boolean | null
  scooter_reserved?: boolean | null
  scooter_reserve_check?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
  driver_booked?: boolean | null
  guesthouse_id?: string | null
  guesthouse_preselection?: string | null
  welcome_kit_sent_at?: string | null
  interns?: {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    whatsapp?: string
    phone?: string
    nationality?: string
    gender?: string
    birth_date?: string
    passport_number?: string
    passport_expiry?: string
    passport_issue_city?: string
    passport_issue_date?: string
    avatar_url?: string
    intern_level?: string
    diploma_track?: string
    school_contact_name?: string
    school_contact_email?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    insurance_company?: string
    main_desired_job?: string
    desired_sectors?: string[]
    stage_ideal?: string
    spoken_languages?: string[]
    linkedin_url?: string
    cv_url?: string
    qualification_debrief?: string
    intern_address?: string
    intern_signing_city?: string
    housing_budget?: string
    housing_city?: string
    wants_scooter?: boolean
    touchpoint?: string
    private_comment_for_employer?: string
    referred_by_code?: string
    preferred_language?: string
    mother_first_name?: string
    mother_last_name?: string
    intern_bank_name?: string
    intern_bank_iban?: string
    passport_page4_url?: string | null
    photo_id_url?: string | null
    bank_statement_url?: string | null
    return_plane_ticket_url?: string | null
  } | null
  schools?: { id: string; name: string; city?: string | null } | null
  destinations?: { name: string } | null
  packages?: { id: string; name: string; price_eur: number; visa_cost_idr?: number | null; package_type?: string | null; processing_days?: number | null; validity_label?: string | null } | null
  visa_types?: { id: string; code: string; name: string } | null
  visa_agents?: { id: string; company_name: string; email?: string | null; whatsapp?: string | null } | null
  billing_entities?: { id: string; name: string; iban?: string | null; bank_name?: string | null; is_default?: boolean } | null
  job_submissions?: Array<{
    id: string
    status?: string
    intern_interested?: boolean | null
    cv_revision_requested?: boolean | null
    notes_charly?: string | null
    jobs?: {
      id: string
      title?: string
      public_title?: string
      wished_start_date?: string | null
      wished_duration_months?: number | null
      companies?: { id: string; name: string } | null
      contacts?: { id: string; first_name?: string; last_name?: string; email?: string; whatsapp?: string } | null
    } | null
  }> | null
  activity_feed?: Array<{
    id: string
    action_type: string
    description: string
    created_at: string
  }>
}

const STATUS_LABELS: Partial<Record<CaseStatus, string>> = {
  lead: 'Lead',
  rdv_booked: 'RDV planifié',
  qualification_done: 'Qualifié',
  job_submitted: 'Job soumis',
  job_retained: 'Job retenu',
  convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente',
  payment_received: 'Paiement reçu',
  visa_in_progress: 'Visa en cours',
  visa_received: 'Visa reçu',
  arrival_prep: 'Préparation arrivée',
  active: 'Actif',
  alumni: 'Alumni',
  not_interested: 'Pas intéressé',
  not_qualified: 'Non qualifié',
  on_hold: 'En attente',
  suspended: 'Suspendu',
  visa_refused: 'Visa refusé',
  archived: 'Archivé',
  completed: 'Terminé',
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: 'Demande', bg: '#e5e7eb', text: '#374151' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#7c3aed' },
  job_submitted: { label: 'Jobs proposés', bg: '#ffedd5', text: '#c2410c' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#065f46' },
  convention_signed: { label: 'Convention', bg: '#d1fae5', text: '#065f46' },
  payment_pending: { label: 'Paiement \u23f3', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé \u2713', bg: '#d1fae5', text: '#065f46' },
  visa_docs_sent: { label: 'Docs visa', bg: '#ffedd5', text: '#c2410c' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: 'Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa reçu \u2713', bg: '#d1fae5', text: '#065f46' },
  arrival_prep: { label: 'Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: 'En stage \ud83c\udf34', bg: '#d1fae5', text: '#065f46' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
}

const PROCESS_STEPS = [
  'lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained',
  'convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent',
  'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni',
] as const

const NEXT_ACTIONS: Record<string, string> = {
  lead: 'Booker un RDV de qualification avec le candidat',
  rdv_booked: 'Faire l\u2019entretien et qualifier le candidat',
  qualification_done: 'Proposer des offres de stage au candidat',
  job_submitted: 'Attendre la réponse du candidat et de l\u2019employeur',
  job_retained: 'Envoyer la lettre d\u2019engagement et la convention',
  convention_signed: 'Demander le paiement au candidat',
  payment_pending: 'Confirmer la réception du paiement',
  payment_received: 'Préparer et envoyer les documents visa',
  visa_docs_sent: 'Envoyer le dossier à l\u2019agent visa FAZZA',
  visa_submitted: 'Attendre la réception du visa',
  visa_received: 'Préparer l\u2019arrivée : logement, scooter, chauffeur',
  arrival_prep: 'Confirmer le chauffeur et l\u2019hébergement',
  active: 'Suivre le stage et préparer le départ',
  alumni: 'Envoyer le formulaire ambassadeur',
}

function statusToBadgeVariant(status: CaseStatus): 'default' | 'success' | 'attention' | 'critical' | 'info' {
  if (['active', 'alumni', 'completed', 'payment_received', 'visa_received'].includes(status)) return 'success'
  if (['payment_pending', 'visa_in_progress', 'arrival_prep'].includes(status)) return 'attention'
  if (['not_interested', 'not_qualified', 'suspended', 'visa_refused', 'archived'].includes(status)) return 'critical'
  return 'info'
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

type TabKey = 'process' | 'profil' | 'jobs' | 'visa' | 'arrivee' | 'facturation'

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const tabFromUrl = searchParams?.get('tab') as TabKey | null

  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl ?? 'process')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInternCard, setShowInternCard] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/cases/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<CaseDetail>
      })
      .then((data) => { setCaseData(data); setLoading(false) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-20 bg-zinc-100 rounded-xl" />
        <div className="h-10 bg-zinc-100 rounded-xl" />
        <div className="h-48 bg-zinc-100 rounded-xl" />
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="p-6 space-y-4">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          {error ?? 'Dossier introuvable'}
        </div>
        <button
          onClick={() => router.push(`/${locale}/pipeline`)}
          className="px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-[#1a1918] rounded-lg transition-colors"
        >
          ← Retour au pipeline
        </button>
      </div>
    )
  }

  const isVisaOnly = caseData.internship_type === 'visa_only'
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'process', label: 'Process' },
    { key: 'profil', label: 'Profil' },
    ...(!isVisaOnly ? [{ key: 'jobs' as TabKey, label: 'Jobs' }] : []),
    { key: 'visa', label: 'Visa' },
    ...(!isVisaOnly ? [{ key: 'arrivee' as TabKey, label: 'Arrivée' }] : []),
    { key: 'facturation', label: 'Facturation' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-100 bg-white">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base font-semibold">
              {getInitials(caseData.first_name, caseData.last_name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold text-[#1a1918]">
                {caseData.first_name} {caseData.last_name}
              </h1>
              <Badge
                label={STATUS_LABELS[caseData.status] ?? caseData.status}
                variant={statusToBadgeVariant(caseData.status)}
              />
              {isVisaOnly && (
                <Badge label="Visa Only" variant="info" />
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {caseData.arrival_date && (
                <span className="text-sm text-zinc-500">
                  Arrivée : {new Date(caseData.arrival_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {caseData.return_date && (
                <span className="text-sm text-zinc-500">
                  Retour : {new Date(caseData.return_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {caseData.internship_type && (
                <span className="text-sm text-zinc-400">{caseData.internship_type}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {caseData.status === 'active' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowInternCard(true)}
              >
                Carte stagiaire
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
            >
              ← Retour
            </Button>
          </div>
        </div>
      </div>

      {/* Étape actuelle — toujours visible */}
      {(() => {
        const badge = STATUS_BADGE[caseData.status]
        const stepIdx = PROCESS_STEPS.indexOf(caseData.status as typeof PROCESS_STEPS[number])
        const step = stepIdx >= 0 ? stepIdx + 1 : null
        const nextAction = NEXT_ACTIONS[caseData.status]
        return (
          <div className="mx-6 mt-4 mb-2 px-4 py-3 rounded-xl border" style={{ backgroundColor: badge?.bg ? `${badge.bg}33` : '#f9fafb', borderColor: badge?.bg ?? '#e5e7eb' }}>
            <div className="flex items-center gap-3 flex-wrap">
              {badge && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>
              )}
              {step && (
                <span className="text-xs text-zinc-500">
                  Étape {step} sur 14 du processus
                </span>
              )}
            </div>
            {nextAction && (
              <p className="text-xs text-zinc-600 mt-1.5">
                <span className="font-semibold">Prochaine action :</span> {nextAction}
              </p>
            )}
          </div>
        )
      })()}

      {/* Tab nav */}
      <div className="flex border-b border-zinc-100 bg-white px-6 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-[#c8a96e] text-[#c8a96e]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'process' && (
          <TabProcess
            caseId={caseData.id}
            status={caseData.status}
            activityFeed={caseData.activity_feed ?? []}
            isVisaOnly={isVisaOnly}
            checklist={{
              billet_avion: caseData.billet_avion,
              papiers_visas: caseData.papiers_visas,
              visa_recu: caseData.visa_recu,
              logement_scooter_formulaire: caseData.logement_scooter_formulaire,
              logement_reserve: caseData.logement_reserve,
              scooter_reserve_check: caseData.scooter_reserve_check,
              convention_signee_check: caseData.convention_signee_check,
              chauffeur_reserve: caseData.chauffeur_reserve,
            }}
            internEmail={caseData.interns?.email}
            paymentAmount={caseData.payment_amount}
            filloutBillFormUrl={caseData.fillout_bill_form_url}
            caseData={caseData as unknown as Record<string, unknown>}
            onRefresh={() => router.refresh()}
          />
        )}
        {activeTab === 'profil' && (
          <TabProfil
            intern={caseData.interns ?? null}
            arrivalDate={caseData.actual_start_date ?? caseData.desired_start_date ?? null}
            internId={(caseData.interns as any)?.id ?? null}
            schoolName={(caseData.schools as any)?.name ?? null}
            desiredStartDate={caseData.desired_start_date ?? null}
            desiredEndDate={caseData.actual_end_date ?? caseData.desired_end_date ?? null}
            desiredDurationMonths={caseData.desired_duration_months ?? null}
          />
        )}
        {activeTab === 'jobs' && (
          <TabJobs
            caseId={caseData.id}
            firstName={caseData.first_name}
            lastName={caseData.last_name}
          />
        )}
        {activeTab === 'visa' && (
          <TabVisa caseData={{
            id: caseData.id,
            status: caseData.status,
            portal_token: caseData.portal_token,
            package_id: caseData.package_id,
            note_for_agent: caseData.note_for_agent,
            visa_submitted_to_agent_at: caseData.visa_submitted_to_agent_at,
            visa_submitted_at: caseData.visa_submitted_at,
            visa_received_at: caseData.visa_received_at,
            billet_avion: caseData.billet_avion,
            papiers_visas: caseData.papiers_visas,
            fazza_transfer_sent: caseData.fazza_transfer_sent,
            fazza_transfer_amount_idr: caseData.fazza_transfer_amount_idr,
            fazza_transfer_date: caseData.fazza_transfer_date,
            interns: caseData.interns as Parameters<typeof TabVisa>[0]['caseData']['interns'],
            visa_agents: caseData.visa_agents ?? null,
            packages: caseData.packages ?? null,
          }} />
        )}
        {activeTab === 'arrivee' && (
          <TabArrivee caseData={{
            id: caseData.id,
            flight_number: caseData.flight_number,
            flight_arrival_datetime: caseData.flight_arrival_datetime,
            dropoff_address: caseData.dropoff_address,
            last_stopover_city: caseData.last_stopover_city,
            intern_bali_phone: caseData.intern_bali_phone,
            first_name: caseData.first_name,
            last_name: caseData.last_name,
            arrival_date: caseData.arrival_date,
            actual_start_date: caseData.actual_start_date,
            actual_end_date: caseData.actual_end_date,
            housing_reserved: caseData.housing_reserved ?? caseData.logement_reserve,
            scooter_reserved: caseData.scooter_reserved,
            guesthouse_id: caseData.guesthouse_id,
            welcome_kit_sent_at: caseData.welcome_kit_sent_at,
            interns: caseData.interns ? { phone: caseData.interns.phone } : null,
          }} />
        )}
        {activeTab === 'facturation' && (
          <TabFacturation caseId={caseData.id} caseData={{ id: caseData.id, interns: caseData.interns ? { first_name: caseData.interns.first_name ?? '', last_name: caseData.interns.last_name ?? '' } : null }} />
        )}
      </div>

      {showEditModal && (
        <NewCaseModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); window.location.reload() }}
        />
      )}

      {showInternCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInternCard(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InternCardDigital
              caseData={{
                id: caseData.id,
                status: caseData.status,
                arrival_date: caseData.arrival_date,
                return_date: caseData.return_date,
                destination: null,
                interns: caseData.interns ? {
                  first_name: caseData.interns.first_name,
                  last_name: caseData.interns.last_name,
                  email: caseData.interns.email,
                  avatar_url: caseData.interns.avatar_url,
                } : null,
              }}
            />
            <button
              onClick={() => setShowInternCard(false)}
              className="mt-4 w-full text-center text-sm text-white/70 hover:text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
