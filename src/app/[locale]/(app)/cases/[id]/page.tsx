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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseDetail = Record<string, any>

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
  lead: { label: 'Demande', bg: '#f4f4f5', text: '#71717a' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#6d28d9' },
  job_submitted: { label: 'Jobs proposés', bg: '#fef3c7', text: '#d97706' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#059669' },
  convention_signed: { label: 'Convention', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: 'Paiement ⏳', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé ✓', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: 'Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: 'Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa ✓', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: '🛫 Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: '🌴 En stage', bg: '#d1fae5', text: '#059669' },
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

  function fetchCase() {
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
  }

  useEffect(() => {
    fetchCase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const intern = caseData.interns ?? {}
  const firstName = intern.first_name ?? ''
  const lastName = intern.last_name ?? ''
  const isVisaOnly = caseData.case_type === 'visa_only'
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
              {getInitials(firstName, lastName)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold text-[#1a1918]">
                {firstName} {lastName}
              </h1>
              <Badge
                label={STATUS_LABELS[caseData.status as CaseStatus] ?? caseData.status}
                variant={statusToBadgeVariant(caseData.status as CaseStatus)}
              />
              {isVisaOnly && (
                <Badge label="Visa Only" variant="info" />
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {(caseData.actual_start_date || caseData.desired_start_date) && (
                <span className="text-sm text-zinc-500">
                  Arrivée : {new Date(caseData.actual_start_date ?? caseData.desired_start_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {caseData.actual_end_date && (
                <span className="text-sm text-zinc-500">
                  Retour : {new Date(caseData.actual_end_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {caseData.case_type && (
                <span className="text-sm text-zinc-400">{caseData.case_type}</span>
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
            status={caseData.status as CaseStatus}
            activityFeed={(caseData as any).activity_feed ?? []}
            isVisaOnly={isVisaOnly}
            checklist={{
              billet_avion: (caseData as any).billet_avion ?? null,
              papiers_visas: (caseData as any).papiers_visas ?? null,
              visa_recu: (caseData as any).visa_recu ?? null,
              convention_signee_check: (caseData as any).convention_signee_check ?? null,
              chauffeur_reserve: (caseData as any).chauffeur_reserve ?? null,
            }}
            internEmail={(caseData as any).interns?.email ?? null}
            paymentAmount={(caseData as any).payment_amount ?? null}
            caseData={caseData as Record<string, unknown>}
            onRefresh={fetchCase}
          />
        )}
        {activeTab === 'profil' && (
          <TabProfil
            intern={(caseData as any).interns ?? null}
            internId={(caseData as any).interns?.id ?? null}
            schoolName={(caseData as any).schools?.name ?? null}
            desiredStartDate={(caseData as any).desired_start_date ?? null}
            desiredEndDate={(caseData as any).actual_end_date ?? (caseData as any).interns?.desired_end_date ?? null}
            desiredDurationMonths={(caseData as any).desired_duration_months ?? null}
            arrivalDate={(caseData as any).actual_start_date ?? (caseData as any).desired_start_date ?? null}
          />
        )}
        {activeTab === 'jobs' && (
          <TabJobs
            caseId={caseData.id}
            firstName={firstName}
            lastName={lastName}
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
            flight_departure_city: caseData.flight_departure_city,
            dropoff_address: caseData.dropoff_address,
            last_stopover_city: caseData.last_stopover_city,
            intern_bali_phone: caseData.intern_bali_phone,
            first_name: firstName,
            last_name: lastName,
            arrival_date: caseData.actual_start_date ?? caseData.desired_start_date,
            actual_start_date: caseData.actual_start_date,
            actual_end_date: caseData.actual_end_date,
            driver_booked: caseData.driver_booked ?? caseData.chauffeur_reserve,
            welcome_kit_sent_at: caseData.welcome_kit_sent_at,
            whatsapp_ambassador_bali_msg: caseData.whatsapp_ambassador_bali_msg,
            whatsapp_ambassador_done_msg: caseData.whatsapp_ambassador_done_msg,
            interns: caseData.interns ? {
              phone: caseData.interns.phone,
              return_plane_ticket_url: caseData.interns.return_plane_ticket_url,
            } : null,
          }} />
        )}
        {activeTab === 'facturation' && (
          <TabFacturation caseId={caseData.id} caseData={{ id: caseData.id, status: caseData.status, payment_amount: caseData.payment_amount, discount_percentage: caseData.discount_percentage, invoice_number: caseData.invoice_number, payment_type: caseData.payment_type, payment_date: caseData.payment_date, convention_signee_check: caseData.convention_signee_check, packages: caseData.packages as any, interns: caseData.interns ? { first_name: caseData.interns.first_name ?? '', last_name: caseData.interns.last_name ?? '' } : null } as any} />
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
                arrival_date: caseData.actual_start_date ?? caseData.desired_start_date,
                return_date: caseData.actual_end_date,
                destination: caseData.destinations?.name ?? null,
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
