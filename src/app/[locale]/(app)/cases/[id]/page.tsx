'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { EditInternModal } from '@/components/cases/EditInternModal'
import Link from 'next/link'
import { TabProfil } from '@/components/cases/tabs/TabProfil'
import { TabStaffing } from '@/components/cases/tabs/TabStaffing'
import { TabHistorique } from '@/components/cases/tabs/TabHistorique'
import { InternCardDigital } from '@/components/cases/InternCardDigital'
import type { CaseStatus } from '@/lib/types'
import { ProcessTimeline } from '@/components/cases/ProcessTimeline'

const CANDIDATE_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed']

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
  lead: { text: 'Booker un RDV de qualification', cta: 'Booker RDV', action: 'profil' },
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

function getLinkedinSlug(url: string): string | null {
  if (!url) return null
  if (!url.includes('linkedin.com')) return url.trim()
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1] : null
}

type TabKey = 'profil' | 'staffing' | 'historique'

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
  const [activeTab, setActiveTab] = useState<TabKey>('profil')
  const [headerCompact, setHeaderCompact] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [jobSubmissionsCount, setJobSubmissionsCount] = useState(0)

  // Header compact au scroll
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => setHeaderCompact(el.scrollTop > 60)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

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
      .then((data) => { setCaseData(data); setLoading(false); fetch(`/api/cases/${data.id}/job-submissions`).then(r2 => r2.ok ? r2.json() : []).then((subs) => setJobSubmissionsCount(Array.isArray(subs) ? subs.length : 0)).catch(() => null) })
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
  const linkedinUrl = intern.linkedin_url ?? ''
  const birthDate = intern.birth_date ?? ''
  const phone = intern.phone ?? ''
  const schoolCountry = intern.school_country ?? ''
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const linkedinSlug = getLinkedinSlug(linkedinUrl)
  const avatarUrl = intern.avatar_url ?? (linkedinSlug ? `https://unavatar.io/linkedin/${linkedinSlug}` : null)
  const schoolName = caseData.schools?.name ?? intern.school_name ?? ''
  const mainJob = intern.main_desired_job ?? ''
  const touchpoint = intern.touchpoint ?? ''
  const departDate = caseData.actual_start_date ?? intern?.desired_start_date
  const dateDepart = departDate ? new Date(departDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const durationMonths = intern?.desired_duration_months ?? ''
  const isVisaOnly = caseData.case_type === 'visa_only'
  const isClient = !CANDIDATE_STATUSES.includes(caseData.status)

  const badge = STATUS_BADGE[caseData.status] ?? { label: caseData.status, bg: '#f4f4f5', text: '#71717a' }
  const baseAction = NEXT_ACTIONS[caseData.status]
  const actionInfo = (() => {
    if (!baseAction) return null
    if (caseData.status === 'qualification_done' && jobSubmissionsCount > 0) {
      return { ...baseAction, text: jobSubmissionsCount + ' job' + (jobSubmissionsCount > 1 ? 's' : '') + ' sélectionné' + (jobSubmissionsCount > 1 ? 's' : '') + ' — Envoyer aux employeurs', cta: '💼 Aller au Staffing', action: 'staffing' }
    }
    if (caseData.status === 'rdv_booked' && jobSubmissionsCount > 0) {
      return { ...baseAction, text: jobSubmissionsCount + ' job' + (jobSubmissionsCount > 1 ? 's' : '') + ' sélectionné' + (jobSubmissionsCount > 1 ? 's' : '') + ' — Envoyer aux employeurs', cta: '💼 Aller au Staffing', action: 'staffing' }
    }
    return baseAction
  })()

  const handleCtaClick = () => {
    if (!actionInfo?.action) return
    switch (actionInfo.action) {
      case 'profil':
        setActiveTab('profil')
        break
      case 'meet':
        if (caseData.google_meet_link) {
          window.open(caseData.google_meet_link, '_blank')
        } else {
          setActiveTab('profil')
        }
        break
      case 'jobs':
      case 'staffing':
        setActiveTab('staffing')
        break
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profil', label: '👤 Profil' },
    ...(!isClient && !isVisaOnly ? [{ key: 'staffing' as TabKey, label: '💼 Staffing' }] : []),
    { key: 'historique' as TabKey, label: '📋 Historique' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#fafaf9]">
      {/* ── HEADER STICKY ── */}
      <div className={`sticky top-0 z-20 bg-white border-b border-zinc-200 transition-all duration-200 ${headerCompact ? 'shadow-md' : ''}`}>
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
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Modifier
              </button>
            </div>
          </div>

          {/* LIGNE PRINCIPALE: 2 colonnes sur md+, stack sur mobile */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 pb-3">
            {/* Colonne gauche: avatar + infos */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Avatar */}
              <div className="relative w-12 h-12 flex-shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={`${firstName} ${lastName}`}
                    className="w-12 h-12 rounded-full object-cover absolute inset-0 border-2 border-zinc-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                  />
                ) : null}
                <div className={`w-12 h-12 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-lg font-bold text-[#c8a96e] ${avatarUrl ? 'hidden' : ''}`}>
                  {getInitials(firstName, lastName)}
                </div>
              </div>
              {/* Infos candidat */}
              <div>
                <h1 className="text-base font-bold text-[#1a1918] leading-tight">
                  {firstName} {lastName}
                  {age ? <span className="text-sm font-normal text-zinc-400 ml-1">({age} ans)</span> : null}
                </h1>
                <p className="text-xs text-zinc-500">{email}</p>
                {/* Boutons Gmail + WA + LinkedIn */}
                <div className="flex items-center gap-2 mt-1">
                  <a href={`mailto:${email}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-medium transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                    Email
                  </a>
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#25d366] text-white rounded-lg text-xs font-bold hover:bg-[#20bd5a] transition-colors">
                      WA
                    </a>
                  )}
                  {linkedinUrl && (
                    <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne droite: timeline (masquée en mode compact) */}
            <div className={`flex-1 transition-all duration-200 ${headerCompact ? 'hidden' : 'block'}`}>
              <ProcessTimeline
                caseId={caseData.id}
                currentStatus={caseData.status as CaseStatus}
                onStatusChange={(newStatus: CaseStatus) => {
                  setCaseData((prev: Record<string,unknown> | null) => prev ? { ...prev, status: newStatus } : prev)
                }}
                isVisaOnly={isVisaOnly}
              />
              {/* Badge statut actuel + infos clés */}
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: badge.bg, color: badge.text }}>
                  {badge.label}
                </span>
                {schoolName && (
                  <span className="text-xs text-zinc-500">🎓 {schoolName}</span>
                )}
                {dateDepart && (
                  <span className="text-xs text-zinc-400">📅 {dateDepart}</span>
                )}
                {durationMonths && (
                  <span className="text-xs text-zinc-400">⏱ {durationMonths} mois</span>
                )}
              </div>
            </div>
          </div>

          {/* ── BANDEAU UNIQUE: RDV + Prochaine étape ── */}
          {(actionInfo || caseData.intern_first_meeting_date || caseData.google_meet_link) && (
            <div className={`mb-3 px-4 py-3 border rounded-xl flex flex-wrap items-center justify-between gap-2 transition-all duration-200 ${
              headerCompact ? 'max-h-0 opacity-0 overflow-hidden py-0 px-0 border-0' : 'max-h-32 opacity-100'
            } ${caseData.intern_first_meeting_date ? 'bg-blue-50 border-blue-200' : 'bg-[#0d9e75]/10 border-[#0d9e75]/20'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-zinc-400">Prochaine étape</p>
                {caseData.intern_first_meeting_date ? (
                  <>
                    <p className="text-sm font-bold text-[#1a1918]">
                      📅 Entretien : {new Date(caseData.intern_first_meeting_date).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })} à {new Date(caseData.intern_first_meeting_date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' })} WITA
                      {(() => { const d = Math.ceil((new Date(caseData.intern_first_meeting_date).getTime() - Date.now()) / 86400000); return d >= 0 ? <span className="ml-2 text-xs text-blue-600 font-semibold">{d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : `dans ${d}j`}</span> : null })()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">Mener l&apos;entretien et qualifier le candidat dans l&apos;onglet Staffing</p>
                  </>
                ) : actionInfo ? (
                  <p className="text-sm font-medium text-[#1a1918]">{actionInfo.text}</p>
                ) : null}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {caseData.google_meet_link && (
                  <a href={caseData.google_meet_link} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-bold rounded-lg hover:bg-[#1557b0]">
                    Meet →
                  </a>
                )}
                {actionInfo?.cta && !caseData.intern_first_meeting_date && (
                  <button onClick={handleCtaClick}
                    className="px-3 py-1.5 bg-[#0d9e75] text-white text-xs font-bold rounded-lg hover:bg-emerald-600">
                    {actionInfo.cta} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bannière redirection client — avant les onglets */}
          {isClient && !headerCompact && (
            <div className="mb-2 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold text-sm">Ce candidat est maintenant un client</span>
                <span className="text-amber-500 text-xs">({badge.label})</span>
              </div>
              <Link href={`/${locale}/clients/${caseData.id}`}
                className="px-4 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">
                Voir la fiche client →
              </Link>
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
      <div ref={scrollContainerRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 overflow-y-auto w-full pb-20 md:pb-6">
        {/* TabProcess supprimé - changement de statut dans la timeline */}
        {activeTab === 'profil' && (
          <TabProfil
            intern={(caseData as any).interns ?? null}
            internId={(caseData as any).interns?.id ?? null}
            caseId={caseData.id}
            schoolName={schoolName}
            schoolId={caseData.school_id ?? null}
            desiredStartDate={(caseData as any).desired_start_date ?? null}
            desiredEndDate={(caseData as any).actual_end_date ?? (caseData as any).interns?.desired_end_date ?? null}
            desiredDurationMonths={(caseData as any).desired_duration_months ?? null}
            arrivalDate={(caseData as any).actual_start_date ?? (caseData as any).desired_start_date ?? null}
            qualificationNotes={(caseData as any).qualification_notes ?? null}
            desiredSectors={(caseData as any).desired_sectors ?? null}
            cvFeedback={(caseData as any).cv_feedback ?? null}
          />
        )}
        {activeTab === 'staffing' && (
          <TabStaffing
            caseId={caseData.id}
            firstName={firstName}
            lastName={lastName}
            intern={intern as any}
            caseData={caseData as any}
            desiredStartDate={intern?.desired_start_date ?? null}
            desiredEndDate={intern.desired_end_date ?? caseData.end_date ?? caseData.actual_end_date ?? null}
            desiredDurationMonths={intern?.desired_duration_months ?? null}
            cvUrl={intern.cv_url ?? null}
            cvLocalUrl={(intern as Record<string,unknown>).local_cv_url as string ?? caseData.local_cv_url ?? null}
            cvFeedback={caseData.cv_feedback ?? null}
            cvStatus={caseData.cv_status ?? 'pending'}
            desiredSectors={intern.desired_jobs ?? intern.desired_sectors ?? caseData.desired_sectors ?? null}
            qualificationNotes={caseData.qualification_notes ?? null}
            stageIdeal={intern.stage_ideal ?? null}
            spokenLanguages={intern.spoken_languages ?? null}
            onRefresh={fetchCase}
          />
        )}
        {activeTab === 'historique' && (
          <TabHistorique caseId={caseData.id} />
        )}
      </div>

      {showEditModal && intern && (
        <EditInternModal
          caseId={caseData.id}
          internId={intern.id ?? ''}
          initialData={{
            first_name: intern.first_name,
            last_name: intern.last_name,
            email: intern.email,
            whatsapp: intern.whatsapp,
            school_name: intern.school_name,
            desired_start_date: intern.desired_start_date,
            desired_duration_months: intern.desired_duration_months,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); void fetchCase() }}
        />
      )}

      {showInternCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInternCard(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InternCardDigital
              caseData={{
                id: caseData.id,
                status: caseData.status,
                arrival_date: caseData.actual_start_date ?? intern?.desired_start_date,
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
