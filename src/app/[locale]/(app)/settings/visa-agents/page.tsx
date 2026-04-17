'use client'
import { useEffect, useState } from 'react'
import { AddressAutocomplete, type AddressResult } from '@/components/ui/AddressAutocomplete'

interface VisaAgent {
  id: string
  company_name: string | null
  contact_name: string | null
  email: string | null
  contact_emails: string[] | null
  whatsapp: string | null
  phone: string | null
  address: string | null
  address_street: string | null
  address_postal_code: string | null
  address_city: string | null
  address_country: string | null
  city: string | null
  country: string | null
  address_google_place_id: string | null
  registration_number: string | null
  tax_number: string | null
  website: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_swift: string | null
  portal_token: string | null
  is_active: boolean
  is_default: boolean
  notes: string | null
}

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

type Form = {
  company_name: string; contact_name: string
  address_street: string; address_postal_code: string; address_city: string; address_country: string
  address_google_place_id: string
  registration_number: string; tax_number: string; website: string
  whatsapp: string; phone: string
  contact_emails: string[]
  bank_name: string; bank_account_number: string; bank_account_holder: string; bank_swift: string
  notes: string; is_active: boolean; is_default: boolean
}

const EMPTY: Form = {
  company_name: '', contact_name: '',
  address_street: '', address_postal_code: '', address_city: '', address_country: 'Indonesia',
  address_google_place_id: '',
  registration_number: '', tax_number: '', website: '',
  whatsapp: '', phone: '',
  contact_emails: [''],
  bank_name: '', bank_account_number: '', bank_account_holder: '', bank_swift: '',
  notes: '', is_active: true, is_default: false,
}

