'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Sponsor {
  id: string; company_name: string; legal_type: string | null
  registration_number: string | null; nib: string | null; npwp: string | null
  address: string | null; city: string | null; country: string | null
  phone: string | null; website: string | null; logo_url: string | null
  contact_name: string | null; contact_role: string | null
  contact_email: string | null; contact_whatsapp: string | null
  notes: string | null; is_active: boolean
}
const EMPTY = {
  company_name: '', legal_type: 'PT', registration_number: '', nib: '', npwp: '',
  address: '', city: 'Bali', country: 'Indonesia', phone: '', website: '', logo_url: '',
  contact_name: '', contact_role: '', contact_email: '', contact_whatsapp: '', notes: '',
}
const cls = "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
const LEGAL_TYPES = ['PT','PT PMA','CV','Yayasan','UD','Autre']

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
    setForm({ company_name: s.company_name, legal_type: s.legal_type ?? 'PT', registration_number: s.registration_number ?? '', nib: s.nib ?? '', npwp: s.npwp ?? '', address: s.address ?? '', city: s.city ?? 'Bali', country: s.country ?? 'Indonesia', phone: s.phone ?? '', website: s.website ?? '', logo_url: s.logo_url ?? '', contact_name: s.contact_name ?? '', contact_role: s.contact_role ?? '', contact_email: s.contact_email ?? '', contact_whatsapp: s.contact_whatsapp ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const body = { ...form, nib: form.nib||null, npwp: form.npwp||null, registration_number: form.registration_number||null, address: form.address||null, phone: form.phone||null, website: form.website||null, logo_url: form.logo_url||null, contact_name: form.contact_name||null, contact_role: form.contact_role||null, contact_email: form.contact_email||null, contact_whatsapp: form.contact_whatsapp||null, notes: form.notes||null }
    const r = await fetch(editing ? `/api/sponsors/${editing.id}` : '/api/sponsors', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
          <p className="text-sm text-zinc-500 mt-0.5">PT locales requises pour le VITAS — leurs infos alimenteront les contrats de parrainage</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-xl hover:bg-[#b8945a]">+ Ajouter</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse"/>)}</div>
      ) : sponsors.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-2xl mb-3">🏛️</p>
          <p className="text-zinc-500 text-sm mb-1">Aucun sponsor configuré</p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">Les infos des sponsors alimenteront les contrats de parrainage VITAS.</p>
          <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm rounded-xl">+ Premier sponsor</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map(s => (
            <div key={s.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center font-bold text-[#c8a96e] text-xl flex-shrink-0 overflow-hidden">
                {s.logo_url ? <img src={s.logo_url} alt="" className="w-12 h-12 object-contain rounded-xl" onError={e=>{e.currentTarget.style.display='none'}}/> : s.company_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-[#1a1918]">{s.company_name}</p>
                  {s.legal_type && <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{s.legal_type}</span>}
                </div>
                <p className="text-xs text-zinc-400">{[s.address, s.city, s.country!=='Indonesia'?s.country:null].filter(Boolean).join(', ')}</p>
                <p className="text-xs text-zinc-400">{[s.nib?`NIB: ${s.nib}`:null, s.npwp?`NPWP: ${s.npwp}`:null, s.registration_number?`Reg: ${s.registration_number}`:null].filter(Boolean).join(' · ')}</p>
                {s.contact_name && <p className="text-xs text-zinc-500 mt-0.5">Contact : {s.contact_name}{s.contact_role?` (${s.contact_role})`:''}{s.contact_email?` — ${s.contact_email}`:''}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={()=>openEdit(s)} className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200">Modifier</button>
                <button onClick={()=>void handleDelete(s.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <h2 className="font-bold text-base">{editing?'Modifier le sponsor':'Nouveau sponsor PT'}</h2>

              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">① Société</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la société *</label>
                    <input value={form.company_name} onChange={e=>setForm(p=>({...p,company_name:e.target.value}))} className={cls} placeholder="PT Bali Solutions"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Type légal</label>
                      <select value={form.legal_type} onChange={e=>setForm(p=>({...p,legal_type:e.target.value}))} className={cls}>
                        {LEGAL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° enregistrement</label>
                      <input value={form.registration_number} onChange={e=>setForm(p=>({...p,registration_number:e.target.value}))} className={cls}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                      <input value={form.nib} onChange={e=>setForm(p=>({...p,nib:e.target.value}))} className={cls} placeholder="Nomor Induk Berusaha"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                      <input value={form.npwp} onChange={e=>setForm(p=>({...p,npwp:e.target.value}))} className={cls} placeholder="XX.XXX.XXX.X-XXX.XXX"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse complète</label>
                    <textarea value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className={cls} rows={2} placeholder="Jl. Raya Canggu No.1, Kerobokan, Bali 80361"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                      <input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} className={cls} placeholder="Bali"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Pays</label>
                      <input value={form.country} onChange={e=>setForm(p=>({...p,country:e.target.value}))} className={cls} placeholder="Indonesia"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label>
                      <input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={cls} placeholder="+62…"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                      <input type="url" value={form.website} onChange={e=>setForm(p=>({...p,website:e.target.value}))} className={cls} placeholder="https://…"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">URL Logo</label>
                    <input type="url" value={form.logo_url} onChange={e=>setForm(p=>({...p,logo_url:e.target.value}))} className={cls} placeholder="https://…/logo.png"/>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">② Contact associé</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                      <input value={form.contact_name} onChange={e=>setForm(p=>({...p,contact_name:e.target.value}))} className={cls} placeholder="Budi Santoso"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Rôle / Poste</label>
                      <input value={form.contact_role} onChange={e=>setForm(p=>({...p,contact_role:e.target.value}))} className={cls} placeholder="Directeur, DRH…"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                      <input type="email" value={form.contact_email} onChange={e=>setForm(p=>({...p,contact_email:e.target.value}))} className={cls}/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                      <input value={form.contact_whatsapp} onChange={e=>setForm(p=>({...p,contact_whatsapp:e.target.value}))} className={cls} placeholder="+62…"/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes internes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={cls} rows={2} placeholder="Informations complémentaires…"/>
              </div>

              <div className="flex gap-3 pt-2 border-t border-zinc-100">
                <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500">Annuler</button>
                <button onClick={()=>void handleSave()} disabled={saving||!form.company_name.trim()} className="flex-1 py-2.5 bg-[#c8a96e] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving?'…':editing?'Sauvegarder':'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
