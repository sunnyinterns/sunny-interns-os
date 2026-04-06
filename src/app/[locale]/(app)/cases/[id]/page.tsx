'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
  assigned_to?: string | null
  flight_number?: string | null
  flight_arrival_datetime?: string | null
  dropoff_address?: string | null
  last_stopover_city?: string | null
  intern_bali_phone?: string | null
  internship_type?: string | null
  visa_submitted_at?: string | null
  visa_submitted_to_agent_at?: string | null
  visa_received_at?: string | null
  payment_amount?: number | null
  payment_date?: string | null
  invoice_sent_at?: string | null
  iban?: string | null
  legal_entity?: string | null
  fillout_bill_form_url?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  // Checklist booleans
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  logement_scooter_formulaire?: boolean | null
  logement_reserve?: boolean | null
  scooter_reserve_check?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
  interns?: {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    nationality?: string
    birth_date?: string
    passport_number?: string
    passport_expiry?: string
    avatar_url?: string
    intern_level?: string
    diploma_track?: string
    school?: string
    school_contact_name?: string
    school_contact_email?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    main_desired_job?: string
    spoken_languages?: string[]
    linkedin_url?: string
    qualification_debrief?: string
    intern_address?: string
    intern_signing_city?: string
    housing_budget?: string
    wants_scooter?: boolean
    touchpoint?: string
    private_comment_for_employer?: string
  } | null
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
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('process')
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
      <div className="p-6">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          {error ?? 'Dossier introuvable'}
        </div>
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
          />
        )}
        {activeTab === 'profil' && (
          <TabProfil
            intern={caseData.interns ?? null}
            arrivalDate={caseData.arrival_date}
            internId={caseData.interns?.id}
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
          <TabVisa caseData={caseData} />
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
            interns: caseData.interns,
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
