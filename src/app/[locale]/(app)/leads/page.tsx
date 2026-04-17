'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  whatsapp: string | null
  source: string
  sub_source: string | null
  status: string
  abandon_reason: string | null
  form_step: number | null
  desired_jobs: string[] | null
  desired_start_date: string | null
  school_country: string | null
  spoken_languages: string[] | null
  touchpoint: string | null
  notes: string | null
  converted_case_id: string | null
  converted_at: string | null
  last_contacted_at: string | null
  deadline_to_apply?: string | null
  r1_at?: string | null
  r2_at?: string | null
  r3_at?: string | null
  r4_at?: string | null
  stage_entered_at?: string | null
  next_followup_at?: string | null
  temperature?: 'hot' | 'warm' | 'cold' | null
  created_at: string
  updated_at: string | null
}

const SOURCE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  website_form_unfinished: { label: 'Formulaire', emoji: '📋', color: 'bg-zinc-100 text-zinc-600' },
  linkedin: { label: 'LinkedIn', emoji: '💼', color: 'bg-blue-100 text-blue-700' },
  facebook: { label: 'Facebook', emoji: '📘', color: 'bg-indigo-100 text-indigo-700' },
  facebook_group: { label: 'Groupe Facebook', emoji: '👥', color: 'bg-indigo-100 text-indigo-700' },
  jobboard: { label: 'Jobboard', emoji: '🗂️', color: 'bg-violet-100 text-violet-700' },
  landing_page: { label: 'Landing page', emoji: '🌐', color: 'bg-teal-100 text-teal-700' },
  instagram: { label: 'Instagram', emoji: '📸', color: 'bg-pink-100 text-pink-700' },
  whatsapp_inbound: { label: 'WhatsApp entrant', emoji: '💬', color: 'bg-green-100 text-green-700' },
  referral: { label: 'Parrainage', emoji: '🤝', color: 'bg-orange-100 text-orange-700' },
  manual: { label: 'Manuel', emoji: '✏️', color: 'bg-zinc-100 text-zinc-600' },
  newsletter: { label: 'Newsletter', emoji: '📧', color: 'bg-sky-100 text-sky-700' },
}


// Statut dérivé pour les leads formulaire — basé sur l'activité récente
function getFormLeadStatus(lead: Lead): 'in_progress' | 'abandoned' | 'converted' {
  if (lead.converted_case_id || lead.status === 'converted') return 'converted'
  if (lead.source !== 'website_form_unfinished') return 'abandoned'
  const lastActivity = lead.updated_at ? new Date(lead.updated_at) : new Date(lead.created_at)
  const minutesSince = (Date.now() - lastActivity.getTime()) / 60000
  return minutesSince < 15 ? 'in_progress' : 'abandoned'
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  nurturing: 'En nurturing',
  converted: 'Converti',
  dead: 'Mort',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-zinc-100 text-zinc-700',
  contacted: 'bg-blue-100 text-blue-700',
  nurturing: 'bg-violet-100 text-violet-700',
  converted: 'bg-green-100 text-[#0d9e75]',
  dead: 'bg-red-50 text-red-600',
}

const STADE: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Nouveau', color: '#1a1918', bg: '#f4f3f1' },
  contacted: { label: 'Contacté', color: '#0d9e75', bg: '#f0fdf9' },
  in_progress: { label: 'En cours', color: '#c8a96e', bg: '#fdf8f0' },
  form_sent: { label: 'Formulaire envoyé', color: '#6366f1', bg: '#eeefff' },
  form_started: { label: 'Formulaire démarré', color: '#f59e0b', bg: '#fffbeb' },
  form_completed: { label: 'Formulaire complet', color: '#0d9e75', bg: '#f0fdf9' },
  rdv_planned: { label: 'RDV planifié', color: '#7c3aed', bg: '#f5f3ff' },
  qualified: { label: 'Qualifié', color: '#0d9e75', bg: '#dcfce7' },
  converted: { label: 'Converti', color: '#16a34a', bg: '#dcfce7' },
  lost: { label: 'Perdu', color: '#6b7280', bg: '#f4f3f1' },
  abandoned: { label: 'Abandonné', color: '#ef4444', bg: '#fef2f2' },
  nurturing: { label: 'En nurturing', color: '#7c3aed', bg: '#f5f3ff' },
  dead: { label: 'Mort', color: '#6b7280', bg: '#f4f3f1' },
}
function daysAgo(d?: string | null) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 999 }

