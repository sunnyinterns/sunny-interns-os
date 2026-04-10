'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  case_id: string
  intern_name: string | null
  type: string
  title: string
  description: string
  priority: string
  metadata: Record<string, unknown>
  source: string
  created_at: string
  icon: string
  color: string
  desired_jobs?: string[] | null
  desired_start_date?: string | null
  rdv_date?: string | null
}

type FilterKey = 'all' | 'emails' | 'payments' | 'visa' | 'statuts' | 'notes'

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tous', icon: '' },
  { key: 'emails', label: 'Emails', icon: '📧' },
  { key: 'payments', label: 'Paiements', icon: '💳' },
  { key: 'visa', label: 'Visa', icon: '🛂' },
  { key: 'statuts', label: 'Statuts', icon: '🔄' },
  { key: 'notes', label: 'Notes', icon: '💬' },
]

function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Hier'
  if (days < 7) return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long' })
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function groupByDay(items: ActivityItem[]): { label: string; count: number; items: ActivityItem[] }[] {
  const groups: Map<string, ActivityItem[]> = new Map()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const item of items) {
    const d = new Date(item.created_at)
    let key: string
    if (d.toDateString() === today.toDateString()) {
      key = "Aujourd'hui"
    } else if (d.toDateString() === yesterday.toDateString()) {
      key = 'Hier'
    } else {
      key = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      key = key.charAt(0).toUpperCase() + key.slice(1)
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, count: items.length, items }))
}


function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMonth(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

interface Props {
  locale?: string
  showFilters?: boolean
  initialLimit?: number
}

export function ActivityFeed({ locale = 'fr', showFilters = true, initialLimit = 30 }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchItems = useCallback(async (pageNum: number, typeFilter: FilterKey, append: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(initialLimit), page: String(pageNum) })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/activity-feed/global?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json() as ActivityItem[]
      setItems(prev => append ? [...prev, ...data] : data)
      setHasMore(data.length >= initialLimit)
    } catch {
      if (!append) setItems([])
    } finally {
      setLoading(false)
    }
  }, [initialLimit])

  useEffect(() => {
    setPage(1)
    void fetchItems(1, filter, false)
  }, [filter, fetchItems])

  function loadMore() {
    const next = page + 1
    setPage(next)
    void fetchItems(next, filter, true)
  }

  const groups = groupByDay(items)

  return (
    <div>
      {/* Filtres */}
      {showFilters && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                filter === f.key
                  ? 'bg-[#1a1918] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              ].join(' ')}
            >
              {f.icon && <span className="mr-1">{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-medium text-[#1a1918]">Aucune activité</p>
          <p className="text-xs text-zinc-400 mt-1">Tout est à jour !</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              {/* Séparateur jour */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-[11px] text-zinc-300">({group.count})</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors group cursor-default"
                  >
                    {/* Icône */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ backgroundColor: `${item.color || '#c8a96e'}18` }}
                    >
                      {item.icon || '📋'}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1918] leading-snug">{item.title}</p>
                      {item.description && item.description !== item.title && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      {/* Infos enrichies pour case_created */}
                      {item.type === 'case_created' && (item.desired_jobs?.length || item.desired_start_date || item.rdv_date) && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.rdv_date && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full">
                              📅 RDV {formatDate(item.rdv_date)}
                            </span>
                          )}
                          {item.desired_jobs?.slice(0, 3).map((job, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#c8a96e]/10 text-[#8a6a2a] text-[10px] font-medium rounded-full">
                              {job}
                            </span>
                          ))}
                          {item.desired_start_date && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-medium rounded-full">
                              🛫 {formatMonth(item.desired_start_date)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.intern_name && (
                          <>
                            <span className="text-xs text-zinc-500 font-medium">{item.intern_name}</span>
                            <span className="text-zinc-300">·</span>
                          </>
                        )}
                        <Link
                          href={`/${locale}/cases/${item.case_id}`}
                          className="text-xs text-[#c8a96e] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Voir le dossier →
                        </Link>
                      </div>
                    </div>

                    {/* Heure */}
                    <span className="text-[11px] text-zinc-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Voir précédent */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-zinc-500 bg-zinc-100 rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Chargement…
                  </>
                ) : (
                  <>↑ Voir précédent</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
