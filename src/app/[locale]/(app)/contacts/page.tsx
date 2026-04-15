'use client'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
  contact_type: string
  companies: {
    id: string
    name: string
    logo_url?: string | null
    is_employer?: boolean | null
    is_partner?: boolean | null
    is_supplier?: boolean | null
    internship_city?: string | null
  } | null
  jobs?: { id: string; title: string; status: string }[]
}

const TYPE_LABELS: Record<string, string> = {
  employer: 'Employeur',
  partner: 'Partenaire',
  supplier: 'Fournisseur',
  school_contact: 'École',
  other: 'Autre',
}
const TYPE_COLORS: Record<string, string> = {
  employer: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  supplier: 'bg-orange-100 text-orange-700',
  school_contact: 'bg-green-100 text-green-700',
  other: 'bg-zinc-100 text-zinc-600',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  open: 'Cherche',
  staffed: 'Pourvu',
  cancelled: 'Annulé',
  closed: 'Fermé',
}

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-full'

export default function ContactsPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string; logo_url?: string | null; internship_city?: string | null; legal_type?: string | null; company_type?: string | null; is_employer?: boolean | null; is_partner?: boolean | null; is_supplier?: boolean | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCompany, setFilterCompany] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [creatingJob, setCreatingJob] = useState(false)
  const [jobForm, setJobForm] = useState({ title: '', wished_start_date: '', wished_duration_months: '4' })
  const [waCode, setWaCode] = useState('+33')
  const [waNumber, setWaNumber] = useState('')
  const [waError, setWaError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', job_title: '', email: '', whatsapp: '',
    company_id: '',
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

  // Refresh selected contact when contacts list updates
  useEffect(() => {
    if (selectedContact) {
      const updated = contacts.find(c => c.id === selectedContact.id)
      if (updated) setSelectedContact(updated)
    }
  }, [contacts]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    const digits = waNumber.replace(/\D/g, '')
    if (waNumber && digits.length < 6) { setWaError('Numéro trop court'); return }
    setWaError(null)
    setSaving(true)
    const whatsapp = waNumber ? `${waCode}${digits}` : null
    const body = {
      first_name: form.first_name,
      last_name: form.last_name || null,
      job_title: form.job_title || null,
      email: form.email || null,
      whatsapp,
      company_id: form.company_id || null,
    }
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ first_name: '', last_name: '', job_title: '', email: '', whatsapp: '', company_id: '' })
      setWaCode('+33'); setWaNumber(''); setWaError(null); setCreateError(null)
      void load()
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      setCreateError(err.error ?? 'Erreur création contact')
    }
    setSaving(false)
  }

  async function patchContact(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) void load()
  }

  async function saveEditField() {
    if (!selectedContact || !editingField) return
    await patchContact(selectedContact.id, { [editingField]: editValue })
    setEditingField(null)
  }

  async function createJobForContact() {
    if (!selectedContact || !jobForm.title) return
    setCreatingJob(true)
    const body = {
      title: jobForm.title,
      contact_id: selectedContact.id,
      company_id: selectedContact.companies?.id ?? null,
      wished_start_date: jobForm.wished_start_date || null,
      wished_duration_months: Number(jobForm.wished_duration_months),
      status: 'open',
    }
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setJobForm({ title: '', wished_start_date: '', wished_duration_months: '4' })
    setCreatingJob(false)
    void load()
  }

  const filtered = contacts.filter((c) => {
    // Le type est hérité de l'entreprise liée ou du contact_type stocké
    const inferredType = c.companies?.is_supplier ? 'supplier'
      : c.companies?.is_partner && !c.companies?.is_employer ? 'partner'
      : c.companies?.is_employer ? 'employer'
      : c.contact_type === 'school_contact' ? 'school_contact'
      : 'other'
    const matchType = filterType === 'all' || inferredType === filterType || c.contact_type === filterType
    const matchCompany = !filterCompany || c.companies?.id === filterCompany
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${c.first_name} ${c.last_name ?? ''}`.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.companies?.name ?? '').toLowerCase().includes(q)
    return matchType && matchCompany && matchSearch
  })

  function initials(c: Contact) {
    return `${c.first_name[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase()
  }

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={['flex-1 min-w-0 p-6 overflow-auto', selectedContact ? 'max-w-[calc(100%-380px)]' : ''].join(' ')}>
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

        {/* Filtres */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-48"
          />
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          >
            <option value="">Toutes les entreprises</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
            {(['all', 'employer', 'partner', 'supplier', 'school_contact'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={['px-3 py-1.5 text-xs rounded-lg transition-colors', filterType === t ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
              >
                {t === 'all' ? 'Tous' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
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
            {filtered.map((c) => {
              const activeJobs = (c.jobs ?? []).filter(j => j.status === 'open').length
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={[
                    'w-full text-left bg-white border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-zinc-300 transition-colors',
                    selectedContact?.id === c.id ? 'border-[#c8a96e] shadow-sm' : 'border-zinc-100',
                  ].join(' ')}
                >
                  <div className="w-9 h-9 rounded-full bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#c8a96e] text-sm font-semibold">{initials(c)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1a1918]">{c.first_name} {c.last_name ?? ''}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[c.contact_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {(() => {
                          const t = c.companies?.is_supplier ? 'supplier'
                            : c.companies?.is_partner && !c.companies?.is_employer ? 'partner'
                            : c.companies?.is_employer ? 'employer'
                            : c.contact_type === 'school_contact' ? 'school_contact'
                            : c.contact_type ?? 'other'
                          return TYPE_LABELS[t] ?? t
                        })()}
                      </span>

                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {[c.job_title, c.companies?.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 space-y-0.5 flex-shrink-0">
                    {c.email && <p>{c.email}</p>}
                    {c.whatsapp && <p>{c.whatsapp}</p>}
                    {activeJobs > 0 && (
                      <p className="text-[#c8a96e] font-medium">{activeJobs} offre{activeJobs > 1 ? 's' : ''} active{activeJobs > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Drawer latéral */}
      {selectedContact && (
        <div className="w-[380px] flex-shrink-0 border-l border-zinc-100 bg-white overflow-auto flex flex-col">
          {/* Header drawer */}
          <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-3">
            <div>
              <div className="w-10 h-10 rounded-full bg-[#c8a96e]/20 flex items-center justify-center mb-2">
                <span className="text-[#c8a96e] text-sm font-semibold">{initials(selectedContact)}</span>
              </div>
              <h2 className="text-base font-semibold text-[#1a1918]">{selectedContact.first_name} {selectedContact.last_name ?? ''}</h2>
              <p className="text-xs text-zinc-500">{selectedContact.job_title ?? ''}</p>
              <button
                onClick={() => router.push(`/${locale}/contacts/${selectedContact.id}`)}
                className="mt-2 text-xs px-2 py-1 bg-[#c8a96e]/10 text-[#c8a96e] rounded-lg hover:bg-[#c8a96e]/20 transition-colors font-medium"
              >
                Voir fiche complète →
              </button>
            </div>
            <button onClick={() => setSelectedContact(null)} className="text-zinc-400 hover:text-zinc-600 text-xl mt-1">×</button>
          </div>

          {/* Infos éditables */}
          <div className="px-5 py-4 space-y-3 border-b border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Informations</p>
            {[
              { field: 'email', label: 'Email', value: selectedContact.email ?? '' },
              { field: 'whatsapp', label: 'WhatsApp', value: selectedContact.whatsapp ?? '' },
              { field: 'job_title', label: 'Titre / Poste', value: selectedContact.job_title ?? '' },
            ].map(({ field, label, value }) => (
              <div key={field}>
                <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                {editingField === field ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void saveEditField(); if (e.key === 'Escape') setEditingField(null) }}
                    />
                    <button onClick={() => void saveEditField()} className="text-xs px-2 py-1 bg-[#c8a96e] text-white rounded-lg">✓</button>
                    <button onClick={() => setEditingField(null)} className="text-xs px-2 py-1 bg-zinc-100 rounded-lg">×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingField(field); setEditValue(value) }}
                    className="text-sm text-[#1a1918] hover:text-[#c8a96e] transition-colors text-left w-full"
                  >
                    {value || <span className="text-zinc-300 italic">Cliquer pour modifier</span>}
                  </button>
                )}
              </div>
            ))}
            {selectedContact.companies && (
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">Entreprise</p>
                <p className="text-sm text-[#1a1918] font-medium">{selectedContact.companies.name}</p>
              </div>
            )}
          </div>

          {/* Jobs */}
          <div className="px-5 py-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Offres de stage</p>
              <span className="text-xs text-zinc-500">{(selectedContact.jobs ?? []).length}</span>
            </div>
            {(selectedContact.jobs ?? []).length === 0 ? (
              <p className="text-xs text-zinc-400 italic mb-3">Aucune offre pour ce contact</p>
            ) : (
              <div className="space-y-2 mb-4">
                {(selectedContact.jobs ?? []).map(job => (
                  <div key={job.id} className="flex items-center justify-between gap-2 py-2 border-b border-zinc-50">
                    <p className="text-sm text-[#1a1918] truncate">{job.title}</p>
                    <span className={[
                      'text-xs px-1.5 py-0.5 rounded flex-shrink-0',
                      job.status === 'open' ? 'bg-green-100 text-[#0d9e75]' :
                      job.status === 'staffed' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-500'
                    ].join(' ')}>
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Créer un job → page Jobs */}
            <Link
              href={`/${locale}/jobs?contact_id=${selectedContact.id}`}
              className="mt-1 w-full py-2.5 border-2 border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors flex items-center justify-center"
            >
              + Créer une offre pour ce contact →
            </Link>
          </div>
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
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                  <input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                  <div className="flex gap-2">
                    <select value={waCode} onChange={e => { setWaCode(e.target.value); setWaError(null) }}
                      className="px-2 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-28 flex-shrink-0">
                      <option value="+33">+33 🇫🇷</option>
                      <option value="+32">+32 🇧🇪</option>
                      <option value="+41">+41 🇨🇭</option>
                      <option value="+1">+1 🇺🇸</option>
                      <option value="+44">+44 🇬🇧</option>
                      <option value="+49">+49 🇩🇪</option>
                      <option value="+34">+34 🇪🇸</option>
                      <option value="+39">+39 🇮🇹</option>
                      <option value="+351">+351 🇵🇹</option>
                      <option value="+31">+31 🇳🇱</option>
                      <option value="+62">+62 🇮🇩</option>
                      <option value="+66">+66 🇹🇭</option>
                      <option value="+84">+84 🇻🇳</option>
                      <option value="+60">+60 🇲🇾</option>
                      <option value="+65">+65 🇸🇬</option>
                      <option value="+61">+61 🇦🇺</option>
                      <option value="+81">+81 🇯🇵</option>
                      <option value="+91">+91 🇮🇳</option>
                      <option value="+55">+55 🇧🇷</option>
                      <option value="+52">+52 🇲🇽</option>
                      <option value="+212">+212 🇲🇦</option>
                      <option value="+216">+216 🇹🇳</option>
                      <option value="+221">+221 🇸🇳</option>
                    </select>
                    <div className="flex-1">
                      <input type="tel" value={waNumber}
                        onChange={e => { setWaNumber(e.target.value); setWaError(null) }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${waError ? 'border-red-400 focus:ring-red-300' : 'border-zinc-200 focus:ring-[#c8a96e]'}`}
                        placeholder="6 12 34 56 78" />
                      {waError && <p className="text-xs text-red-500 mt-0.5">{waError}</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <SearchableSelect
                  label="Entreprise associée"
                  items={companies.map((c): SearchableSelectItem => ({
                    id: c.id,
                    label: c.name,
                    sublabel: [c.internship_city, c.legal_type ?? c.company_type].filter(Boolean).join(' · ') || undefined,
                    avatar: c.logo_url ?? c.name[0]?.toUpperCase(),
                    avatarColor: '#f0ebe2',
                  }))}
                  value={form.company_id || null}
                  onChange={item => setForm(p => ({...p, company_id: item?.id ?? ''}))}
                  placeholder="Rechercher une entreprise…"
                  searchPlaceholder="Nom de l'entreprise…"
                  clearable={true}
                  emptyText="Aucune entreprise trouvée"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                {createError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>
                )}
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
