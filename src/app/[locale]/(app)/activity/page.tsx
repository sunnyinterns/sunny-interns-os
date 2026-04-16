'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ActivityEvent {
  id: string
  type: string
  title: string
  description: string
  intern_name?: string
  case_id?: string
  created_at: string
  icon_type: string
}

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'status', label: 'Statuts' },
  { key: 'email', label: 'Emails' },
  { key: 'document', label: 'Documents' },
  { key: 'payment', label: 'Paiements' },
  { key: 'visa', label: 'Visas' },
  { key: 'job', label: 'Jobs' },
]

const ICON_STYLES: Record<string, { bg: string; text: string; letter: string }> = {
  status: { bg: 'bg-slate-100', text: 'text-slate-500', letter: 'S' },
  email: { bg: 'bg-blue-100', text: 'text-blue-600', letter: 'E' },
  wait: { bg: 'bg-amber-100', text: 'text-amber-600', letter: 'W' },
  job: { bg: 'bg-emerald-100', text: 'text-emerald-600', letter: 'J' },
  payment: { bg: 'bg-green-100', text: 'text-green-700', letter: '€' },
  visa: { bg: 'bg-orange-100', text: 'text-orange-600', letter: 'V' },
  document: { bg: 'bg-purple-100', text: 'text-purple-600', letter: 'D' },
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'hier'
  return `il y a ${days}j`
}

function dateGroup(d: string): string {
  const now = new Date()
  const date = new Date(d)
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return 'Cette semaine'
  return 'Plus tot'
}

export default function ActivityPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events ?? []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const filtered = events.filter(e => {
    if (filter !== 'all') {
      if (filter === 'status' && e.icon_type !== 'status') return false
      if (filter === 'email' && e.icon_type !== 'email') return false
      if (filter === 'document' && e.icon_type !== 'document') return false
      if (filter === 'payment' && e.icon_type !== 'payment') return false
      if (filter === 'visa' && e.icon_type !== 'visa') return false
      if (filter === 'job' && e.icon_type !== 'job') return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return (e.intern_name?.toLowerCase().includes(q)) || e.title.toLowerCase().includes(q)
    }
    return true
  })

  // Group by date
  const groups: { label: string; items: ActivityEvent[] }[] = []
  let lastGroup = ''
  for (const e of filtered) {
    const g = dateGroup(e.created_at)
    if (g !== lastGroup) {
      groups.push({ label: g, items: [] })
      lastGroup = g
    }
    groups[groups.length - 1].items.push(e)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      <div className="w-full px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1a1918]">Activite</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === f.key ? 'bg-[#1a1918] text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
              }`}>
              {f.label}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom..."
            className="ml-auto px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-600 placeholder-zinc-400 w-48 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]"
          />
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-100 rounded w-1/3" />
                  <div className="h-3 bg-zinc-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-400">Aucun evenement trouve</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(e => {
                    const style = ICON_STYLES[e.icon_type] ?? ICON_STYLES.status
                    return (
                      <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${style.bg} ${style.text}`}>
                          {style.letter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1918]">{e.title}</p>
                          {e.description && <p className="text-xs text-zinc-400 mt-0.5 truncate">{e.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {e.intern_name && e.case_id && (
                              <Link href={`/${locale}/cases/${e.case_id}`} className="text-xs text-[#c8a96e] hover:underline">
                                {e.intern_name}
                              </Link>
                            )}
                            <span className="text-[11px] text-zinc-300">{timeAgo(e.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
