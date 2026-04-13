'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TabProfil } from '@/components/cases/tabs/TabProfil'
import { TabFacturation } from '@/components/cases/tabs/TabFacturation'
import { TabVisa } from '@/components/cases/tabs/TabVisa'
import { TabArrivee } from '@/components/cases/tabs/TabArrivee'
import { TabHistorique } from '@/components/cases/tabs/TabHistorique'
import type { CaseStatus } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseDetail = Record<string, any>

type ClientTabKey = 'profil' | 'facturation' | 'visa' | 'arrivee' | 'historique'

const CLIENT_STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  convention_signed: { label: '📝 Convention signée', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: '💶 Paiement en attente', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: '💶 Payé', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: '🛂 Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: '🛂 Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: '🛂 Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: '✅ Visa reçu', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: '🛫 Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: '🌴 En stage', bg: '#d1fae5', text: '#059669' },
  alumni: { label: '🎓 Alumni', bg: '#f4f4f5', text: '#71717a' },
  completed: { label: '✅ Terminé', bg: '#d1fae5', text: '#059669' },
}

const CLIENT_ACTIONS: Record<string, { text: string; cta: string | null; tab: ClientTabKey | null }> = {
  convention_signed: { text: 'Envoyer la demande de paiement', cta: '💶 Facturation', tab: 'facturation' },
  payment_pending: { text: 'Attendre le paiement et confirmer réception', cta: '💶 Facturation', tab: 'facturation' },
  payment_received: { text: 'Demander les documents visa au client', cta: '🛂 Visa', tab: 'visa' },
  visa_docs_sent: { text: "Soumettre le dossier visa à l'agent", cta: '🛂 Visa', tab: 'visa' },
  visa_submitted: { text: "Attendre la réponse de l'agent visa (~30j)", cta: null, tab: null },
  visa_in_progress: { text: "Attendre la réponse de l'agent visa (~30j)", cta: null, tab: null },
  visa_received: { text: "Préparer l'arrivée — chauffeur + logement", cta: '🛫 Arrivée', tab: 'arrivee' },
  arrival_prep: { text: "Confirmer les détails d'arrivée", cta: '🛫 Arrivée', tab: 'arrivee' },
  active: { text: 'Suivre le stage via WhatsApp', cta: null, tab: null },
  alumni: { text: 'Envoyer le formulaire ambassadeur', cta: null, tab: null },
  completed: { text: 'Dossier terminé', cta: null, tab: null },
}

const TIMELINE_STEPS = [
  { key: 'convention_signed', label: 'Convention', icon: '📝' },
  { key: 'payment_received', label: 'Paiement', icon: '💶' },
  { key: 'visa_docs_sent', label: 'Docs visa', icon: '📄' },
  { key: 'visa_in_progress', label: 'Visa en cours', icon: '🛂' },
  { key: 'visa_received', label: 'Visa reçu', icon: '✅' },
  { key: 'arrival_prep', label: 'Arrivée', icon: '🛫' },
  { key: 'active', label: 'En stage', icon: '🌴' },
  { key: 'alumni', label: 'Alumni', icon: '🎓' },
]

const STATUS_TO_TIMELINE: Record<string, string> = {
  convention_signed: 'convention_signed',
  payment_pending: 'convention_signed',
  payment_received: 'payment_received',
  visa_docs_sent: 'visa_docs_sent',
  visa_submitted: 'visa_in_progress',
  visa_in_progress: 'visa_in_progress',
  visa_received: 'visa_received',
  arrival_prep: 'arrival_prep',
  active: 'active',
  alumni: 'alumni',
  completed: 'alumni',
}

