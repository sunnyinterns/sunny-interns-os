'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface School {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  is_priority: boolean
  total_staffed_interns: number
  school_programs?: { id: string; program_name: string; level: string; is_active: boolean }[]
  school_sessions?: { id: string; session_label: string; start_month: string | null; expected_students: number | null }[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: 'bg-pink-100 text-pink-700',
  Business: 'bg-blue-100 text-blue-700',
  Ingenieur: 'bg-green-100 text-green-700',
  Commerce: 'bg-purple-100 text-purple-700',
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', country: 'France', category: 'Business', website: '', is_priority: false })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/schools')
    setSchools(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowModal(false); setForm({ name: '', city: '', country: 'France', category: 'Business', website: '', is_priority: false }); void load() }
    setSaving(false)
  }

  const filtered = schools.filter((s) => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)
    const matchPriority = !filterPriority || s.is_priority
    return matchSearch && matchPriority
  })

  const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Écoles</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{schools.length} école{schools.length !== 1 ? 's' : ''} · {schools.filter(s => s.is_priority).length} prioritaires</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors">
          + Nouvelle école
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input
          type="text"
          placeholder="Rechercher une école…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-56"
        />
        <button
          onClick={() => setFilterPriority(p => !p)}
          className={['px-3 py-2 text-sm rounded-lg border transition-colors', filterPriority ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e] font-medium' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'].join(' ')}
        >
          Prioritaires uniquement
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucune école</p>
          <p className="text-sm">Ajoutez les écoles partenaires</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const activePrograms = s.school_programs?.filter(p => p.is_active).length ?? 0
            const activeSessions = s.school_sessions?.length ?? 0
            return (
              <Link key={s.id} href={`/fr/schools/${s.id}`} className="block bg-white border border-zinc-100 rounded-xl px-4 py-3 hover:border-zinc-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-500 text-sm font-semibold">{s.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#1a1918]">{s.name}</p>
                      {s.is_priority && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#c8a96e]/20 text-[#c8a96e] font-medium">Prioritaire</span>
                      )}
                      {s.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[s.category] ?? 'bg-zinc-100 text-zinc-600'}`}>{s.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {[s.city, s.country].filter(Boolean).join(', ')}
                      {activePrograms > 0 && ` · ${activePrograms} programme${activePrograms > 1 ? 's' : ''}`}
                      {activeSessions > 0 && ` · ${activeSessions} session${activeSessions > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 flex-shrink-0">
                    {s.total_staffed_interns > 0 && (
                      <p className="font-medium text-[#0d9e75]">{s.total_staffed_interns} stagiaire{s.total_staffed_interns > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle école</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                <input required className={inputCls + ' w-full'} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                  <input className={inputCls} value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Pays</label>
                  <input className={inputCls} value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                  <select className={inputCls} value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Ingenieur">Ingénieur</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                  <input type="url" className={inputCls} placeholder="https://…" value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_priority} onChange={e => setForm(p => ({...p, is_priority: e.target.checked}))} className="rounded" />
                <span className="text-sm text-[#1a1918]">École prioritaire (lead enrichment)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
