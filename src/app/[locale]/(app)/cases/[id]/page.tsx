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
import { CaseStatusBandeau } from '@/components/cases/CaseStatusBandeau'

const CANDIDATE_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed', 'to_recontact']

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
  to_recontact: { label: 'À recontacter', bg: '#fef3c7', text: '#b45309' },
  no_job_found: { label: 'No job found', bg: '#fee2e2', text: '#dc2626' },
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
  visa_docs_sent: { text: "Envoyer le dossier a l'agent visa", cta: 'Envoyer Agent Visa', action: 'visa' },
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

  async function patchStatusDirect(newStatus: string) {
    const r = await fetch(`/api/cases/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (r.ok) fetchCase()
  }

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
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* ── LIGNE 1 : Nav + Boutons contextuels ── */}
          <div className="flex items-center justify-between py-2.5 gap-2">
            <button onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Retour
            </button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Modifier — toujours visible */}
              <button onClick={() => setShowEditModal(true)}
                className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 transition-colors">
                Modifier
              </button>
              {/* Portail candidat — seulement après qualification_done */}
              {['qualification_done','job_submitted','job_retained','convention_signed'].includes(caseData.status) && caseData.portal_token && (
                <a href={`/portal/${caseData.portal_token}`} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Portail candidat ↗
                </a>
              )}
              {/* Envoyer portail — qualification_done + CV validé */}
              {caseData.status === 'qualification_done' && caseData.portal_token && intern.cv_url && (
                <button onClick={() => { void sendPortal() }} disabled={sendingPortal}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {sendingPortal ? 'Envoi…' : portalSent ? '✓ Envoyé' : caseData.portal_sent_at ? '🔁 Renvoyer portail' : '🌴 Envoyer portail'}
                </button>
              )}
              {/* Chauffeur WA — arrival_prep/active avec vol */}
              {(caseData.interns?.flight_number || caseData.flight_arrival_time_local) && (
                <button onClick={() => { void openDriverWhatsApp() }} disabled={openingDriverWA}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#25d366] text-white hover:bg-[#1da851] disabled:opacity-60 transition-colors">
                  🚗 Chauffeur
                </button>
              )}
              {/* Carte stagiaire — active */}
              {caseData.status === 'active' && (
                <button onClick={() => setShowInternCard(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white hover:opacity-90 transition-opacity">
                  Carte stagiaire
                </button>
              )}
              {/* Voir fiche client — isClient */}
              {isClient && (
                <Link href={`/${locale}/clients/${caseData.id}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1a1918] text-[#c8a96e] hover:bg-zinc-800 transition-colors">
                  Fiche client →
                </Link>
              )}
            </div>
          </div>

          {/* ── LIGNE 2 : Identité + Pipeline ── */}
          <div className="flex items-center gap-3 pb-2.5">
            {/* Avatar */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${firstName} ${lastName}`}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
              ) : null}
              <div className={`w-10 h-10 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-sm font-bold text-[#c8a96e] ${avatarUrl ? 'hidden' : ''}`}>
                {getInitials(firstName, lastName)}
              </div>
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-[#1a1918]">{firstName} {lastName}</span>
                {age ? <span className="text-xs text-zinc-400">{age} ans</span> : null}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: badge.bg, color: badge.text }}>{badge.label}</span>
                {caseData.status === 'to_recontact' && (() => {
                  const ra = (caseData as Record<string, string | null>).recontact_at
                  return ra ? <span className="text-xs text-amber-600">📅 {new Date(ra).toLocaleDateString('fr-FR')}</span> : null
                })()}
                {isVisaOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">Visa Only</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-400">{email}</span>
                {mainJob && <span className="text-xs text-zinc-400">· {mainJob}</span>}
                {dateDepart && <span className="text-xs text-zinc-400">· 📅 {dateDepart}</span>}
                {durationMonths && <span className="text-xs text-zinc-400">· {durationMonths} mois</span>}
                {/* Icônes contact rapide */}
                <a href={`mailto:${email}`}
                  className="w-6 h-6 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center transition-colors flex-shrink-0" title="Email">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </a>
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                    className="w-6 h-6 rounded-md border border-[#25d366]/30 bg-[#25d366]/10 hover:bg-[#25d366]/20 flex items-center justify-center transition-colors flex-shrink-0" title="WhatsApp">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.133 1.532 5.866L.058 23.942l6.234-1.637A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.863 0-3.61-.48-5.13-1.32l-.367-.218-3.704.973.99-3.614-.24-.37A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer"
                    className="w-6 h-6 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors flex-shrink-0" title="LinkedIn">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                  </a>
                )}
              </div>
            </div>

            {/* Pipeline 5 étapes — Candidats seulement */}
            {!isClient && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {[
                  { key: 'rdv_booked', label: 'RDV' },
                  { key: 'qualification_done', label: 'Qualif' },
                  { key: 'job_submitted', label: 'Jobs' },
                  { key: 'job_retained', label: 'Match' },
                  { key: 'convention_signed', label: 'Convention' },
                ].map((step, i, arr) => {
                  const statusOrder = ['rdv_booked','qualification_done','job_submitted','job_retained','convention_signed']
                  const currentIdx = statusOrder.indexOf(caseData.status)
                  const stepIdx = statusOrder.indexOf(step.key)
                  const isDone = currentIdx > stepIdx
                  const isCurrent = currentIdx === stepIdx
                  return (
                    <div key={step.key} className="flex items-center gap-1">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                          isDone ? 'bg-[#0d9e75] text-white' :
                          isCurrent ? 'border-2 border-[#c8a96e] text-[#c8a96e] bg-[#c8a96e]/10' :
                          'border border-zinc-200 text-zinc-300 bg-zinc-50'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={`text-[8px] leading-tight text-center w-12 ${isCurrent ? 'text-[#c8a96e] font-semibold' : isDone ? 'text-[#0d9e75]' : 'text-zinc-300'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`w-4 h-px mb-3 ${isDone ? 'bg-[#0d9e75]' : 'bg-zinc-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── BANDEAU CONTEXTUEL PAR STATUT ── */}
          <CaseStatusBandeau caseData={caseData} intern={intern} onAction={handleCtaClick}
            onSendPortal={() => { void sendPortal() }} sendingPortal={sendingPortal}
            onPatchStatus={(s) => { void patchStatusDirect(s) }} locale={locale} />

          {/* Onglets */}
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}>
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
