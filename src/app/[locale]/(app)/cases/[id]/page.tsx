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
  rdv_booked: { label: 'RDV Booke', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#6d28d9' },
  job_submitted: { label: 'Jobs proposes', bg: '#fef3c7', text: '#d97706' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#059669' },
  convention_signed: { label: 'Convention', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: 'Paiement en attente', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Paye', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: 'Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: 'Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa OK', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: 'Depart imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: 'En stage', bg: '#d1fae5', text: '#059669' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
  not_interested: { label: 'Pas interesse', bg: '#f4f4f5', text: '#71717a' },
  not_qualified: { label: 'Non qualifie', bg: '#fee2e2', text: '#dc2626' },
  on_hold: { label: 'En attente', bg: '#fef3c7', text: '#d97706' },
  suspended: { label: 'Suspendu', bg: '#fee2e2', text: '#dc2626' },
  visa_refused: { label: 'Visa refuse', bg: '#fee2e2', text: '#dc2626' },
  archived: { label: 'Archive', bg: '#f4f4f5', text: '#71717a' },
  completed: { label: 'Termine', bg: '#d1fae5', text: '#059669' },
}

const NEXT_ACTIONS: Record<string, { text: string; cta: string | null; action: string | null }> = {
  lead: { text: 'Booker un RDV de qualification', cta: 'Booker RDV', action: 'process' },
  rdv_booked: { text: "Faire l'entretien et qualifier", cta: 'Voir Meet', action: 'meet' },
  qualification_done: { text: 'Proposer des offres de stage', cta: 'Proposer job', action: 'jobs' },
  job_submitted: { text: 'Attendre la reponse candidat/employeur', cta: null, action: null },
  job_retained: { text: 'Envoyer la convention de stage', cta: null, action: null },
  convention_signed: { text: 'Demander le paiement', cta: null, action: null },
  payment_pending: { text: 'Confirmer la reception du paiement', cta: 'Marquer paye', action: 'mark_paid' },
  payment_received: { text: 'Preparer les documents visa', cta: null, action: null },
  visa_docs_sent: { text: "Envoyer le dossier a l'agent FAZZA", cta: 'Envoyer FAZZA', action: 'visa' },
  visa_submitted: { text: 'Attendre la reception du visa', cta: null, action: null },
  visa_in_progress: { text: 'Attendre la reception du visa', cta: null, action: null },
  visa_received: { text: "Preparer l'arrivee", cta: null, action: null },
  arrival_prep: { text: 'Confirmer chauffeur et hebergement', cta: 'Voir logistique', action: 'arrivee' },
  active: { text: 'Suivre le stage et preparer le depart', cta: null, action: null },
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
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl ?? 'profil')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInternCard, setShowInternCard] = useState(false)
  const [sendingRecap, setSendingRecap] = useState(false)
  const [recapSent, setRecapSent] = useState(false)

  async function sendRecapEmail() {
    if (!id) return
    setSendingRecap(true)
    try {
      const r = await fetch(`/api/cases/${id}/send-recap-email`, { method: 'POST' })
      if (r.ok) {
        setRecapSent(true)
        setTimeout(() => setRecapSent(false), 3000)
        fetchCase()
      }
    } finally {
      setSendingRecap(false)
    }
  }

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
        <div className="px-6 py-4 bg-white border-b border-zinc-200 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-zinc-200 rounded" />
              <div className="h-3 w-64 bg-zinc-100 rounded" />
            </div>
          </div>
        </div>
        <div className="h-11 bg-white border-b border-zinc-200 animate-pulse" />
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className="h-24 bg-zinc-100 rounded-xl" />
          <div className="h-24 bg-zinc-100 rounded-xl" />
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
          className="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 hover:bg-zinc-50 text-[#1a1918] rounded-lg transition-colors"
        >
          &larr; Retour au pipeline
        </button>
      </div>
    )
  }

  const intern = caseData.interns ?? {}
  const firstName = intern.first_name ?? ''
  const lastName = intern.last_name ?? ''
  const email = intern.email ?? ''
  const whatsapp = intern.whatsapp ?? ''
  const schoolName = caseData.schools?.name ?? intern.school_country ?? ''
  const mainJob = intern.main_desired_job ?? ''
  const touchpoint = intern.touchpoint ?? ''
  const departDate = caseData.actual_start_date ?? caseData.desired_start_date
  const dateDepart = departDate ? new Date(departDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const durationMonths = caseData.desired_duration_months ?? ''
  const isVisaOnly = caseData.case_type === 'visa_only'

  const badge = STATUS_BADGE[caseData.status] ?? { label: caseData.status, bg: '#f4f4f5', text: '#71717a' }
  const actionInfo = NEXT_ACTIONS[caseData.status]

  const handleCtaClick = () => {
    if (!actionInfo?.action) return
    switch (actionInfo.action) {
      case 'process':
        setActiveTab('process')
        break
      case 'meet':
        if (caseData.google_meet_link) {
          window.open(caseData.google_meet_link, '_blank')
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
    { key: 'process', label: '⚡ Processus' },
    { key: 'profil', label: '👤 Profil' },
    ...(!isVisaOnly ? [{ key: 'jobs' as TabKey, label: '💼 Jobs' }] : []),
    { key: 'visa', label: '🛂 Visa' },
    ...(!isVisaOnly ? [{ key: 'arrivee' as TabKey, label: '🛫 Arrivée' }] : []),
    { key: 'facturation', label: '💶 Facturation' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#fafaf9]">
      {/* ── HEADER STICKY ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Ligne nav */}
          <div className="flex items-center justify-between py-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Retour
            </button>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
              {isVisaOnly && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  Visa Only
                </span>
              )}
              {caseData.portal_token && (
                <a
                  href={`/portal/${caseData.portal_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Portail candidat
                </a>
              )}
              {caseData.status === 'rdv_booked' && (
                <button
                  onClick={() => { void sendRecapEmail() }}
                  disabled={sendingRecap}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#0d9e75] text-white font-semibold hover:bg-[#0a8a65] transition-colors disabled:opacity-60"
                >
                  {sendingRecap ? 'Envoi…' : recapSent ? '✓ Envoyé' : '📧 Récap entretien'}
                </button>
              )}
              {caseData.status === 'active' && (
                <button
                  onClick={() => setShowInternCard(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#c8a96e] text-white hover:opacity-90 transition-opacity"
                >
                  Carte stagiaire
                </button>
              )}
              {(caseData.status === 'payment_pending' || caseData.status === 'convention_signed') && (
                <button
                  onClick={() => setActiveTab('facturation')}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  💶 Facturation
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Modifier
              </button>
            </div>
          </div>

          {/* Identité */}
          <div className="flex items-center gap-4 pb-4">
            <div className="w-11 h-11 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-base font-bold text-[#c8a96e] flex-shrink-0">
              {getInitials(firstName, lastName)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1a1918] leading-tight">
                {firstName} {lastName}
              </h1>
              <p className="text-sm text-zinc-500">
                {email}
                {whatsapp && <span className="ml-2">· {whatsapp}</span>}
              </p>
            </div>
          </div>

          {/* RDV 1er entretien */}
          {caseData.intern_first_meeting_date && (
            <div className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <span>📅</span>
              <span className="font-medium">
                1er entretien : {new Date(caseData.intern_first_meeting_date).toLocaleDateString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short'
                })} à {new Date(caseData.intern_first_meeting_date).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
                })} WITA
              </span>
              {caseData.google_meet_link && (
                <a href={caseData.google_meet_link} target="_blank" rel="noopener noreferrer"
                  className="ml-1 px-2 py-0.5 bg-[#1a73e8] text-white rounded text-[10px] font-semibold hover:bg-[#1557b0]">
                  Meet
                </a>
              )}
              {caseData.google_meet_cancel_link && (
                <a href={caseData.google_meet_cancel_link} target="_blank" rel="noopener noreferrer"
                  className="ml-1 text-[10px] text-blue-400 hover:underline">
                  Annuler/Reprog
                </a>
              )}
            </div>
          )}

          {/* Chips infos clés */}
          <div className="flex flex-wrap gap-2 pb-3 text-xs">
            {mainJob && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                💼 {mainJob}
              </span>
            )}
            {schoolName && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                🎓 {schoolName}
              </span>
            )}
            {dateDepart && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                📅 Départ: {dateDepart}
              </span>
            )}
            {durationMonths && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                ⏱ {durationMonths} mois
              </span>
            )}
            {touchpoint && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                🔗 {touchpoint}
              </span>
            )}
          </div>

          {/* Next action card */}
          {actionInfo && (
            <div className="mb-3 px-4 py-3 bg-[#0d9e75]/10 border border-[#0d9e75]/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0d9e75] uppercase tracking-wide mb-0.5">Prochaine étape</p>
                <p className="text-sm font-medium text-[#1a1918]">{actionInfo.text}</p>
              </div>
              {actionInfo.cta && (
                <button
                  onClick={handleCtaClick}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#0d9e75] text-white text-xs font-semibold rounded-lg hover:bg-[#0a8a65] transition-colors"
                >
                  {actionInfo.cta}
                </button>
              )}
            </div>
          )}

          {/* Onglets */}
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#c8a96e] text-[#c8a96e]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 overflow-y-auto w-full">
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
            onTabChange={(tab: string) => setActiveTab(tab as TabKey)}
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
            qualificationNotes={(caseData as any).qualification_notes ?? null}
            desiredSectors={(caseData as any).desired_sectors ?? null}
            cvFeedback={(caseData as any).cv_feedback ?? null}
          />
        )}
        {activeTab === 'jobs' && (
          <TabJobs
            caseId={caseData.id}
            firstName={firstName}
            lastName={lastName}
            desiredSectors={(caseData as any).desired_sectors ?? null}
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
            desired_start_date: caseData.desired_start_date ?? null,
          }} />
        )}
        {activeTab === 'arrivee' && (
          <TabArrivee caseData={{
            id: caseData.id,
            flight_number: caseData.flight_number,
            flight_departure_city: caseData.flight_departure_city,
            flight_arrival_time_local: caseData.flight_arrival_time_local,
            actual_start_date: caseData.actual_start_date,
            actual_end_date: caseData.actual_end_date,
            driver_booked: caseData.driver_booked ?? caseData.chauffeur_reserve,
            welcome_kit_sent_at: caseData.welcome_kit_sent_at,
            whatsapp_ambassador_bali_msg: caseData.whatsapp_ambassador_bali_msg,
            whatsapp_ambassador_done_msg: caseData.whatsapp_ambassador_done_msg,
            interns: caseData.interns ? {
              first_name: caseData.interns.first_name,
              last_name: caseData.interns.last_name,
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
