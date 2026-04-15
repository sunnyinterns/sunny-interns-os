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
import { ChauffeurCard } from '@/components/cases/ChauffeurCard'

const CANDIDATE_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed']

const STATUTS_TIMELINE = [
  { key: 'lead', icon: '🌱', label: 'Lead' },
  { key: 'rdv_booked', icon: '📅', label: 'RDV' },
  { key: 'qualification_done', icon: '✅', label: 'Qualifié' },
  { key: 'job_submitted', icon: '💼', label: 'Jobs envoyés' },
  { key: 'job_retained', icon: '🤝', label: 'Job retenu' },
]

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
  lead: { text: 'Booker un entretien de qualification avec le candidat', cta: '📅 Booker RDV', action: 'profil' },
  rdv_booked: { text: "Mener l'entretien et qualifier dans l'onglet Staffing", cta: '💼 Aller au Staffing', action: 'staffing' },
  qualification_done: { text: 'Proposer des offres de stage adaptées au profil', cta: '💼 Staffing', action: 'staffing' },
  job_submitted: { text: 'En attente de retour des employeurs (~5-7 jours)', cta: null, action: null },
  job_retained: { text: 'Félicitations ! Envoyer la convention de stage au candidat', cta: '📝 Staffing', action: 'staffing' },
  convention_signed: { text: 'Ce candidat est maintenant un client', cta: '→ Fiche Client', action: 'client' },
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
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showInternCard, setShowInternCard] = useState(false)
  const [showChauffeurCard, setShowChauffeurCard] = useState(false)

  async function changeStatus(newStatus: string) {
    if (!id) return
    try {
      const r = await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (r.ok) {
        setCaseData((prev: CaseDetail | null) => prev ? { ...prev, status: newStatus } : prev)
      }
    } catch {
      // ignore
    }
  }
  const [sendingRecap, setSendingRecap] = useState(false)
  const [recapSent, setRecapSent] = useState(false)
  const [sendingPortal, setSendingPortal] = useState(false)
  const [portalSent, setPortalSent] = useState(false)
  const [openingDriverWA, setOpeningDriverWA] = useState(false)
  const [sendingQualif, setSendingQualif] = useState(false)
  const [qualifSent, setQualifSent] = useState(false)
  const [sendingVisaAgent, setSendingVisaAgent] = useState(false)
  const [visaAgentSent, setVisaAgentSent] = useState(false)

  async function sendPortal() {
    if (!id) return
    setSendingPortal(true)
    try {
      const r = await fetch(`/api/cases/${id}/send-portal`, { method: 'POST' })
      if (r.ok) {
        setPortalSent(true)
        setTimeout(() => setPortalSent(false), 4000)
        fetchCase()
      }
    } finally {
      setSendingPortal(false)
    }
  }

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

  async function sendQualificationEmail() {
    if (!id) return
    setSendingQualif(true)
    try {
      const r = await fetch(`/api/cases/${id}/send-qualification-email`, { method: 'POST' })
      if (r.ok) {
        setQualifSent(true)
        setTimeout(() => setQualifSent(false), 3000)
      }
    } finally {
      setSendingQualif(false)
    }
  }

  function visaDocsMissing(): string[] {
    if (!caseData) return []
    const missing: string[] = []
    if (!caseData.interns?.photo_id_url) missing.push('📸 Photo ID fond blanc')
    if (!caseData.interns?.passport_page4_url) missing.push('🛂 Passeport page 4')
    if (!caseData.interns?.bank_statement_url) missing.push('🏦 Relevé bancaire')
    if (!caseData.flight_number) missing.push('✈️ Numéro de vol')
    if (!caseData.flight_arrival_time_local) missing.push('⏰ Heure d\'arrivée')
    if (!caseData.actual_start_date) missing.push('📅 Date de début de stage')
    if (!caseData.actual_end_date) missing.push('📅 Date de fin de stage')
    return missing
  }

  async function sendVisaToAgent() {
    if (!id) return
    const missing = visaDocsMissing()
    if (missing.length > 0) {
      const ok = window.confirm(`Documents manquants:\n${missing.join('\n')}\n\nEnvoyer quand même ?`)
      if (!ok) return
    }
    setSendingVisaAgent(true)
    try {
      const r = await fetch(`/api/cases/${id}/send-visa-to-agent`, { method: 'POST' })
      if (r.ok) {
        setVisaAgentSent(true)
        setTimeout(() => setVisaAgentSent(false), 4000)
        fetchCase()
      }
    } finally {
      setSendingVisaAgent(false)
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

  interface TransportProvider {
    id: string
    name: string
    whatsapp: string | null
    contact_name: string | null
    is_default: boolean
    wa_message_template: string | null
  }

  async function openDriverWhatsApp() {
    if (openingDriverWA || !caseData) return
    setOpeningDriverWA(true)
    try {
      const r = await fetch('/api/settings/transport')
      if (!r.ok) { alert('Erreur chargement chauffeurs'); return }
      const transport = await r.json() as TransportProvider[]
      const provider = transport.find(t => t.is_default) ?? transport[0]
      if (!provider?.whatsapp) { alert('Aucun chauffeur configuré dans les paramètres.'); return }

      const cd = caseData
      const photoUrl = (cd.interns?.photo_id_url ?? cd.interns?.avatar_url ?? '') as string
      const msg = (provider.wa_message_template ?? '')
        .replace('{{intern_name}}', `${(cd.interns?.first_name ?? '')} ${(cd.interns?.last_name ?? '')}`.trim())
        .replace('{{arrival_date}}', cd.flight_arrival_time_local ? new Date(cd.flight_arrival_time_local as string).toLocaleDateString('fr-FR') : (cd.interns?.flight_departure_date ? new Date(cd.interns.flight_departure_date as string).toLocaleDateString('fr-FR') : '?'))
        .replace('{{arrival_time}}', cd.flight_arrival_time_local ? new Date(cd.flight_arrival_time_local as string).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '?')
        .replace('{{flight_number}}', (cd.interns?.flight_number ?? cd.flight_number ?? '?') as string)
        .replace('{{departure_city}}', (cd.interns?.flight_departure_city ?? '?') as string)
        .replace('{{dropoff_address}}', (cd.dropoff_address ?? '?') as string)
        .replace('{{photo_url}}', photoUrl)

      const wa = provider.whatsapp.replace(/\D/g, '')
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank')
    } finally {
      setOpeningDriverWA(false)
    }
  }

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
      case 'client':
        router.push(`/${locale}/clients/${caseData.id}`)
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
              {caseData.status === 'qualification_done' && (
                <button
                  onClick={() => { void sendQualificationEmail() }}
                  disabled={sendingQualif}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60"
                >
                  {sendingQualif ? 'Envoi…' : qualifSent ? '✓ Envoyé' : '📧 Email qualif'}
                </button>
              )}
              {caseData.status === 'job_retained' && (
                <button
                  onClick={() => { void sendRecapEmail() }}
                  disabled={sendingRecap}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#0d9e75] text-white font-semibold hover:bg-[#0a8a65] transition-colors disabled:opacity-60"
                >
                  {sendingRecap ? 'Envoi…' : recapSent ? '✓ Envoyé' : '📋 Récap candidat'}
                </button>
              )}
              {(caseData.status === 'qualification_done' || caseData.status === 'rdv_booked') && caseData.portal_token && (
                <button
                  onClick={() => { void sendPortal() }}
                  disabled={sendingPortal}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#c8a96e] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {sendingPortal ? 'Envoi…' : portalSent ? '✓ Portail envoyé' : caseData.portal_sent_at ? '🔁 Renvoyer portail' : '🌴 Envoyer portail'}
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
              {/* WA Chauffeur — visible quand infos vol présentes */}
              {(caseData.interns?.flight_number || caseData.flight_arrival_time_local) && (
                <>
                  <button
                    onClick={() => { void openDriverWhatsApp() }}
                    disabled={openingDriverWA}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#25d366] text-white font-semibold hover:bg-[#1da851] transition-colors disabled:opacity-60"
                  >
                    🚗 Chauffeur WA
                  </button>
                  {caseData.flight_number && caseData.flight_arrival_time_local && (
                    <button
                      onClick={() => setShowChauffeurCard(true)}
                      className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      🖼️ Carte
                    </button>
                  )}
                </>
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

            {/* Colonne droite: timeline 5 étapes + bouton ✏️ (masquée en mode compact) */}
            <div className={`flex-1 transition-all duration-200 ${headerCompact ? 'hidden' : 'block'}`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {STATUTS_TIMELINE.map((s, i) => {
                    const idx = STATUTS_TIMELINE.findIndex(x => x.key === caseData.status)
                    const reached = i <= idx
                    return (
                      <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                        <div className={`flex flex-col items-center gap-0.5 ${reached ? 'opacity-100' : 'opacity-25'}`}>
                          <span className="text-sm">{s.icon}</span>
                          <span className="text-[9px] text-zinc-500 text-center max-w-[44px] leading-tight">{s.label}</span>
                        </div>
                        {i < STATUTS_TIMELINE.length - 1 && (
                          <div className={`h-0.5 w-4 mt-[-10px] rounded-full flex-shrink-0 ${i < idx ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => setShowStatusModal(true)}
                  className="ml-2 text-xs px-2 py-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg flex-shrink-0"
                  title="Modifier le statut">
                  ✏️
                </button>
              </div>
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

          {/* Alerte paiement notifié par le candidat */}
          {caseData.payment_notified_by_intern_at && !headerCompact && (
            <div className="mb-2 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-xl flex items-start gap-3">
              <span className="text-lg flex-shrink-0">💰</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-yellow-800">Le candidat indique avoir payé — à vérifier</p>
                <p className="text-xs text-yellow-700">
                  Notifié le {new Date(caseData.payment_notified_by_intern_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {caseData.payment_notified_by_intern_note ? ` · ${caseData.payment_notified_by_intern_note}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Badge engagement letter */}
          {(caseData.engagement_letter_signed_at || (!caseData.engagement_letter_signed_at && caseData.portal_sent_at)) && !headerCompact && (
            <div className="mb-2 flex items-center gap-2">
              {caseData.engagement_letter_signed_at ? (
                <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
                  ✅ Lettre d&apos;engagement signée le {new Date(caseData.engagement_letter_signed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-full">
                  ⏳ Lettre d&apos;engagement en attente de signature
                </span>
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
      <div ref={scrollContainerRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 overflow-y-auto w-full pb-20 md:pb-6">
        {/* TabProcess supprimé - changement de statut dans la timeline */}

        {/* ── DOSSIER VISA — visible pour statuts clients après payment_received ── */}
        {['payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep', 'active'].includes(caseData.status) && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#1a1918]">Dossier Visa</h2>
              {caseData.visa_submitted_to_agent_at ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                  ✅ Envoyé le {new Date(caseData.visa_submitted_to_agent_at as string).toLocaleDateString('fr-FR')}
                </span>
              ) : (
                <button
                  onClick={() => { void sendVisaToAgent() }}
                  disabled={sendingVisaAgent}
                  className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {sendingVisaAgent ? 'Envoi…' : visaAgentSent ? '✓ Envoyé' : '📨 Envoyer à l\'agent'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {([
                { label: 'Photo ID fond blanc', ok: !!caseData.interns?.photo_id_url },
                { label: 'Passeport page 4', ok: !!caseData.interns?.passport_page4_url },
                { label: 'Relevé bancaire', ok: !!caseData.interns?.bank_statement_url },
                { label: `Vol ${(caseData.flight_number ?? '—') as string}`, ok: !!caseData.flight_number },
                { label: `Arrivée ${caseData.flight_arrival_time_local ? new Date(caseData.flight_arrival_time_local as string).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}`, ok: !!caseData.flight_arrival_time_local },
                { label: `Début stage ${(caseData.actual_start_date ?? '—') as string}`, ok: !!caseData.actual_start_date },
                { label: `Fin stage ${(caseData.actual_end_date ?? '—') as string}`, ok: !!caseData.actual_end_date },
              ] as { label: string; ok: boolean }[]).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${item.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                    {item.ok ? '✓' : '✗'}
                  </span>
                  <span className={`text-xs ${item.ok ? 'text-zinc-600' : 'text-red-500 font-medium'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            {caseData.visa_recu && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">🛂 Visa reçu !</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <TabProfil
            intern={(caseData as any).interns ?? null}
            internId={(caseData as any).interns?.id ?? null}
            caseId={caseData.id}
            schoolName={schoolName}
            schoolId={caseData.school_id ?? null}
            desiredStartDate={(caseData as any).desired_start_date ?? null}
            desiredEndDate={intern?.desired_end_date ?? null}
            desiredDurationMonths={(caseData as any).desired_duration_months ?? null}
            arrivalDate={(caseData as any).actual_start_date ?? (caseData as any).desired_start_date ?? null}
            qualificationNotes={(caseData as any).qualification_notes ?? null}
            desiredSectors={(caseData as any).desired_sectors ?? null}
            cvFeedback={(caseData as any).cv_feedback ?? null}
            touchpoint={intern?.touchpoint ?? null}
            touchpoints={(intern as any)?.touchpoints ?? null}
            referred_by_code={(intern as any)?.referred_by_code ?? null}
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
            desiredEndDate={intern?.desired_end_date ?? null}
            desiredDurationMonths={intern?.desired_duration_months ?? null}
            cvUrl={intern.cv_url ?? null}
            extraDocsUrls={(intern as any)?.extra_docs_urls ?? null}
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

      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Modifier le statut</h3>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ Changer le statut manuellement peut déclencher des automatisations.
            </p>
            <div className="space-y-2">
              {STATUTS_TIMELINE.map((s) => (
                <button key={s.key}
                  onClick={() => { void changeStatus(s.key); setShowStatusModal(false) }}
                  disabled={s.key === caseData.status}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    s.key === caseData.status ? 'bg-[#c8a96e] text-white cursor-default' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                  }`}>
                  {s.icon} {s.label}{s.key === caseData.status ? ' ← actuel' : ''}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} className="mt-4 w-full py-2 text-sm text-zinc-400">Annuler</button>
          </div>
        </div>
      )}

      {showChauffeurCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChauffeurCard(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#1a1918] mb-4 text-sm">Carte chauffeur</h3>
            <ChauffeurCard
              internName={`${(caseData.interns?.first_name as string) ?? ''} ${(caseData.interns?.last_name as string) ?? ''}`.trim()}
              arrivalDate={caseData.flight_arrival_time_local ? new Date(caseData.flight_arrival_time_local as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '?'}
              arrivalTime={caseData.flight_arrival_time_local ? new Date(caseData.flight_arrival_time_local as string).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '?'}
              flightNumber={(caseData.flight_number as string) ?? '?'}
              departureCity={(caseData.interns?.flight_departure_city as string) ?? (caseData.flight_last_stopover as string) ?? '?'}
              dropoffAddress={(caseData.dropoff_address as string) ?? '?'}
              photoUrl={(caseData.interns?.photo_id_url as string | null) ?? (caseData.interns?.avatar_url as string | null) ?? null}
              logoUrl={null}
              onClose={() => setShowChauffeurCard(false)}
            />
          </div>
        </div>
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
