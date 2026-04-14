'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface City {
  id: string
  name: string
  area: string
  description?: string | null
  is_active: boolean
  sort_order?: number | null
}

const AREAS = ['South Bali','Central Bali','Bukit Peninsula','Capital','North Bali','East Bali']

export default function InternshipCitiesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formArea, setFormArea] = useState(AREAS[0])
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/internship-cities')
    if (res.ok) {
      const data = await res.json() as City[]
      setCities(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function startEdit(c: City) {
    setEditingId(c.id)
    setFormName(c.name)
    setFormArea(c.area)
    setFormDescription(c.description ?? '')
    setFormSortOrder(String(c.sort_order ?? 0))
    setShowForm(true)
  }

  function startCreate() {
    setEditingId(null)
    setFormName('')
    setFormArea(AREAS[0])
    setFormDescription('')
    setFormSortOrder('0')
    setShowForm(true)
  }

  function cancelForm() { setShowForm(false); setEditingId(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    const payload = {
      name: formName.trim(),
      area: formArea,
      description: formDescription.trim() || null,
      sort_order: parseInt(formSortOrder, 10) || 0,
      is_active: true,
    }
    const res = editingId
      ? await fetch(`/api/internship-cities/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/internship-cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      showToast(editingId ? 'Ville modifiée' : 'Ville créée')
      cancelForm()
      void load()
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast(d.error ?? 'Erreur')
    }
    setSaving(false)
  }

  async function toggleActive(c: City) {
    const res = await fetch(`/api/internship-cities/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    if (res.ok) void load()
  }

  async function deleteCity(c: City) {
    if (!confirm(`Supprimer "${c.name}" ?`)) return
    const res = await fetch(`/api/internship-cities/${c.id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Ville supprimée'); void load() }
    else { const d = await res.json().catch(() => ({})) as { error?: string }; showToast(d.error ?? 'Erreur') }
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  const grouped = AREAS.map(area => ({ area, cities: cities.filter(c => c.area === area) }))
    .filter(g => g.cities.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">{toastMsg}</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/${locale}/settings`} className="text-xs text-zinc-400 hover:text-zinc-600 mb-1 block">&larr; Retour aux paramètres</Link>
          <h1 className="text-xl font-bold text-[#1a1918]">Villes de stage</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gérez les villes disponibles pour les offres et les entreprises</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a]">+ Nouvelle ville</button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#c8a96e]/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">{editingId ? 'Modifier la ville' : 'Nouvelle ville'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
              <input className={inputCls} value={formName} onChange={e => setFormName(e.target.value)} required autoFocus placeholder="Canggu" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Zone *</label>
              <select className={inputCls} value={formArea} onChange={e => setFormArea(e.target.value)}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
              <input className={inputCls} value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Ambiance surf et digital nomad…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Ordre (tri)</label>
              <input type="number" className={inputCls} value={formSortOrder} onChange={e => setFormSortOrder(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving || !formName.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}</button>
              <button type="button" onClick={cancelForm} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : cities.length === 0 ? (
        <div className="text-center py-12"><p className="text-lg font-medium text-[#1a1918] mb-1">Aucune ville</p><p className="text-sm text-zinc-400">Créez votre première ville</p></div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ area, cities: areaCities }) => (
            <div key={area}>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{area}</h3>
              <div className="space-y-2">
                {areaCities.map(c => (
                  <div key={c.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-4 ${c.is_active ? 'border-zinc-100' : 'border-zinc-100 opacity-50'}`}>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">📍</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1a1918]">{c.name}</p>
                        {!c.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">Inactif</span>}
                      </div>
                      {c.description && <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => void toggleActive(c)} className={`w-10 h-6 rounded-full relative ${c.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => startEdit(c)} className="p-1.5 text-zinc-400 hover:text-[#c8a96e] rounded-lg hover:bg-zinc-50">✎</button>
                      <button onClick={() => void deleteCity(c)} className="p-1.5 text-zinc-400 hover:text-[#dc2626] rounded-lg hover:bg-red-50">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
