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
  visa_received_at?: string | null
  payment_amount?: number | null
  payment_date?: string | null
  invoice_sent_at?: string | null
  iban?: string | null
  legal_entity?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
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
  } | null
  jobs?: Array<{
    id: string
    title?: string
    company_id?: string
    status?: string
    companies?: { id: string; name: string } | null
  }>
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

  const isVisaOnly = caseData.metadata?.visa_only === true
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
          />
        )}
        {activeTab === 'profil' && (
          <TabProfil
            intern={caseData.interns ?? null}
            arrivalDate={caseData.arrival_date}
          />
        )}
        {activeTab === 'jobs' && (
          <TabJobs jobs={caseData.jobs ?? []} />
        )}
        {activeTab === 'visa' && (
          <TabVisa caseData={caseData} />
        )}
        {activeTab === 'arrivee' && (
          <TabArrivee caseData={{
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
          <TabFacturation caseData={caseData} />
        )}
      </div>

      {showEditModal && (
        <NewCaseModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
