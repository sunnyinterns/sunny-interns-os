'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface EnAttenteItem {
  id: string
  type: string
  waiting_for?: string | null
  case_id?: string | null
  label?: string | null
  due_date?: string | null
  created_at: string
  resolved_at?: string | null
  cases?: {
    id: string
    status: string
    interns?: { first_name: string; last_name: string } | null
  } | null
}

type WaitingForKey = 'intern' | 'employer' | 'school' | 'agent' | 'manager'

const WAITING_FOR_LABELS: Record<WaitingForKey, { label: string; color: string; icon: string; badgeCls: string }> = {
  intern:   { label: 'En attente du stagiaire',     color: '#f59e0b', icon: '👤', badgeCls: 'bg-amber-100 text-amber-700' },
  employer: { label: 'En attente de l\'employeur',  color: '#3b82f6', icon: '🏢', badgeCls: 'bg-blue-100 text-blue-700' },
  school:   { label: 'En attente de l\'école',      color: '#8b5cf6', icon: '🎓', badgeCls: 'bg-purple-100 text-purple-700' },
  agent:    { label: 'En attente de l\'agent',      color: '#f97316', icon: '🔏', badgeCls: 'bg-orange-100 text-orange-700' },
  manager:  { label: 'Action manager requise',      color: '#ef4444', icon: '⚡', badgeCls: 'bg-red-100 text-red-700' },
}

const WAITING_TYPE_LABELS: Record<string, string> = {
  cv:                 'Upload CV',
  engagement_letter:  'Signature lettre d\'engagement',
  employer_response:  'Décision employeur sur le CV',
  convention:         'Convention de stage',
  visa_docs:          'Documents visa',
  flight_info:        'Infos vol pour le chauffeur',
  payment:            'Confirmation paiement',
  sponsor_contract:   'Signature contrat sponsor',
  job_match:          'Job à matcher',
  rdv_to_confirm:     'RDV à confirmer',
  qualification:      'Qualification en attente',
  recontact:          'À recontacter',
}

// Derive waiting_for from type if column missing
function deriveWaitingFor(item: EnAttenteItem): WaitingForKey {
  if (item.waiting_for && item.waiting_for in WAITING_FOR_LABELS) {
    return item.waiting_for as WaitingForKey
  }
  const map: Record<string, WaitingForKey> = {
    cv: 'intern', engagement_letter: 'intern', convention: 'school',
    visa_docs: 'intern', flight_info: 'intern', payment: 'intern',
    employer_response: 'employer', sponsor_contract: 'employer',
    visa: 'agent',
  }
  return map[item.type] ?? 'manager'
}

function isDueOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

function formatDue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = d.getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return `${Math.abs(days)}j de retard`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days}j`
}

export default function EnAttentePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [items, setItems] = useState<EnAttenteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/en-attente')
      .then(r => r.ok ? r.json() : [])
      .then((d: EnAttenteItem[]) => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleResolve(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setResolving(id)
    try {
      const res = await fetch(`/api/en-attente/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
      }
    } finally {
      setResolving(null)
    }
  }

  // Group by waiting_for
  const grouped = new Map<WaitingForKey, EnAttenteItem[]>()
  for (const key of Object.keys(WAITING_FOR_LABELS) as WaitingForKey[]) {
    grouped.set(key, [])
  }
  for (const item of items) {
    const key = deriveWaitingFor(item)
    grouped.get(key)!.push(item)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#1a1918]">En Attente</h1>
        {items.length > 0 && (
          <span className="bg-zinc-200 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Items blocked on an external actor — intern, employer, school, visa agent, or manager.
      </p>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">Nothing waiting — all clear</p>
        </div>
      )}

      {!loading && (Array.from(grouped.entries()) as [WaitingForKey, EnAttenteItem[]][]).map(([key, groupItems]) => {
        if (groupItems.length === 0) return null
        const cfg = WAITING_FOR_LABELS[key]
        return (
          <div key={key} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-sm font-semibold text-[#1a1918]">{cfg.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>
                  {groupItems.length}
                </span>
              </div>
            </div>

            <div className="divide-y divide-zinc-50">
              {groupItems.map(item => {
                const name = item.cases?.interns
                  ? `${item.cases.interns.first_name} ${item.cases.interns.last_name}`
                  : item.case_id ?? item.id
                const typeLabel = WAITING_TYPE_LABELS[item.type] ?? item.label ?? item.type
                const overdue = isDueOverdue(item.due_date)
                const dueLabel = formatDue(item.due_date)
                const href = item.case_id ? `/${locale}/cases/${item.case_id}` : '#'

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1918] truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-500">{typeLabel}</span>
                        {dueLabel && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                            {dueLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => void handleResolve(e, item.id)}
                      disabled={resolving === item.id}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium transition-colors disabled:opacity-50"
                    >
                      {resolving === item.id ? '…' : 'Mark resolved'}
                    </button>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
