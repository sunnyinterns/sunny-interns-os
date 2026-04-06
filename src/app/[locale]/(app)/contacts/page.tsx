'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
  contact_type: 'employer' | 'promo_partner' | 'visa_agent' | 'school_contact'
  is_active: boolean
  companies: { id: string; name: string } | null
  jobs?: { id: string; title: string; status: string }[]
}

const TYPE_LABELS: Record<string, string> = {
  employer: 'Employeur',
  promo_partner: 'Partenaire promo',
  visa_agent: 'Agent visa',
  school_contact: 'École',
}
const TYPE_COLORS: Record<string, string> = {
  employer: 'bg-blue-100 text-blue-700',
  promo_partner: 'bg-purple-100 text-purple-700',
  visa_agent: 'bg-amber-100 text-amber-700',
  school_contact: 'bg-green-100 text-green-700',
}

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', job_title: '', email: '', whatsapp: '',
    company_id: '', contact_type: 'employer',
  })

  async function load() {
    setLoading(true)
    const [cr, co] = await Promise.all([
      fetch('/api/contacts').then(r => r.ok ? r.json() : []),
      fetch('/api/companies').then(r => r.ok ? r.json() : []),
    ])
    setContacts(Array.isArray(cr) ? cr : [])
    setCompanies(Array.isArray(co) ? co : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ first_name: '', last_name: '', job_title: '', email: '', whatsapp: '', company_id: '', contact_type: 'employer' })
      void load()
    }
    setSaving(false)
  }

  const filtered = contacts.filter((c) => {
    const matchType = filterType === 'all' || c.contact_type === filterType
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${c.first_name} ${c.last_name ?? ''}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.companies?.name ?? '').toLowerCase().includes(q)
    return matchType && matchSearch
  })

  function initials(c: Contact) {
    return `${c.first_name[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Contacts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors"
        >
          + Nouveau contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-56"
        />
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {(['all', 'employer', 'promo_partner', 'visa_agent', 'school_contact'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={['px-3 py-1.5 text-sm rounded-lg transition-colors', filterType === t ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
            >
              {t === 'all' ? 'Tous' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun contact</p>
          <p className="text-sm">Créez votre premier contact employeur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-zinc-200 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c8a96e] text-sm font-semibold">{initials(c)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#1a1918]">{c.first_name} {c.last_name ?? ''}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[c.contact_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {TYPE_LABELS[c.contact_type] ?? c.contact_type}
                  </span>
                  {!c.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Inactif</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {[c.job_title, c.companies?.name].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="text-right text-xs text-zinc-500 space-y-0.5 flex-shrink-0">
                {c.email && <p>{c.email}</p>}
                {c.whatsapp && <p>{c.whatsapp}</p>}
                {c.jobs && c.jobs.length > 0 && (
                  <p className="text-[#c8a96e]">{c.jobs.length} offre{c.jobs.length > 1 ? 's' : ''}</p>
                )}
              </div>
              {c.companies && (
                <Link href={`/fr/companies/${c.companies.id}`} className="text-xs text-zinc-400 hover:text-[#c8a96e] transition-colors flex-shrink-0">
                  →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal créer contact */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouveau contact</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Prénom *</label>
                  <input required className={inputCls} value={form.first_name} onChange={e => setForm(p => ({...p, first_name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                  <input className={inputCls} value={form.last_name} onChange={e => setForm(p => ({...p, last_name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Titre / Poste</label>
                  <input className={inputCls} placeholder="Ex: DRH, Manager…" value={form.job_title} onChange={e => setForm(p => ({...p, job_title: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                  <select className={inputCls} value={form.contact_type} onChange={e => setForm(p => ({...p, contact_type: e.target.value}))}>
                    <option value="employer">Employeur</option>
                    <option value="promo_partner">Partenaire promo</option>
                    <option value="visa_agent">Agent visa</option>
                    <option value="school_contact">École</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                  <input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                  <input className={inputCls} placeholder="+62…" value={form.whatsapp} onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Entreprise</label>
                <select className={inputCls + ' w-full'} value={form.company_id} onChange={e => setForm(p => ({...p, company_id: e.target.value}))}>
                  <option value="">— Aucune —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50">
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
