'use client'

import { useEffect, useState } from 'react'

interface Lead {
  id: string
  email: string
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

function urgencyBadge(deadline: string | null): { label: string; color: string } | null {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `Expiré`, color: 'bg-red-100 text-red-700' }
  if (diff <= 7) return { label: `J-${diff}`, color: 'bg-red-100 text-[#dc2626] font-bold' }
  if (diff <= 14) return { label: `J-${diff}`, color: 'bg-amber-100 text-[#d97706]' }
  if (diff <= 30) return { label: `J-${diff}`, color: 'bg-yellow-100 text-yellow-700' }
  return { label: `J-${diff}`, color: 'bg-zinc-100 text-zinc-600' }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/leads')
    setLeads(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function updateLead(id: string, patch: Record<string, unknown>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
  }

  async function markApplied(id: string) {
    await updateLead(id, { status: 'applied', applied: true, applied_at: new Date().toISOString() })
  }

  async function closeLead(id: string) {
    await updateLead(id, { status: 'closed' })
  }

  async function relaunch(id: string) {
    await updateLead(id, { status: 'contacted', reminder_step: (leads.find(l => l.id === id)?.reminder_step ?? 0) + 1 })
  }

  const filtered = leads.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q || l.email.toLowerCase().includes(q) || (l.verdict ?? '').toLowerCase().includes(q) || (l.source ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = { total: leads.length, applied: leads.filter(l => l.applied).length, active: leads.filter(l => !['closed', 'applied'].includes(l.status)).length }

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
          { label: 'Fermés', value: leads.filter(l => l.status === 'closed').length, color: 'text-zinc-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-zinc-100 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input
          type="text"
          placeholder="Rechercher email, source…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-56"
        />
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
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun lead</p>
          <p className="text-sm">Les leads arrivent via le formulaire de candidature public</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const urg = urgencyBadge(lead.deadline_to_apply)
            return (
              <div key={lead.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-[#1a1918]">{lead.email}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[lead.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      {urg && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${urg.color}`}>{urg.label}</span>
                      )}
                      {lead.score > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#c8a96e]/10 text-[#c8a96e] font-medium">Score {lead.score}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      {lead.source && <span>Source: <strong className="text-[#1a1918]">{lead.source}</strong></span>}
                      {lead.months_selected && lead.months_selected.length > 0 && (
                        <span>Mois: <strong className="text-[#1a1918]">{lead.months_selected.join(', ')}</strong></span>
                      )}
                      {lead.domains_selected && lead.domains_selected.length > 0 && (
                        <span>Domaines: <strong className="text-[#1a1918]">{lead.domains_selected.join(', ')}</strong></span>
                      )}
                      {lead.verdict && <span>Verdict: <strong className="text-[#1a1918]">{lead.verdict}</strong></span>}
                      {lead.reminder_step > 0 && <span>Relance #{lead.reminder_step}</span>}
                    </div>
                    {lead.notes && <p className="text-xs text-zinc-400 mt-1 italic">{lead.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lead.status !== 'applied' && lead.status !== 'closed' && (
                      <>
                        <button
                          onClick={() => void markApplied(lead.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-green-50 text-[#0d9e75] hover:bg-green-100 transition-colors font-medium"
                        >
                          Candidaté
                        </button>
                        <button
                          onClick={() => void relaunch(lead.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Relancer
                        </button>
                        <button
                          onClick={() => void closeLead(lead.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
                        >
                          Fermer
                        </button>
                      </>
                    )}
                    {lead.applied_at && (
                      <span className="text-xs text-zinc-400">{new Date(lead.applied_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