export default function VisaAgentsPage() {
  const [agents, setAgents] = useState<VisaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<VisaAgent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [activeTab, setActiveTab] = useState<'general'|'banking'|'portal'>('general')
  const [confirmDelete, setConfirmDelete] = useState<VisaAgent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/settings/visa-agents')
    setAgents(r.ok ? await r.json() : [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditing(null); setForm(EMPTY); setActiveTab('general'); setShowModal(true)
  }

  function openEdit(a: VisaAgent) {
    setEditing(a)
    const emails = a.contact_emails?.filter(Boolean) ?? (a.email ? [a.email] : [''])
    setForm({
      company_name: a.company_name ?? '',
      contact_name: a.contact_name ?? '',
      address_street: a.address_street ?? a.address ?? '',
      address_postal_code: a.address_postal_code ?? '',
      address_city: a.address_city ?? a.city ?? '',
      address_country: a.address_country ?? a.country ?? 'Indonesia',
      address_google_place_id: a.address_google_place_id ?? '',
      registration_number: a.registration_number ?? '',
      tax_number: a.tax_number ?? '',
      website: a.website ?? '',
      whatsapp: a.whatsapp ?? '',
      phone: a.phone ?? '',
      contact_emails: emails.length ? emails : [''],
      bank_name: a.bank_name ?? '',
      bank_account_number: a.bank_account_number ?? '',
      bank_account_holder: a.bank_account_holder ?? '',
      bank_swift: a.bank_swift ?? '',
      notes: a.notes ?? '',
      is_active: a.is_active,
      is_default: a.is_default,
    })
    setActiveTab('general')
    setShowModal(true)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/settings/visa-agents/${confirmDelete.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setDeleteError(d.error ?? 'Erreur lors de la suppression')
      setDeleting(false)
      return
    }
    setDeleting(false)
    setConfirmDelete(null)
    // Optimistic remove then reload
    setAgents(prev => prev.filter(a => a.id !== confirmDelete.id))
    await load()
  }

  function handleAddressSelect(r: AddressResult) {
    setForm(p => ({
      ...p,
      address_street: r.street || p.address_street,
      address_city: r.city || p.address_city,
      address_postal_code: r.postal_code || p.address_postal_code,
      address_country: r.country || p.address_country,
      address_google_place_id: r.place_id,
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const emails = form.contact_emails.map(s => s.trim()).filter(Boolean)
    const body = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim() || null,
      address: [form.address_street, form.address_city].filter(Boolean).join(', ') || null,
      address_street: form.address_street.trim() || null,
      address_postal_code: form.address_postal_code.trim() || null,
      address_city: form.address_city.trim() || null,
      address_country: form.address_country.trim() || null,
      address_google_place_id: form.address_google_place_id || null,
      registration_number: form.registration_number.trim() || null,
      tax_number: form.tax_number.trim() || null,
      website: form.website.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      phone: form.phone.trim() || null,
      contact_emails: emails,
      email: emails[0] ?? null,
      bank_name: form.bank_name.trim() || null,
      bank_account_number: form.bank_account_number.trim() || null,
      bank_account_holder: form.bank_account_holder.trim() || null,
      bank_swift: form.bank_swift.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      is_default: form.is_default,
    }
    const url = editing ? `/api/settings/visa-agents/${editing.id}` : '/api/settings/visa-agents'
    await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setShowModal(false); void load()
  }

  const f = (p: Partial<Form>) => setForm(prev => ({ ...prev, ...p }))

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Agents Visa</h1>
            <p className="text-sm text-zinc-400">{agents.length} agent{agents.length !== 1 ? 's' : ''} · Partenaires pour les dossiers visa stagiaires</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-xl bg-[#c8a96e] text-white hover:bg-[#b8945a]">+ Nouvel agent</button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse"/>)}</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">Aucun agent visa configuré.</div>
        ) : (
          <div className="space-y-3">
            {agents.map(a => (
              <div key={a.id} className="bg-white border border-zinc-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="text-sm font-semibold text-[#1a1918]">{a.company_name}</p>
                      {a.is_default && <span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Par défaut</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                        {a.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-zinc-500 space-y-0.5">
                      {(a.address_street || a.address) && (
                        <p className="col-span-2">📍 {[a.address_street || a.address, a.address_postal_code, a.address_city, a.address_country].filter(Boolean).join(', ')}</p>
                      )}
                      {a.whatsapp && <p>💬 {a.whatsapp}</p>}
                      {a.phone && <p>📞 {a.phone}</p>}
                      {(a.contact_emails?.length ?? 0) > 0 && <p className="col-span-2">✉️ {a.contact_emails?.join(', ')}</p>}
                      {a.bank_name && (
                        <p className="col-span-2 mt-1 font-mono text-[10px] bg-zinc-50 px-2 py-1 rounded">
                          🏦 {a.bank_name} · {a.bank_account_number} · {a.bank_account_holder}
                        </p>
                      )}
                      {a.website && <p>🌐 {a.website}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => openEdit(a)} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">Modifier</button>
                    <button onClick={() => { setConfirmDelete(a); setDeleteError(null) }} className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">Supprimer</button>
                    {a.whatsapp && (
                      <a href={`https://wa.me/${a.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">💬 WA</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONFIRM DELETE */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <p className="text-4xl text-center mb-3">🗑</p>
              <h3 className="text-base font-bold text-[#1a1918] text-center mb-1">Supprimer cet agent visa ?</h3>
              <p className="text-sm text-zinc-500 text-center mb-1">{confirmDelete.company_name}</p>
              <p className="text-xs text-zinc-400 text-center mb-4">Les packages liés seront dissociés. Les factures conserveront leurs données.</p>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-600 text-center">{deleteError}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 disabled:opacity-50">
                  {deleting ? 'Suppression…' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col max-h-[92vh]">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? 'Modifier agent' : 'Nouvel agent visa'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 text-xl">×</button>
              </div>

              {/* Inner tabs */}
              <div className="flex gap-1 px-6 pt-3 pb-0 shrink-0">
                {([['general','🏢 Général'],['banking','🏦 Banque'],['portal','🔗 Portail']] as const).map(([t,l]) => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${activeTab===t ? 'bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                    {l}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSave} className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                {activeTab === 'general' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Société *</label>
                      <input required className={inp} value={form.company_name} onChange={e => f({company_name: e.target.value})} placeholder="BIBI CONSULTANT"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Contact principal</label>
                      <input className={inp} value={form.contact_name} onChange={e => f({contact_name: e.target.value})} placeholder="Fazza Nazumi"/>
                    </div>
                  </div>

                  <AddressAutocomplete
                    label="Adresse (recherche Google Maps)"
                    value={form.address_street}
                    onChange={v => f({address_street: v})}
                    onSelect={handleAddressSelect}
                    placeholder="Jl. Sunset Garden No 7-8…"
                    countryRestrict="id"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Code postal</label>
                      <input className={inp} value={form.address_postal_code} onChange={e => f({address_postal_code: e.target.value})} placeholder="80221"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                      <input className={inp} value={form.address_city} onChange={e => f({address_city: e.target.value})} placeholder="Denpasar"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Pays</label>
                      <input className={inp} value={form.address_country} onChange={e => f({address_country: e.target.value})}/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                      <input className={inp} value={form.whatsapp} onChange={e => f({whatsapp: e.target.value})} placeholder="+62 818 0299 9900"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label>
                      <input className={inp} value={form.phone} onChange={e => f({phone: e.target.value})} placeholder="081802999900"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Emails (envoi dossiers visa)</label>
                    {form.contact_emails.map((em, i) => (
                      <div key={i} className="flex gap-2 mb-1.5">
                        <input type="email" className={inp} value={em} onChange={e => setForm(p => ({ ...p, contact_emails: p.contact_emails.map((x,j)=>j===i?e.target.value:x) }))} placeholder="agent@bibi.com"/>
                        {form.contact_emails.length > 1 && <button type="button" onClick={() => setForm(p=>({...p,contact_emails:p.contact_emails.filter((_,j)=>j!==i)}))} className="text-red-400">×</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm(p=>({...p,contact_emails:[...p.contact_emails,'']}))} className="text-xs text-[#c8a96e] hover:underline">+ Email</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° enregistrement</label>
                      <input className={inp} value={form.registration_number} onChange={e => f({registration_number: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                      <input className={inp} value={form.tax_number} onChange={e => f({tax_number: e.target.value})}/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                    <input className={inp} value={form.website} onChange={e => f({website: e.target.value})} placeholder="www.bibiconsultant.com"/>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notes internes</label>
                    <textarea className={inp} rows={2} value={form.notes} onChange={e => f({notes: e.target.value})}/>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <input type="checkbox" checked={form.is_active} onChange={e => f({is_active: e.target.checked})}/> Actif
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <input type="checkbox" checked={form.is_default} onChange={e => f({is_default: e.target.checked})}/> Par défaut
                    </label>
                  </div>
                </>}

                {activeTab === 'banking' && <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-1">
                    Ces coordonnées bancaires seront utilisées pour le suivi des paiements et rapprochements de factures.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la banque</label>
                    <input className={inp} value={form.bank_name} onChange={e => f({bank_name: e.target.value})} placeholder="OCBC"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Numéro de compte</label>
                    <input className={`${inp} font-mono`} value={form.bank_account_number} onChange={e => f({bank_account_number: e.target.value})} placeholder="167-800-01465-3"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Titulaire du compte</label>
                    <input className={inp} value={form.bank_account_holder} onChange={e => f({bank_account_holder: e.target.value})} placeholder="PT Bintang Beruntung Indonesia"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">SWIFT / BIC (virement international)</label>
                    <input className={`${inp} font-mono uppercase`} value={form.bank_swift} onChange={e => f({bank_swift: e.target.value.toUpperCase()})} placeholder="OCBCIDJA"/>
                  </div>
                  {form.bank_name && form.bank_account_number && (
                    <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs text-zinc-600">
                      <p className="font-semibold mb-1">Aperçu virement</p>
                      <p>Banque : <strong>{form.bank_name}</strong></p>
                      <p>Compte : <strong className="font-mono">{form.bank_account_number}</strong></p>
                      {form.bank_account_holder && <p>Au nom de : <strong>{form.bank_account_holder}</strong></p>}
                      {form.bank_swift && <p>SWIFT : <strong className="font-mono">{form.bank_swift}</strong></p>}
                    </div>
                  )}
                </>}

                {activeTab === 'portal' && editing?.portal_token && <>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                    Lien unique sans login — partagez avec l'agent pour qu'il consulte et valide les dossiers.
                  </div>
                  <div className="bg-white border border-zinc-100 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Lien portail agent</p>
                    <p className="font-mono text-xs text-zinc-600 break-all mb-2">{typeof window !== 'undefined' ? window.location.origin : ''}/portal/agent/{editing.portal_token}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/portal/agent/${editing.portal_token}`)}
                        className="text-xs px-3 py-1.5 bg-zinc-100 rounded-lg text-zinc-600">📋 Copier</button>
                      <a href={`/portal/agent/${editing.portal_token}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 bg-[#c8a96e]/10 text-[#c8a96e] rounded-lg">Ouvrir →</a>
                    </div>
                  </div>
                </>}
                {activeTab === 'portal' && !editing?.portal_token && (
                  <p className="text-sm text-zinc-400 text-center py-8">Sauvegardez l'agent d'abord pour générer son portail.</p>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#c8a96e] text-white disabled:opacity-50">
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
