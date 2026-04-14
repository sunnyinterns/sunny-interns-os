'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CompanyType {
  id: string
  code: string
  name: string
  country: string
  description?: string | null
  is_active?: boolean
}

const COUNTRIES = ['Indonesia','France','Belgium','Switzerland','USA','UK','Thailand','Australia','Singapore','Other']

export default function CompanyTypesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [types, setTypes] = useState<CompanyType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formCountry, setFormCountry] = useState(COUNTRIES[0])
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/company-types')
    if (res.ok) {
      const data = await res.json() as CompanyType[]
      setTypes(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function startEdit(t: CompanyType) {
    setEditingId(t.id); setFormCode(t.code); setFormName(t.name); setFormCountry(t.country); setFormDescription(t.description ?? '')
    setShowForm(true)
  }

  function startCreate() {
    setEditingId(null); setFormCode(''); setFormName(''); setFormCountry(COUNTRIES[0]); setFormDescription('')
    setShowForm(true)
  }

  function cancelForm() { setShowForm(false); setEditingId(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formCode.trim() || !formName.trim()) return
    setSaving(true)
    const payload = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      country: formCountry,
      description: formDescription.trim() || null,
      is_active: true,
    }
    const res = editingId
      ? await fetch(`/api/company-types/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/company-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { showToast(editingId ? 'Type modifié' : 'Type créé'); cancelForm(); void load() }
    else { const d = await res.json().catch(() => ({})) as { error?: string }; showToast(d.error ?? 'Erreur') }
    setSaving(false)
  }

  async function deleteType(t: CompanyType) {
    if (!confirm(`Supprimer "${t.name}" ?`)) return
    const res = await fetch(`/api/company-types/${t.id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Type supprimé'); void load() }
    else { const d = await res.json().catch(() => ({})) as { error?: string }; showToast(d.error ?? 'Erreur') }
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  const grouped = COUNTRIES.map(country => ({ country, items: types.filter(t => t.country === country) })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">{toastMsg}</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/${locale}/settings`} className="text-xs text-zinc-400 hover:text-zinc-600 mb-1 block">&larr; Retour aux paramètres</Link>
          <h1 className="text-xl font-bold text-[#1a1918]">Types de sociétés</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Formes juridiques disponibles (PT, CV, SARL, SAS…) par pays</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a]">+ Nouveau type</button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#c8a96e]/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">{editingId ? 'Modifier le type' : 'Nouveau type de société'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Code *</label>
                <input className={inputCls} value={formCode} onChange={e => setFormCode(e.target.value)} required placeholder="PT_PMA" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Pays *</label>
                <select className={inputCls} value={formCountry} onChange={e => setFormCountry(e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom complet *</label>
              <input className={inputCls} value={formName} onChange={e => setFormName(e.target.value)} required placeholder="PT PMA (investissement étranger)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
              <textarea className={inputCls} rows={2} value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Conditions, capital minimum, etc." />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}</button>
              <button type="button" onClick={cancelForm} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : types.length === 0 ? (
        <div className="text-center py-12"><p className="text-lg font-medium text-[#1a1918] mb-1">Aucun type</p><p className="text-sm text-zinc-400">Créez votre premier type de société</p></div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ country, items }) => (
            <div key={country}>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{country}</h3>
              <div className="space-y-2">
                {items.map(t => (
                  <div key={t.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><span className="text-[#c8a96e] font-bold text-xs">{t.code.slice(0,3)}</span></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1a1918]">{t.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono">{t.code}</span>
                      </div>
                      {t.description && <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(t)} className="p-1.5 text-zinc-400 hover:text-[#c8a96e] rounded-lg hover:bg-zinc-50">✎</button>
                      <button onClick={() => void deleteType(t)} className="p-1.5 text-zinc-400 hover:text-[#dc2626] rounded-lg hover:bg-red-50">🗑</button>
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
