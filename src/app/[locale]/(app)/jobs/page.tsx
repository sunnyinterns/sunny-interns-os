'use client'

import { useEffect, useState } from 'react'

interface Department { id: string; name: string; slug: string; categories: string[] | null }
interface Contact { id: string; first_name: string; last_name: string | null; job_title: string | null; companies: { id: string; name: string } | null }
interface Job {
  id: string
  title: string
  status: string
  department?: string
  department_name?: string
  company_name?: string
  contact_name?: string
  wished_start_date?: string
  contacts?: { id: string; first_name: string; last_name: string | null } | null
  companies?: { id: string; name: string } | null
  job_departments?: { id: string; name: string } | null
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
  closed: { bg: '#f3f4f6', color: '#374151', label: 'Fermé' },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', contact_id: '', company_id: '', department_id: '',
    wished_start_date: '', wished_duration_months: '4', description: '', status: 'open',
  })

  // Auto-fill company from selected contact
  const selectedContact = contacts.find(c => c.id === form.contact_id)
  useEffect(() => {
    if (selectedContact?.companies) {
      setForm(p => ({ ...p, company_id: selectedContact.companies!.id }))
    }
  }, [form.contact_id, selectedContact])

  async function load() {
    setLoading(true)
    const [j, d, c, co] = await Promise.all([
      fetch('/api/jobs').then(r => r.ok ? r.json() : []),
      fetch('/api/job-departments').then(r => r.ok ? r.json() : []),
      fetch('/api/contacts?contact_type=employer').then(r => r.ok ? r.json() : []),
      fetch('/api/companies').then(r => r.ok ? r.json() : []),
    ])
    setJobs(Array.isArray(j) ? j : [])
    setDepartments(Array.isArray(d) ? d : [])
    setContacts(Array.isArray(c) ? c : [])
    setCompanies(Array.isArray(co) ? co : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = {
      ...form,
      wished_duration_months: Number(form.wished_duration_months),
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      department_id: form.department_id || null,
    }
    const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const j = await res.json() as Job
      setJobs(p => [j, ...p])
      setShowModal(false)
      setForm({ title: '', contact_id: '', company_id: '', department_id: '', wished_start_date: '', wished_duration_months: '4', description: '', status: 'open' })
    }
    setSaving(false)
  }

  const filtered = jobs.filter(j => {
    const matchDept = !filterDept || j.job_departments?.id === filterDept
    const matchStatus = filterStatus === 'all' || j.status === filterStatus
    return matchDept && matchStatus
  })

  const stats = {
    looking: jobs.filter(j => j.status === 'open').length,
    staffed: jobs.filter(j => j.status === 'staffed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Jobs {jobs.length > 0 && <span className="text-base font-normal text-zinc-500">({jobs.length})</span>}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{stats.looking} cherche · {stats.staffed} pourvus · {stats.cancelled} annulés</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors">
          + Nouveau job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="">Tous les départements</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {[['all', 'Tous'], ['open', 'Cherche'], ['staffed', 'Pourvus'], ['cancelled', 'Annulés']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={['px-3 py-1.5 text-sm rounded-lg transition-colors', filterStatus === v ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun job</p>
          <p className="text-sm">Créez votre première offre de stage</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg">Créer un job</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(j => {
            const badge = STATUS_BADGE[j.status] ?? STATUS_BADGE.closed
            const contactLine = j.contact_name ?? j.contacts ? `${(j.contacts as { first_name: string; last_name: string | null } | null)?.first_name ?? ''} ${(j.contacts as { first_name: string; last_name: string | null } | null)?.last_name ?? ''}`.trim() : null
            return (
              <div key={j.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918]">{j.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[j.department_name ?? j.department, contactLine ?? j.contact_name, j.company_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouveau job</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={createJob} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Titre *</label>
                <input required className={inputCls} placeholder="Ex: Community Manager" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>

              {/* Contact en premier — company s'auto-remplit */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contact employeur</label>
                <select className={inputCls} value={form.contact_id} onChange={e => setForm(p => ({...p, contact_id: e.target.value}))}>
                  <option value="">— Sélectionner un contact —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name ?? ''}{c.job_title ? ` (${c.job_title})` : ''}{c.companies ? ` — ${c.companies.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Entreprise {selectedContact?.companies ? '(auto-rempli)' : ''}</label>
                <select className={inputCls} value={form.company_id} onChange={e => setForm(p => ({...p, company_id: e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Département</label>
                <select className={inputCls} value={form.department_id} onChange={e => setForm(p => ({...p, department_id: e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Date démarrage</label>
                  <input type="date" className={inputCls} value={form.wished_start_date} onChange={e => setForm(p => ({...p, wished_start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Durée (mois)</label>
                  <input type="number" className={inputCls} value={form.wished_duration_months} onChange={e => setForm(p => ({...p, wished_duration_months: e.target.value}))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Statut</label>
                <select className={inputCls} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  <option value="open">Cherche stagiaire</option>
                  <option value="staffed">Pourvu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} style={{ resize: 'vertical' }} />
              </div>

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
