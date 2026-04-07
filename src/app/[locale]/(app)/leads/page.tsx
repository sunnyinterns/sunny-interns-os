'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Lead {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  source: string | null
  status: string
  score: number
  verdict: string | null
  months_selected: string[] | null
  domains_selected: string[] | null
  deadline_to_apply: string | null
  applied: boolean
  applied_at: string | null
  reminder_step: number
  notes: string | null
  created_at: string
  case_id?: string | null
}

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-zinc-100 text-zinc-600',
  contacted: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-[#0d9e75]',
  closed: 'bg-red-100 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Contacté',
  applied: 'Candidaté',
  closed: 'Fermé',
  on_hold: 'En attente',
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-[#0d9e75]'
  if (score >= 40) return 'bg-amber-100 text-[#d97706]'
  return 'bg-red-100 text-[#dc2626]'
}

function daysUntil(date: string | null): { label: string; color: string } | null {
  if (!date) return null
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Expiré', color: 'bg-red-100 text-red-700' }
  if (diff <= 7) return { label: `J-${diff}`, color: 'bg-red-100 text-[#dc2626] font-bold' }
  if (diff <= 14) return { label: `J-${diff}`, color: 'bg-amber-100 text-[#d97706]' }
  if (diff <= 30) return { label: `J-${diff}`, color: 'bg-yellow-100 text-yellow-700' }
  return { label: `J-${diff}`, color: 'bg-zinc-100 text-zinc-500' }
}

export default function LeadsPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const locale = params.locale ?? 'fr'

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterScoreMin, setFilterScoreMin] = useState(0)
  const [filterMonth, setFilterMonth] = useState('')
  const [qualifying, setQualifying] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/leads')
    const data = res.ok ? await res.json() as Lead[] : []
    // Trier par score desc
    setLeads(data.sort((a, b) => b.score - a.score))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function updateLead(id: string, patch: Record<string, unknown>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  }

  async function closeLead(id: string) {
    await updateLead(id, { status: 'closed' })
  }

  async function qualify(lead: Lead) {
    if (lead.case_id) {
      router.push(`/${locale}/cases/${lead.case_id}`)
      return
    }
    setQualifying(lead.id)
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lead.email, status: 'lead' }),
      })
      if (res.ok) {
        const newCase = await res.json() as { id: string }
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'applied', applied: true, applied_at: new Date().toISOString(), case_id: newCase.id }),
        })
        router.push(`/${locale}/cases/${newCase.id}`)
      }
    } finally {
      setQualifying(null)
    }
  }

  // Mois uniques pour filtre
  const allMonths = Array.from(new Set(leads.flatMap(l => l.months_selected ?? []))).sort()

  const filtered = leads.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    const matchScore = l.score >= filterScoreMin
    const matchMonth = !filterMonth || (l.months_selected ?? []).includes(filterMonth)
    return matchStatus && matchScore && matchMonth
  })

  const counts = {
    total: leads.length,
    applied: leads.filter(l => l.applied).length,
    active: leads.filter(l => !['closed', 'applied'].includes(l.status)).length,
    closed: leads.filter(l => l.status === 'closed').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{counts.total} leads · {counts.active} actifs · {counts.applied} candidatés</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'text-[#1a1918]' },
          { label: 'Actifs', value: counts.active, color: 'text-[#1a1918]' },
          { label: 'Candidatés', value: counts.applied, color: 'text-[#0d9e75]' },
          { label: 'Fermés', value: counts.closed, color: 'text-zinc-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-zinc-100 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {['all', 'lead', 'contacted', 'applied', 'on_hold', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={['px-3 py-1.5 text-xs rounded-lg transition-colors', filterStatus === s ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
            >
              {s === 'all' ? 'Tous' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <select
          value={filterScoreMin}
          onChange={e => setFilterScoreMin(Number(e.target.value))}
          className="px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value={0}>Score min: tous</option>
          <option value={40}>Score ≥ 40</option>
          <option value={70}>Score ≥ 70</option>
        </select>
        {allMonths.length > 0 && (
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          >
            <option value="">Tous les mois</option>
            {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun lead</p>
          <p className="text-sm">Les leads arrivent via le formulaire de candidature public</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Prénom Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Mois</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Domaines</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Deadline</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(lead => {
                const urg = daysUntil(lead.deadline_to_apply)
                const displayName = lead.first_name
                  ? `${lead.first_name} ${lead.last_name ?? ''}`.trim()
                  : '—'
                return (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {lead.score > 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1a1918] font-medium">{displayName}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{lead.email}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {lead.months_selected && lead.months_selected.length > 0
                        ? lead.months_selected.slice(0, 2).join(', ') + (lead.months_selected.length > 2 ? '…' : '')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {lead.domains_selected && lead.domains_selected.length > 0
                        ? lead.domains_selected.slice(0, 2).join(', ') + (lead.domains_selected.length > 2 ? '…' : '')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {urg ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${urg.color}`}>{urg.label}</span>
                      ) : <span className="text-xs text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'closed' && (
                          <>
                            {lead.status !== 'applied' && (
                              <button
                                onClick={() => void qualify(lead)}
                                disabled={qualifying === lead.id}
                                className="text-xs px-2 py-1 rounded-lg bg-[#c8a96e]/10 text-[#c8a96e] hover:bg-[#c8a96e]/20 transition-colors font-medium disabled:opacity-50"
                              >
                                {qualifying === lead.id ? '…' : 'Qualifier'}
                              </button>
                            )}
                            {lead.case_id && (
                              <button
                                onClick={() => router.push(`/${locale}/cases/${lead.case_id}`)}
                                className="text-xs px-2 py-1 rounded-lg bg-green-50 text-[#0d9e75] hover:bg-green-100 transition-colors"
                              >
                                Dossier →
                              </button>
                            )}
                            <button
                              onClick={() => void closeLead(lead.id)}
                              className="text-xs px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
                            >
                              Fermer
                            </button>
                          </>
                        )}
                        {lead.status === 'closed' && lead.applied_at && (
                          <span className="text-xs text-zinc-400">{new Date(lead.applied_at).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
