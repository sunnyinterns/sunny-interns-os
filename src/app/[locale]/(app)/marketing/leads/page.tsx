'use client'
import { useEffect, useState } from 'react'

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: string | null
  status: string | null
  score: number | null
  best_month: string | null
  created_at: string
  deadline_to_apply: string | null
  applied: boolean | null
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-green-100 text-[#0d9e75]',
  lost: 'bg-red-100 text-red-600',
  nurturing: 'bg-purple-100 text-purple-700',
}

export default function MarketingLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.ok ? r.json() : [])
      .then((d: Lead[]) => { setLeads(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = leads.filter(l => {
    const matchSearch = !search || (l.email + (l.first_name ?? '') + (l.last_name ?? '')).toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  const scoreColor = (s: number | null) =>
    !s ? 'text-zinc-300' : s >= 80 ? 'text-[#0d9e75] font-bold' : s >= 50 ? 'text-[#c8a96e] font-semibold' : 'text-zinc-400'

  // KPIs
  const total = leads.length
  const converted = leads.filter(l => l.applied || l.status === 'converted').length
  const hot = leads.filter(l => (l.score ?? 0) >= 80).length
  const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-[#fafaf7] pb-12">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1a1918]">Leads gen</h1>
          <p className="text-sm text-zinc-400">Leads site web et formulaires — score et suivi</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { l: 'Total leads', v: total, c: 'text-[#1a1918]' },
            { l: 'Leads chauds (≥80)', v: hot, c: 'text-[#c8a96e]' },
            { l: 'Convertis', v: converted, c: 'text-[#0d9e75]' },
            { l: 'Taux conversion', v: `${convRate}%`, c: 'text-[#1a1918]' },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white border border-zinc-100 rounded-2xl p-4">
              <p className="text-xs text-zinc-400 mb-1">{l}</p>
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher email, nom…"
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="new">🆕 Nouveau</option>
            <option value="contacted">📞 Contacté</option>
            <option value="nurturing">🌱 Nurturing</option>
            <option value="converted">✅ Converti</option>
            <option value="lost">❌ Perdu</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400"><p className="text-3xl mb-2">🧲</p><p>Aucun lead</p></div>
        ) : (
          <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Mois souhaité</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1a1918] truncate max-w-[160px]">
                        {lead.first_name ? `${lead.first_name} ${lead.last_name ?? ''}` : lead.email}
                      </p>
                      {lead.first_name && <p className="text-xs text-zinc-400 truncate">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{lead.source ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{lead.best_month ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${scoreColor(lead.score)}`}>{lead.score ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.applied ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-[#0d9e75] font-medium">✅ Candidaté</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status ?? 'new'] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {lead.status ?? 'new'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
