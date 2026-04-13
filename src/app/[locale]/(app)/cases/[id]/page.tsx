'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
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
  const schoolName = caseData.schools?.name ?? intern.school_country ?? ''
  const mainJob = intern.main_desired_job ?? ''
  const touchpoint = intern.touchpoint ?? ''
  const departDate = caseData.actual_start_date ?? caseData.desired_start_date
  const dateDepart = departDate ? new Date(departDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const durationMonths = caseData.desired_duration_months ?? ''
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

          {/* Header identité enrichi */}
          <div className="flex items-center gap-4 py-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={`${firstName} ${lastName}`}
                  className="w-14 h-14 rounded-full object-cover border-2 border-zinc-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                />
              ) : null}
              <div className={`w-14 h-14 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-lg font-bold text-[#c8a96e] flex-shrink-0 ${avatarUrl ? 'hidden' : ''}`}>
                {getInitials(firstName, lastName)}
              </div>
            </div>

            {/* Infos principales */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-[#1a1918] leading-tight">{firstName} {lastName}</h1>
                {age && <span className="text-xs text-zinc-400 font-medium">{age} ans</span>}
                {schoolCountry && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600">
                    🎓 {schoolCountry}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
                  title={email}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,12 2,6"/>
                  </svg>
                  <span className="hidden sm:inline">Email</span>
                </a>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#25d366] text-white rounded-xl text-xs font-bold hover:bg-[#20bd5a] transition-colors shadow-sm"
                    title={whatsapp}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                    <span className="text-[10px] opacity-80 hidden sm:inline">{whatsapp}</span>
                  </a>
                )}
                {phone && !whatsapp && (
                  <span className="text-xs text-zinc-400" title={phone}>📞 {phone}</span>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
                    title="LinkedIn">
                    🔗 LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Chronologie — ProcessTimeline compacte dans le header fixe */}
          <div className="py-2 border-t border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Chronologie</p>
            <ProcessTimeline
              caseId={caseData.id}
              currentStatus={caseData.status as import('@/lib/types').CaseStatus}
              onStatusChange={(newStatus: CaseStatus) => {
                setCaseData((prev: Record<string,unknown> | null) => prev ? { ...prev, status: newStatus } : prev)
              }}
              isVisaOnly={isVisaOnly}
            />
          </div>

          {/* RDV 1er entretien — masqué en mode compact */}
          {!headerCompact && (caseData.intern_first_meeting_date || caseData.google_calendar_event_id) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <span>📅</span>
              {caseData.intern_first_meeting_date ? (() => {
                const rdvDate = new Date(caseData.intern_first_meeting_date)
                const daysUntil = Math.ceil((rdvDate.getTime() - Date.now()) / (1000 * 3600 * 24))
                const daysLabel = daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? 'demain' : daysUntil > 0 ? `dans ${daysUntil} jours` : `il y a ${Math.abs(daysUntil)}j`
                return (
                  <span className="font-medium">
                    1er entretien : {rdvDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WITA
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-[10px] font-bold">{daysLabel}</span>
                  </span>
                )
              })() : (
                <span className="font-medium">1er entretien planifié (date à synchroniser)</span>
              )}
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

          {/* Chips infos clés — masquées en mode compact */}
          <div className={`flex flex-wrap gap-2 text-xs transition-all duration-200 ${headerCompact ? 'max-h-0 opacity-0 pb-0 overflow-hidden pointer-events-none' : 'max-h-24 opacity-100 pb-3'}`}>
{/* métier retiré du header */}
            {schoolName && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                🎓 {schoolName}
              </span>
            )}
            {dateDepart && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                📅 Départ souhaité : {new Date(dateDepart).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {durationMonths && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-700">
                ⏱ {durationMonths} mois
              </span>
            )}
{/* touchpoint retiré du header */}
          </div>

          {/* Next action card — masquée en mode compact */}
          {actionInfo && (
            <div className={`px-4 py-3 bg-[#0d9e75]/10 border border-[#0d9e75]/20 rounded-xl flex items-center justify-between transition-all duration-200 ${headerCompact ? 'max-h-0 opacity-0 mb-0 overflow-hidden py-0 px-0 border-0 pointer-events-none' : 'max-h-24 opacity-100 mb-3'}`}>
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
      <div ref={scrollContainerRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 overflow-y-auto w-full">
        {/* TabProcess supprimé - changement de statut dans la timeline */}
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
        {activeTab === 'staffing' && (
          <TabStaffing
            caseId={caseData.id}
            firstName={firstName}
            lastName={lastName}
            intern={intern as any}
            caseData={caseData as any}
            desiredStartDate={caseData.desired_start_date ?? null}
            desiredEndDate={intern.desired_end_date ?? caseData.end_date ?? caseData.actual_end_date ?? null}
            desiredDurationMonths={caseData.desired_duration_months ?? null}
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
