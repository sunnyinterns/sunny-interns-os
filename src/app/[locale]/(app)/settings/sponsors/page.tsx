'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Sponsor {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  city: string | null
  nib: string | null
  npwp: string | null
  notes: string | null
  is_active: boolean
}

const EMPTY = {
  company_name: '', contact_name: '', contact_email: '',
  contact_whatsapp: '', city: 'Bali', nib: '', npwp: '', notes: '',
}
const cls = "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"

export default function SponsorsPage() {
  const router = useRouter()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sponsor | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/sponsors')
    if (r.ok) setSponsors(await r.json() as Sponsor[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowModal(true) }
  function openEdit(s: Sponsor) {
    setEditing(s)
    setForm({ company_name: s.company_name, contact_name: s.contact_name ?? '', contact_email: s.contact_email ?? '', contact_whatsapp: s.contact_whatsapp ?? '', city: s.city ?? 'Bali', nib: s.nib ?? '', npwp: s.npwp ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editing ? `/api/sponsors/${editing.id}` : '/api/sponsors'
    const method = editing ? 'PATCH' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setShowModal(false); void load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce sponsor ?')) return
    await fetch(`/api/sponsors/${id}`, { method: 'DELETE' })
    void load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700 mb-6 block">← Paramètres</button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">🏛️ Sponsors PT</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Sociétés PT locales requises pour parrainer le VITAS stagiaire</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-xl hover:bg-[#b8945a]">+ Ajouter</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
      ) : sponsors.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-2xl mb-3">🏛️</p>
          <p className="text-zinc-500 text-sm font-medium mb-1">Aucun sponsor configuré</p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">Les sponsors PT locales sont nécessaires pour toutes les entreprises étrangères souhaitant accueillir des stagiaires via le VITAS.</p>
          <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm rounded-xl">+ Premier sponsor</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map(s => (
            <div key={s.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center font-bold text-[#c8a96e] text-lg flex-shrink-0">
                {s.company_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1918]">{s.company_name}</p>
                <p className="text-xs text-zinc-400">
                  {[s.city, s.contact_name, s.nib ? `NIB: ${s.nib}` : null, s.npwp ? `NPWP: ${s.npwp}` : null].filter(Boolean).join(' · ')}
                </p>
                {(s.contact_email || s.contact_whatsapp) && (
                  <p className="text-xs text-zinc-400">{[s.contact_email, s.contact_whatsapp].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200">Modifier</button>
                <button onClick={() => void handleDelete(s.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-base">{editing ? 'Modifier le sponsor' : 'Nouveau sponsor PT'}</h2>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la société *</label>
              <input value={form.company_name} onChange={e => setForm(p => ({...p, company_name: e.target.value}))} className={cls} placeholder="PT Bali Solutions" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                <input value={form.nib ?? ''} onChange={e => setForm(p => ({...p, nib: e.target.value}))} className={cls} placeholder="Nomor Induk Berusaha" />
                <p className="text-[10px] text-zinc-400 mt-0.5">N° identification commerciale</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                <input value={form.npwp ?? ''} onChange={e => setForm(p => ({...p, npwp: e.target.value}))} className={cls} placeholder="XX.XXX.XXX.X-XXX.XXX" />
                <p className="text-[10px] text-zinc-400 mt-0.5">N° fiscal indonésien</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
              <input value={form.city ?? ''} onChange={e => setForm(p => ({...p, city: e.target.value}))} className={cls} placeholder="Bali" />
            </div>

            <div className="border-t border-zinc-100 pt-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom du contact</label>
                  <input value={form.contact_name ?? ''} onChange={e => setForm(p => ({...p, contact_name: e.target.value}))} className={cls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                  <input type="email" value={form.contact_email ?? ''} onChange={e => setForm(p => ({...p, contact_email: e.target.value}))} className={cls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                  <input value={form.contact_whatsapp ?? ''} onChange={e => setForm(p => ({...p, contact_whatsapp: e.target.value}))} className={cls} placeholder="+62…" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Notes internes</label>
              <textarea value={form.notes ?? ''} onChange={e => setForm(p => ({...p, notes: e.target.value}))} className={cls} rows={2} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-500">Annuler</button>
              <button onClick={() => void handleSave()} disabled={saving || !form.company_name.trim()} className="flex-1 py-2 bg-[#c8a96e] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? '…' : editing ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