function initials(first: string | null, last: string | null, email: string): string {
  if (first || last) {
    return `${(first ?? '')[0] ?? ''}${(last ?? '')[0] ?? ''}`.toUpperCase() || email[0].toUpperCase()
  }
  return email[0].toUpperCase()
}

export default function LeadsPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const locale = params.locale ?? 'fr'

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [crmLeads, setCrmLeads] = useState<{id:string;firstName:string;lastName:string;email:string;created_at:string}[]>([])

  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads')
    if (!res.ok) { setLeads([]); return }
    const data = (await res.json()) as Lead[]
    setLeads(Array.isArray(data) ? data : [])
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    setLoading(true)
    void fetchLeads().finally(() => setLoading(false))
    // Fetch cases en statut lead
    fetch('/api/cases?status=lead')
      .then(r => r.ok ? r.json() : [])
      .then((d: {id:string;firstName:string;lastName:string;email:string;created_at:string}[]) => setCrmLeads(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [fetchLeads])

  useEffect(() => {
    const interval = setInterval(() => { void fetchLeads() }, 15000)
    return () => clearInterval(interval)
  }, [fetchLeads])

  const MAIN_SOURCES = useMemo(() => new Set(['website_form_unfinished', 'linkedin', 'facebook', 'facebook_group']), [])

  // Cacher les leads convertis (ils ont un dossier candidat)
  
  // Toujours exclure les convertis — ils sont dans /cases
  const activeLeads = useMemo(() => leads.filter(l => l.status !== 'converted' && !l.converted_case_id), [leads])
  
  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return activeLeads
    if (sourceFilter === 'in_progress') return activeLeads.filter(l => getFormLeadStatus(l) === 'in_progress')
    if (sourceFilter === 'relancer') return activeLeads.filter(l => !l.last_contacted_at || daysAgo(l.last_contacted_at) > 7)
    if (sourceFilter === 'other') return activeLeads.filter(l => !MAIN_SOURCES.has(l.source))
    if (sourceFilter === 'facebook') return activeLeads.filter(l => ['facebook', 'facebook_group'].includes(l.source))
    return activeLeads.filter(l => l.source === sourceFilter)
  }, [activeLeads, sourceFilter, MAIN_SOURCES])

  const counts = useMemo(() => ({
    all: activeLeads.length,
    website: activeLeads.filter(l => l.source === 'website_form_unfinished').length,
    linkedin: activeLeads.filter(l => l.source === 'linkedin').length,
    facebook: activeLeads.filter(l => ['facebook', 'facebook_group'].includes(l.source)).length,
    other: activeLeads.filter(l => !MAIN_SOURCES.has(l.source)).length,
    in_progress: activeLeads.filter(l => getFormLeadStatus(l) === 'in_progress').length,
    relancer: activeLeads.filter(l => !l.last_contacted_at || daysAgo(l.last_contacted_at) > 7).length,
  }), [activeLeads, MAIN_SOURCES])

  const filters: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'relancer', label: '⚠️ À relancer', count: counts.relancer },
    { key: 'in_progress', label: '⏳ En cours', count: counts.in_progress },
    { key: 'website_form_unfinished', label: 'Formulaire abandonné', count: counts.website },
    { key: 'linkedin', label: 'LinkedIn', count: counts.linkedin },
    { key: 'facebook', label: 'Facebook', count: counts.facebook },
    { key: 'other', label: 'Autre', count: counts.other },
  ]

  function relaunch(lead: Lead) {
    const subject = encodeURIComponent('On continue ta candidature Bali Interns ?')
    const body = encodeURIComponent(
      `Salut${lead.first_name ? ` ${lead.first_name}` : ''},\n\nTu as commencé ta candidature Bali Interns mais tu ne l'as pas terminée. Un coup de main ?\n\nReprends ici : https://sunny-interns-os.vercel.app/apply\n\nCharly`
    )
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">

      {/* ── Dossiers CRM en statut Lead ── */}
      {crmLeads.length > 0 && (
        <div className="mb-6 bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-2xl p-4">
          <p className="text-xs font-bold text-[#c8a96e] uppercase tracking-wider mb-3">
            🗂️ Dossiers CRM en Lead — {crmLeads.length}
          </p>
          <div className="flex flex-col gap-2">
            {crmLeads.map(c => (
              <button key={c.id} onClick={() => router.push(`/${locale}/cases/${c.id}`)}
                className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-zinc-100 hover:border-[#c8a96e]/50 text-left transition-colors">
                <div>
                  <p className="text-sm font-semibold text-[#1a1918]">
                    {c.firstName ? `${c.firstName} ${c.lastName}` : c.email}
                  </p>
                  {c.firstName && <p className="text-xs text-zinc-400">{c.email}</p>}
                </div>
                <span className="text-xs text-[#c8a96e] font-medium">Ouvrir →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {leads.length} lead{leads.length > 1 ? 's' : ''} · {filtered.length} affiché{filtered.length > 1 ? 's' : ''}
            <span className="ml-2 text-xs text-zinc-400">
              Mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchLeads()}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => router.push(`/${locale}/leads/new`)}
            className="px-4 py-2 text-sm font-medium bg-[#c8a96e] hover:bg-[#b8994e] text-white rounded-lg transition-colors"
          >
            + Ajouter un lead
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-5 w-fit overflow-x-auto max-w-full">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            className={[
              'px-3 py-1.5 text-xs rounded-lg transition-colors',
              sourceFilter === f.key
                ? 'bg-white shadow-sm font-medium text-[#1a1918]'
                : 'text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun lead</p>
          <p className="text-sm">Les leads arrivent via le formulaire de candidature ou les imports externes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const src = SOURCE_LABELS[lead.source] ?? { label: lead.source, emoji: '•', color: 'bg-zinc-100 text-zinc-600' }
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
            return (
              <div
                key={lead.id}
                className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelectedLead(lead)}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-600 flex-shrink-0">
                  {initials(lead.first_name, lead.last_name, lead.email)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[#1a1918] truncate">
                      {name || lead.email}
                    </p>
                    {name && <p className="text-xs text-zinc-500 truncate">{lead.email}</p>}
                  </div>
                  {lead.desired_jobs && lead.desired_jobs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.desired_jobs.slice(0, 2).map((j, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#c8a96e]/10 text-[#8a6a2a] rounded-full">{j}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Badge source */}
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${src.color}`}>
                      <span>{src.emoji}</span> {src.label}
                    </span>
                    {/* Badge statut — avec logique 15min pour formulaire */}
                    {lead.source === 'website_form_unfinished' ? (() => {
                      const fs = getFormLeadStatus(lead)
                      if (fs === 'in_progress') return (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-400 border border-zinc-200">
                          <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-30"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/></svg>
                          En cours…
                        </span>
                      )
                      if (fs === 'abandoned') return (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600 border border-amber-200">
                          🔶 Abandonné {lead.form_step !== null ? `— étape ${lead.form_step}` : ''}
                        </span>
                      )
                      return null
                    })() : (() => {
                      const st = STADE[lead.status] ?? { label: STATUS_LABELS[lead.status] ?? lead.status, color: '#6b7280', bg: '#f4f3f1' }
                      return <span style={{ background: st.bg, color: st.color }} className="text-xs px-2 py-0.5 rounded-full font-semibold">{st.label}</span>
                    })()}
                    <span className="text-xs text-zinc-400">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    {lead.desired_start_date && (
                      <span className="text-[10px] text-zinc-400">
                        🛫 {new Date(lead.desired_start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {lead.whatsapp && (
                      <a href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] text-green-600 hover:underline">
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                  {/* Timing row */}
                  {(() => {
                    const lastContactDays = daysAgo(lead.last_contacted_at)
                    const deadlineDays = lead.deadline_to_apply ? daysAgo(new Date(lead.deadline_to_apply + 'T23:59:59').toISOString()) * -1 : null
                    const hasInfo = lead.last_contacted_at || (deadlineDays !== null && deadlineDays <= 14) || (lead.r1_at && !lead.r2_at)
                    if (!hasInfo) return null
                    return (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {lead.last_contacted_at && (
                          <span className={`text-[10px] ${lastContactDays > 14 ? 'text-red-500 font-bold' : lastContactDays > 7 ? 'text-amber-500' : 'text-zinc-400'}`}>
                            🕒 {lastContactDays > 14 ? `⚠️ ${lastContactDays}j sans contact` : lastContactDays === 0 ? "Aujourd'hui" : lastContactDays === 1 ? 'Hier' : `${lastContactDays}j`}
                          </span>
                        )}
                        {deadlineDays !== null && deadlineDays <= 14 && (
                          <span className={`text-[10px] ${deadlineDays < 0 ? 'text-red-600 font-bold' : deadlineDays <= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                            {deadlineDays < 0 ? '🚨 Deadline dépassée' : `⏰ Deadline dans ${deadlineDays}j`}
                          </span>
                        )}
                        {lead.r1_at && !lead.r2_at && (
                          <span className="text-[10px] text-zinc-400">🔔 R1: {new Date(lead.r1_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <button
                  onClick={() => relaunch(lead)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#c8a96e]/10 text-[#c8a96e] hover:bg-[#c8a96e]/20 transition-colors font-medium flex-shrink-0"
                >
                  Relancer
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedLead(null)}>
          <div className="flex-1 bg-black/30" />
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1918]">
                  {[selectedLead.first_name, selectedLead.last_name].filter(Boolean).join(' ') || selectedLead.email}
                </h2>
                <p className="text-sm text-zinc-500">{selectedLead.email}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {selectedLead.converted_case_id && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">✅ Converti en candidat</p>
                <p className="text-sm text-emerald-700">Ce lead a complété sa candidature et pris un RDV.</p>
                <a
                  href={`/${locale}/cases/${selectedLead.converted_case_id}`}
                  className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Voir le dossier →
                </a>
              </div>
            )}

            <div className="space-y-3 text-sm">
              {selectedLead.phone && <div><span className="text-zinc-500">Téléphone : </span>{selectedLead.phone}</div>}
              {selectedLead.whatsapp && <div><span className="text-zinc-500">WhatsApp : </span><a href={`https://wa.me/${selectedLead.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#128c5e] hover:underline">{selectedLead.whatsapp}</a></div>}
              {selectedLead.desired_jobs && selectedLead.desired_jobs.length > 0 && (
                <div><span className="text-zinc-500">Métiers : </span>{selectedLead.desired_jobs.join(', ')}</div>
              )}
              {selectedLead.desired_start_date && <div><span className="text-zinc-500">Démarrage : </span>{selectedLead.desired_start_date}</div>}
              {selectedLead.school_country && <div><span className="text-zinc-500">Pays d'études : </span>{selectedLead.school_country}</div>}
              {selectedLead.touchpoint && <div><span className="text-zinc-500">Touchpoint : </span>{selectedLead.touchpoint}</div>}
              {selectedLead.form_step !== null && <div><span className="text-zinc-500">Étape atteinte : </span>{selectedLead.form_step}</div>}
              {selectedLead.notes && <div><span className="text-zinc-500">Notes : </span>{selectedLead.notes}</div>}
              <div><span className="text-zinc-500">Créé le : </span>{new Date(selectedLead.created_at).toLocaleString('fr-FR')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