function getLinkedinSlug(url: string): string | null {
  if (!url) return null
  if (!url.includes('linkedin.com')) return url.trim()
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1] : null
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ClientTabKey>('facturation')
  const [headerCompact, setHeaderCompact] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => setHeaderCompact(el.scrollTop > 60)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

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

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#fafaf9] gap-4 p-6">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
          {error ?? 'Dossier introuvable'}
        </div>
        <button
          onClick={() => router.push(`/${locale}/clients`)}
          className="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 hover:bg-zinc-50 text-[#1a1918] rounded-lg transition-colors"
        >
          &larr; Retour aux clients
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
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const linkedinSlug = getLinkedinSlug(linkedinUrl)
  const avatarUrl = intern.avatar_url ?? (linkedinSlug ? `https://unavatar.io/linkedin/${linkedinSlug}` : null)
  const schoolName = caseData.schools?.name ?? intern.school_country ?? ''

  const badge = CLIENT_STATUS_BADGES[caseData.status] ?? { label: caseData.status, bg: '#f4f4f5', text: '#71717a' }
  const nextAction = CLIENT_ACTIONS[caseData.status]

  const mappedKey = STATUS_TO_TIMELINE[caseData.status] ?? caseData.status
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === mappedKey)

  const tabs: { key: ClientTabKey; label: string }[] = [
    { key: 'profil', label: '👤 Profil' },
    { key: 'facturation', label: '💶 Facturation' },
    { key: 'visa', label: '🛂 Visa' },
    { key: 'arrivee', label: '🛫 Arrivée' },
    { key: 'historique', label: '📋 Historique' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#fafaf9]">
      {/* ── HEADER STICKY ── */}
      <div className={`sticky top-0 z-20 bg-white border-b border-zinc-200 transition-all duration-200 ${headerCompact ? 'shadow-md' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Nav row */}
          <div className="flex items-center justify-between py-3">
            <Link
              href={`/${locale}/cases/${caseData.id}`}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Voir la candidature
            </Link>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </div>
          </div>

          {/* Header identité */}
          <div className="flex items-center gap-4 py-3">
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-[#1a1918] leading-tight">{firstName} {lastName}</h1>
                {age && <span className="text-xs text-zinc-400 font-medium">{age} ans</span>}
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Client</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
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
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    🔗 LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Timeline client — hidden when compact */}
          <div className={`flex items-center gap-1 py-2 overflow-x-auto pb-2 border-t border-zinc-100 transition-all duration-200 ${headerCompact ? 'max-h-0 opacity-0 overflow-hidden py-0 border-0' : 'max-h-16 opacity-100'}`}>
            {TIMELINE_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex flex-col items-center gap-0.5 ${i <= currentIdx ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[9px] text-zinc-500 text-center max-w-[55px] leading-tight">{s.label}</span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`h-0.5 w-4 flex-shrink-0 mt-[-8px] ${i < currentIdx ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Next action — hidden when compact */}
          {nextAction && (
            <div className={`px-4 py-3 bg-[#0d9e75]/10 border border-[#0d9e75]/20 rounded-xl flex items-center justify-between transition-all duration-200 ${headerCompact ? 'max-h-0 opacity-0 mb-0 overflow-hidden py-0 px-0 border-0 pointer-events-none' : 'max-h-24 opacity-100 mb-3'}`}>
              <div>
                <p className="text-xs font-semibold text-[#0d9e75] uppercase tracking-wide mb-0.5">Prochaine étape</p>
                <p className="text-sm font-medium text-[#1a1918]">{nextAction.text}</p>
              </div>
              {nextAction.cta && nextAction.tab && (
                <button
                  onClick={() => setActiveTab(nextAction.tab!)}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#0d9e75] text-white text-xs font-semibold rounded-lg hover:bg-[#0a8a65] transition-colors"
                >
                  {nextAction.cta}
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
      <div ref={scrollContainerRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 overflow-y-auto w-full">
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
        {activeTab === 'facturation' && (
          <TabFacturation caseId={caseData.id} caseData={{ id: caseData.id, status: caseData.status, payment_amount: caseData.payment_amount, discount_percentage: caseData.discount_percentage, invoice_number: caseData.invoice_number, payment_type: caseData.payment_type, payment_date: caseData.payment_date, convention_signee_check: caseData.convention_signee_check, packages: caseData.packages as any, interns: caseData.interns ? { first_name: caseData.interns.first_name ?? '', last_name: caseData.interns.last_name ?? '' } : null } as any} />
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
          }} schoolName={schoolName} onStatusChange={fetchCase} />
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
        {activeTab === 'historique' && (
          <TabHistorique caseId={caseData.id} />
        )}
      </div>
    </div>
  )
}
