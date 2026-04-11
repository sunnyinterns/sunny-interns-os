'use client'

import { useEffect, useMemo, useState } from 'react'
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
  form_step_abandoned: number | null
  desired_jobs: string[] | null
  desired_start_date: string | null
  school_country: string | null
  spoken_languages: string[] | null
  touchpoint: string | null
  notes: string | null
  converted_case_id: string | null
  converted_at: string | null
  last_contacted_at: string | null
  created_at: string
}

const SOURCE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  website_form_unfinished: { label: 'Formulaire abandonné', emoji: '🔶', color: 'bg-amber-100 text-amber-700' },
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
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const res = await fetch('/api/leads')
      if (!res.ok) {
        if (!cancelled) { setLeads([]); setLoading(false) }
        return
      }
      const data = (await res.json()) as Lead[]
      if (!cancelled) { setLeads(Array.isArray(data) ? data : []); setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return leads
    if (sourceFilter === 'other') {
      const main = new Set(['website_form_unfinished', 'linkedin', 'facebook', 'facebook_group'])
      return leads.filter(l => !main.has(l.source))
    }
    return leads.filter(l => l.source === sourceFilter)
  }, [leads, sourceFilter])

  const filters: { key: string; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'website_form_unfinished', label: 'Formulaire abandonné' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'other', label: 'Autre' },
  ]

  function relaunch(lead: Lead) {
    const subject = encodeURIComponent('On continue ta candidature Bali Interns ?')
    const body = encodeURIComponent(
      `Salut${lead.first_name ? ` ${lead.first_name}` : ''},\n\nTu as commencé ta candidature Bali Interns mais tu ne l'as pas terminée. Un coup de main ?\n\nReprends ici : https://app.bali-interns.com/apply\n\nCharly`
    )
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {leads.length} lead{leads.length > 1 ? 's' : ''} · {filtered.length} affiché{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/leads/new`)}
          className="px-4 py-2 text-sm font-medium bg-[#c8a96e] hover:bg-[#b8994e] text-white rounded-lg transition-colors"
        >
          + Ajouter un lead
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-5 w-fit">
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
            {f.label}
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
                className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-200 transition-colors"
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
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${src.color}`}>
                      <span>{src.emoji}</span> {src.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                    {lead.source === 'website_form_unfinished' && lead.form_step_abandoned !== null && (
                      <span className="text-xs text-zinc-500">
                        Abandonné à l&apos;étape {lead.form_step_abandoned}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
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
    </div>
  )
}
