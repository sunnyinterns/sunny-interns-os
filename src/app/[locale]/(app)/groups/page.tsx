'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface InternGroup {
  id: string
  name: string
  departure_month?: string | null
  target_arrival_date?: string | null
  driver_name?: string | null
  driver_whatsapp?: string | null
  notes?: string | null
  member_count?: number
  members?: GroupMember[]
}

interface GroupMember {
  id: string
  case_id: string
  first_name?: string
  last_name?: string
  arrival_date?: string | null
}

interface Case {
  id: string
  first_name?: string
  last_name?: string
  arrival_date?: string | null
  intern_group_id?: string | null
  status: string
}

export default function GroupsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [groups, setGroups] = useState<InternGroup[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', target_arrival_date: '', driver_name: '', driver_whatsapp: '' })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      fetch('/api/intern-groups').then((r) => r.ok ? r.json() as Promise<InternGroup[]> : Promise.resolve([])),
      fetch('/api/cases?status=active,arrival_prep,visa_received,payment_received').then((r) => r.ok ? r.json() as Promise<Case[]> : Promise.resolve([])),
    ]).then(([g, c]) => {
      setGroups(g)
      setCases(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  async function createGroup() {
    if (!newGroup.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/intern-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      })
      if (res.ok) {
        const created = await res.json() as InternGroup
        setGroups((prev) => [...prev, created])
        setNewGroup({ name: '', target_arrival_date: '', driver_name: '', driver_whatsapp: '' })
        setShowCreate(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function dateDiffDays(a: string, b: string): number {
    return Math.abs(Math.floor((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)))
  }

  function dateProximityColor(arrival: string | null | undefined, target: string | null | undefined): string {
    if (!arrival || !target) return '#9ca3af'
    const diff = dateDiffDays(arrival, target)
    if (diff <= 2) return '#0d9e75'
    if (diff <= 7) return '#d97706'
    return '#6b7280'
  }

  // Ungrouped cases (those without a group)
  const ungrouped = cases.filter((c) => !c.intern_group_id && c.arrival_date)
    .sort((a, b) => (a.arrival_date ?? '').localeCompare(b.arrival_date ?? ''))

  void locale

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Groupes de départ</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Coordonne les arrivées et chauffeurs</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-semibold rounded-xl transition-all"
        >
          + Nouveau groupe
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-4">Nouveau groupe</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Nom du groupe *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                placeholder="Ex: Groupe Juillet 2026"
                value={newGroup.name}
                onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date d'arrivée cible</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                value={newGroup.target_arrival_date}
                onChange={(e) => setNewGroup((p) => ({ ...p, target_arrival_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Chauffeur</label>
              <input
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                placeholder="Nom du chauffeur"
                value={newGroup.driver_name}
                onChange={(e) => setNewGroup((p) => ({ ...p, driver_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">WhatsApp chauffeur</label>
              <input
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                placeholder="+62 812..."
                value={newGroup.driver_whatsapp}
                onChange={(e) => setNewGroup((p) => ({ ...p, driver_whatsapp: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700">Annuler</button>
            <button
              disabled={saving || !newGroup.name.trim()}
              onClick={() => void createGroup()}
              className="px-4 py-2 text-sm bg-[#c8a96e] text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Création…' : 'Créer le groupe'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
          <p className="text-4xl mb-3">🚌</p>
          <p className="text-zinc-500 text-sm">Aucun groupe créé</p>
          <p className="text-zinc-300 text-xs mt-1">Crée un groupe pour coordonner les arrivées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center text-lg">🚌</div>
                  <div className="text-left">
                    <p className="font-semibold text-[#1a1918] text-sm">{group.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {group.target_arrival_date && (
                        <span className="text-xs text-zinc-400">
                          📅 {new Date(group.target_arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {group.driver_name && (
                        <span className="text-xs text-zinc-400">🚗 {group.driver_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {group.members && group.members.length > 0 && (
                    <span className="px-2.5 py-1 bg-[#c8a96e]/10 text-[#c8a96e] text-xs font-bold rounded-full">
                      {group.members.length} stagiaires
                    </span>
                  )}
                  <svg
                    width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    className={`text-zinc-400 transition-transform ${expandedId === group.id ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === group.id && group.members && group.members.length > 0 && (
                <div className="border-t border-zinc-100 px-5 py-3 space-y-2">
                  {group.members.map((m) => {
                    const color = dateProximityColor(m.arrival_date, group.target_arrival_date)
                    return (
                      <div key={m.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#1a1918] font-medium">
                          {m.first_name} {m.last_name}
                        </span>
                        {m.arrival_date && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">
                              {new Date(m.arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            {group.target_arrival_date && (
                              <span className="text-xs font-medium" style={{ color }}>
                                {dateDiffDays(m.arrival_date, group.target_arrival_date) === 0
                                  ? '✓ Même jour'
                                  : `±${dateDiffDays(m.arrival_date, group.target_arrival_date)}j`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ungrouped cases */}
      {ungrouped.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Sans groupe ({ungrouped.length})
          </h2>
          <div className="bg-white rounded-2xl border border-dashed border-zinc-200 divide-y divide-zinc-100">
            {ungrouped.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[#1a1918]">{c.first_name} {c.last_name}</span>
                {c.arrival_date && (
                  <span className="text-xs text-zinc-400">
                    {new Date(c.arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
