'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EnAttenteItem {
  id: string
  type: string
  case_id?: string
  label: string
  created_at: string
  resolved_at?: string
  case?: {
    id: string
    intern?: { first_name: string; last_name: string }
    status: string
  }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  cv: { label: 'CV', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  sponsor_contract: { label: 'Contrat sponsor', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  employer_response: { label: 'Réponse employeur', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  visa: { label: 'Visa', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  payment: { label: 'Paiement', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
}

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days}j`
}

export default function EnAttentePage() {
  const [items, setItems] = useState<EnAttenteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/en-attente')
      .then(r => r.ok ? r.json() : [])
      .then((d: EnAttenteItem[]) => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const grouped = items.reduce<Record<string, EnAttenteItem[]>>((acc, item) => {
    const key = item.type || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">En Attente</h1>
        {items.length > 0 && (
          <span className="bg-zinc-200 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-6">Éléments en attente d&apos;une action externe (candidat, employeur, agent visa...)</p>

      {loading && <p className="text-zinc-400 text-sm">Chargement...</p>}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">Aucun élément en attente</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, typeItems]) => {
        const config = TYPE_CONFIG[type] ?? { label: type, color: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-200' }
        return (
          <section key={type} className="mb-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {config.label} ({typeItems.length})
            </h2>
            <div className="space-y-2">
              {typeItems.map(item => {
                const name = item.case?.intern
                  ? `${item.case.intern.first_name} ${item.case.intern.last_name}`
                  : item.case_id ?? item.id
                const href = item.case_id ? `/fr/cases/${item.case_id}` : '#'
                return (
                  <Link key={item.id} href={href}
                    className={`flex items-center justify-between ${config.bg} border ${config.border} rounded-xl px-4 py-3 hover:opacity-80 transition-opacity`}>
                    <div>
                      <p className="text-sm font-medium text-[#1a1918]">{name}</p>
                      <p className={`text-xs mt-0.5 ${config.color}`}>{item.label || config.label} · {daysSince(item.created_at)}</p>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-300 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
