'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  not_interested: { label: 'Pas intéressé', bg: '#f4f4f5', text: '#71717a' },
  not_qualified: { label: 'Non qualifié', bg: '#fee2e2', text: '#dc2626' },
  on_hold: { label: 'En attente', bg: '#fef3c7', text: '#d97706' },
  suspended: { label: 'Suspendu', bg: '#fee2e2', text: '#dc2626' },
  visa_refused: { label: 'Visa refusé', bg: '#fee2e2', text: '#dc2626' },
  archived: { label: 'Archivé', bg: '#f4f4f5', text: '#71717a' },
  completed: { label: 'Terminé', bg: '#d1fae5', text: '#059669' },
}

const NEXT_ACTIONS: Record<string, { text: string; cta: string | null; action: string | null }> = {
  lead: { text: 'Booker un RDV de qualification', cta: 'Booker RDV', action: 'process' },
  rdv_booked: { text: 'Faire l\u2019entretien et qualifier', cta: 'Voir Meet', action: 'meet' },
  qualification_done: { text: 'Proposer des offres de stage', cta: 'Proposer job', action: 'jobs' },
  job_submitted: { text: 'Attendre la réponse candidat/employeur', cta: null, action: null },
  job_retained: { text: 'Envoyer la convention de stage', cta: null, action: null },
  convention_signed: { text: 'Demander le paiement', cta: null, action: null },
  payment_pending: { text: 'Confirmer la réception du paiement', cta: 'Marquer payé', action: 'mark_paid' },
  payment_received: { text: 'Préparer les documents visa', cta: null, action: null },
  visa_docs_sent: { text: 'Envoyer le dossier à l\u2019agent FAZZA', cta: 'Envoyer FAZZA', action: 'visa' },
  visa_submitted: { text: 'Attendre la réception du visa', cta: null, action: null },
  visa_in_progress: { text: 'Attendre la réception du visa', cta: null, action: null },
  visa_received: { text: 'Préparer l\u2019arrivée', cta: null, action: null },
  arrival_prep: { text: 'Confirmer chauffeur et hébergement', cta: 'Voir logistique', action: 'arrivee' },
  active: { text: 'Suivre le stage et préparer le départ', cta: null, action: null },
  alumni: { text: 'Envoyer le formulaire ambassadeur', cta: null, action: null },
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#fafaf9]">
        <div className="px-5 py-3 bg-white border-b border-[#e4e4e7] animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-zinc-200 rounded" />
              <div className="h-3 w-56 bg-zinc-100 rounded" />
            </div>
          </div>
        </div>
        <div className="h-10 bg-white border-b border-[#e4e4e7] animate-pulse" />
        <div className="flex-1 p-5 space-y-3 animate-pulse">
          <div className="h-24 bg-zinc-100 rounded-lg" />
          <div className="h-24 bg-zinc-100 rounded-lg" />
        </div>
      </div>
    )
  }

  // Error / not found
  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#fafaf9] gap-4 p-6">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
          {error ?? 'Dossier introuvable'}
        </div>
        <button
          onClick={() => router.push(`/${locale}/pipeline`)}
          className="px-4 py-2 text-sm font-medium bg-white border border-[#e4e4e7] hover:bg-zinc-50 text-[#1a1918] rounded-lg transition-colors"
        >
          ← Retour au pipeline
        </button>
      </div>
    )
  }

  const intern = caseData.interns ?? {}
  const firstName = intern.first_name ?? ''
  const lastName = intern.last_name ?? ''
  const schoolName = (caseData as any).schools?.name ?? ''
  const poste = (caseData as any).job_title ?? (caseData as any).desired_sectors?.[0] ?? ''
  const departDate = caseData.actual_start_date ?? caseData.desired_start_date
  const dateDepart = departDate ? new Date(departDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
  const isVisaOnly = caseData.case_type === 'visa_only'

  const badge = STATUS_BADGE[caseData.status] ?? { label: caseData.status, bg: '#f4f4f5', text: '#71717a' }
  const actionInfo = NEXT_ACTIONS[caseData.status]

  // Urgency: payment_pending or arrival_prep with arrival < 7 days
  const isUrgent = (() => {
    if (caseData.status === 'payment_pending') return true
    if (caseData.status === 'arrival_prep' && departDate) {
      const daysUntil = Math.floor((new Date(departDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntil < 7
    }
    return false
  })()

  const handleCtaClick = () => {
    if (!actionInfo?.action) return
    switch (actionInfo.action) {
      case 'process':
        setActiveTab('process')
        break
      case 'meet':
        if ((caseData as any).google_meet_link) {
          window.open((caseData as any).google_meet_link, '_blank')
        } else {
          setActiveTab('process')
        }
        break
      case 'jobs':
        setActiveTab('jobs')
        break
      case 'mark_paid':
        fetch(`/api/cases/${caseData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'payment_received' }),
        }).then(() => fetchCase())
        break
      case 'visa':
        setActiveTab('visa')
        break
      case 'arrivee':
        setActiveTab('arrivee')
        break
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'process', label: 'Process' },
    { key: 'profil', label: 'Profil' },
    ...(!isVisaOnly ? [{ key: 'jobs' as TabKey, label: 'Jobs' }] : []),
    { key: 'visa', label: 'Visa' },
    ...(!isVisaOnly ? [{ key: 'arrivee' as TabKey, label: 'Arrivée' }] : []),
    { key: 'facturation', label: 'Facturation' },
  ]

  const subtitleParts = [schoolName, poste, dateDepart].filter(Boolean)

  return (
    <div className="flex flex-col h-full bg-[#fafaf9]">
      {/* ROW 1 — Header compact 56px */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#e4e4e7]">
        {/* Back */}
        <button
          onClick={() => router.push(`/${locale}/pipeline`)}
          className="text-zinc-400 hover:text-zinc-600 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{getInitials(firstName, lastName)}</span>
        </div>

        {/* Name + info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-[#1a1918] truncate">{firstName} {lastName}</h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
            {isVisaOnly && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 bg-blue-50 text-blue-700">
                Visa Only
              </span>
            )}
          </div>
          {subtitleParts.length > 0 && (
            <p className="text-xs text-[#71717a] truncate">{subtitleParts.join(' · ')}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {caseData.portal_token && (
            <a
              href={`/portal/${caseData.portal_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#e4e4e7] text-[#71717a] hover:bg-zinc-50"
            >
              Portail
            </a>
          )}
          {caseData.status === 'active' && (
            <button
              onClick={() => setShowInternCard(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#c8a96e] text-white hover:opacity-90"
            >
              Carte
            </button>
          )}
        </div>
      </div>

      {/* ROW 2 — Action banner (conditional) */}
      {actionInfo?.cta && (
        <div
          className="flex items-center justify-between px-5 py-2 border-b text-xs"
          style={{
            backgroundColor: isUrgent ? '#fef2f2' : '#fffbeb',
            borderColor: isUrgent ? '#fecaca' : '#fde68a',
          }}
        >
          <span className="text-[#1a1918]">
            <span className="font-semibold">{isUrgent ? '🔴' : '⚡'}</span>{' '}
            {actionInfo.text}
          </span>
          <button
            onClick={handleCtaClick}
            className="ml-3 text-xs font-semibold text-[#c8a96e] hover:underline flex-shrink-0"
          >
            {actionInfo.cta} →
          </button>
        </div>
      )}

      {/* ROW 3 — Tabs */}
      <div className="flex border-b border-[#e4e4e7] bg-white px-5 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-[#c8a96e] text-[#c8a96e]'
                : 'border-transparent text-[#71717a] hover:text-[#1a1918]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ROW 4 — Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
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
            caseId={caseData.id}
            schoolName={schoolName}
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
