'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Contact { id: string; first_name: string; last_name: string | null; job_title: string | null; companies: { id: string; name: string } | null }
interface JobDept { id: string; name: string; slug: string }
interface JobSubmission {
  id: string
  status: string
  intern_interested: boolean | null
  notes_charly: string | null
  created_at: string
  cases?: { id: string; interns?: { first_name: string; last_name: string | null } | null } | null
}
interface Job {
  id: string
  title: string
  public_title?: string | null
  status: string
  department?: string | null
  wished_start_date?: string | null
  wished_duration_months?: number | null
  is_remote?: boolean
  remote_ok?: boolean
  description?: string | null
  submissions_count?: number
  contacts?: { id: string; first_name: string; last_name: string | null } | null
  companies?: { id: string; name: string } | null
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Ouvert' },
  staffed: { bg: '#fef3c7', color: '#92400e', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
  closed: { bg: '#f3f4f6', color: '#374151', label: 'Fermé' },
}

const SUB_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  proposed: { bg: '#dbeafe', color: '#1e40af', label: 'Proposé' },
  sent: { bg: '#fef3c7', color: '#92400e', label: 'Envoyé' },
  interview: { bg: '#ede9fe', color: '#5b21b6', label: 'Entretien' },
  retained: { bg: '#d1fae5', color: '#065f46', label: 'Retenu' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
}

export default function JobsPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [jobs, setJobs] = useState<Job[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [jobDepartments, setJobDepartments] = useState<JobDept[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCompany, setFilterCompany] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [panelJobId, setPanelJobId] = useState<string | null>(null)
  const [panelSubs, setPanelSubs] = useState<JobSubmission[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'department'>('date')
  const [form, setForm] = useState({
    title: '', public_title: '', contact_id: '', company_id: '', company_name: '',
    wished_start_date: '', wished_duration_months: '4', description: '', public_description: '',
    status: 'open', is_remote: false, notes: '', department: '',
    job_department_id: '', required_level: '', required_languages: [] as string[], location: 'Bali, Indonesie',
  })

  const selectedContact = contacts.find(c => c.id === form.contact_id)
  useEffect(() => {
    if (selectedContact?.companies) {
      setForm(p => ({ ...p, company_id: selectedContact.companies!.id, company_name: selectedContact.companies!.name }))
    }
  }, [form.contact_id, selectedContact])

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase()
    return !q || `${c.first_name} ${c.last_name ?? ''} ${c.companies?.name ?? ''} ${c.job_title ?? ''}`.toLowerCase().includes(q)
  })

  async function load() {
    setLoading(true)
    const [j, c, co, jd] = await Promise.all([
      fetch('/api/jobs').then(r => r.ok ? r.json() : []),
      fetch('/api/contacts?contact_type=employer').then(r => r.ok ? r.json() : []),
      fetch('/api/companies').then(r => r.ok ? r.json() : []),
      fetch('/api/job-departments').then(r => r.ok ? r.json() : []),
    ])
    setJobs(Array.isArray(j) ? j : [])
    setContacts(Array.isArray(c) ? c : [])
    setCompanies(Array.isArray(co) ? co : [])
    setJobDepartments(Array.isArray(jd) ? jd : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function openPanel(jobId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setPanelJobId(jobId)
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/submissions`)
      setPanelSubs(res.ok ? await res.json() : [])
    } catch {
      setPanelSubs([])
    }
    setPanelLoading(false)
  }

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = {
      title: form.title,
      public_title: form.public_title || form.title,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      department: form.department || null,
      job_department_id: form.job_department_id || null,
      description: form.description || null,
      public_description: form.public_description || null,
      wished_start_date: form.wished_start_date || null,
      wished_duration_months: Number(form.wished_duration_months),
      is_remote: form.is_remote,
      status: form.status,
      required_level: form.required_level || null,
      required_languages: form.required_languages.length > 0 ? form.required_languages : null,
      location: form.location || null,
    }
    const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const j = await res.json() as Job
      setShowModal(false)
      setForm({ title: '', public_title: '', contact_id: '', company_id: '', company_name: '', wished_start_date: '', wished_duration_months: '4', description: '', public_description: '', status: 'open', is_remote: false, notes: '', department: '', job_department_id: '', required_level: '', required_languages: [], location: 'Bali, Indonesie' })
      setContactSearch('')
      router.push(`/${locale}/jobs/${j.id}`)
    }
    setSaving(false)
  }

  const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))] as string[]

  const filtered = jobs.filter(j => {
    const matchStatus = filterStatus === 'all' || j.status === filterStatus
    const matchCompany = !filterCompany || j.companies?.id === filterCompany
    const matchDept = !filterDepartment || j.department === filterDepartment
    const matchSearch = !search || [j.title, j.public_title, j.companies?.name, j.department].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchCompany && matchDept && matchSearch
  }).sort((a, b) => {
    if (sortBy === 'company') return (a.companies?.name ?? '').localeCompare(b.companies?.name ?? '')
    if (sortBy === 'department') return (a.department ?? '').localeCompare(b.department ?? '')
    return (b.wished_start_date ?? '').localeCompare(a.wished_start_date ?? '')
  })

  const stats = {
    open: jobs.filter(j => j.status === 'open').length,
    staffed: jobs.filter(j => j.status === 'staffed').length,
    closed: jobs.filter(j => ['cancelled', 'closed'].includes(j.status)).length,
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  const panelJob = panelJobId ? jobs.find(j => j.id === panelJobId) : null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1a1918]">Jobs ouverts</h1>
            <span className="px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] text-sm font-semibold">{jobs.length}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{stats.open} ouverts · {stats.staffed} pourvus · {stats.closed} fermés</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors">
          + Créer un job
        </button>
      </div>

      {/* Search + Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un job, entreprise…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
        </div>
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="">Toutes les entreprises</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {[['all', 'Tous'], ['open', 'Ouverts'], ['staffed', 'Pourvus'], ['closed', 'Fermes']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={['px-3 py-1.5 text-sm rounded-lg transition-colors', filterStatus === v ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'date' | 'company' | 'department')}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="date">Tri: Date</option>
          <option value="company">Tri: Entreprise</option>
          <option value="department">Tri: Departement</option>
        </select>
      </div>

      {/* Department chips */}
      {departments.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterDepartment('')}
            className={['px-3 py-1 text-xs rounded-full border transition-colors', !filterDepartment ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'].join(' ')}
          >
            Tous
          </button>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setFilterDepartment(filterDepartment === dept ? '' : dept)}
              className={['px-3 py-1 text-xs rounded-full border transition-colors', filterDepartment === dept ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'].join(' ')}
            >
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
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
            return (
              <div key={j.id} onClick={() => router.push(`/${locale}/jobs/${j.id}`)} className="bg-white border border-zinc-100 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-zinc-200 hover:shadow-sm transition-all cursor-pointer group">
                {/* Company initial */}
                <div className="w-10 h-10 rounded-lg bg-[#111110] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#c8a96e] font-bold text-sm">{(j.companies?.name ?? j.title)[0]?.toUpperCase()}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[#1a1918] truncate">{j.public_title || j.title}</p>
                    {(j.is_remote || j.remote_ok) && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium flex-shrink-0">Remote</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 flex-wrap">
                    {j.companies?.name && <span className="font-medium text-zinc-600">{j.companies.name}</span>}
                    {j.department && <><span className="text-zinc-300">·</span><span>{j.department}</span></>}
                    {j.wished_duration_months && <><span className="text-zinc-300">·</span><span>{j.wished_duration_months} mois</span></>}
                    {j.wished_start_date && <><span className="text-zinc-300">·</span><span>{new Date(j.wished_start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span></>}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(j.submissions_count ?? 0) > 0 && (
                    <button
                      onClick={(e) => openPanel(j.id, e)}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#c8a96e]/10 text-[#c8a96e] font-medium hover:bg-[#c8a96e]/20 transition-colors"
                    >
                      {j.submissions_count} candidat{(j.submissions_count ?? 0) > 1 ? 's' : ''}
                    </button>
                  )}
                  {(j.submissions_count ?? 0) === 0 && (
                    <span className="text-xs text-zinc-400">0 candidat</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submissions Panel */}
      {panelJobId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setPanelJobId(null)}>
          <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-sm font-semibold text-[#1a1918]">Candidats soumis</h2>
                {panelJob && <p className="text-xs text-zinc-500 mt-0.5">{panelJob.public_title || panelJob.title} — {panelJob.companies?.name}</p>}
              </div>
              <button onClick={() => setPanelJobId(null)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <div className="p-5">
              {panelLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-lg animate-pulse" />)}</div>
              ) : panelSubs.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Aucune soumission pour ce job</p>
              ) : (
                <div className="space-y-3">
                  {panelSubs.map(sub => {
                    const sBadge = SUB_STATUS_BADGE[sub.status] ?? SUB_STATUS_BADGE.proposed
                    const intern = sub.cases?.interns
                    return (
                      <div key={sub.id} className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-[#1a1918]">
                            {intern ? `${intern.first_name} ${intern.last_name ?? ''}`.trim() : 'Candidat'}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: sBadge.bg, color: sBadge.color }}>
                            {sBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span>{new Date(sub.created_at).toLocaleDateString('fr-FR')}</span>
                          {sub.intern_interested !== null && (
                            <span className={sub.intern_interested ? 'text-[#0d9e75]' : 'text-zinc-400'}>
                              {sub.intern_interested ? 'Intéressé' : 'Pas intéressé'}
                            </span>
                          )}
                        </div>
                        {sub.notes_charly && <p className="text-xs text-zinc-500 mt-1.5 italic">{sub.notes_charly}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouveau job</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={createJob} className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Contact employeur */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contact employeur</label>
                <div className="relative">
                  <input
                    className={inputCls}
                    placeholder="Rechercher un contact…"
                    value={contactSearch || (selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name ?? ''} — ${selectedContact.companies?.name ?? ''}` : '')}
                    onFocus={() => { setShowContactDropdown(true); if (selectedContact) setContactSearch('') }}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 150)}
                    onChange={e => { setContactSearch(e.target.value); setForm(p => ({...p, contact_id: '', company_id: '', company_name: ''})) }}
                  />
                  {showContactDropdown && filteredContacts.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredContacts.slice(0, 20).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
                          onMouseDown={() => {
                            setForm(p => ({...p, contact_id: c.id, company_id: c.companies?.id ?? '', company_name: c.companies?.name ?? ''}))
                            setContactSearch('')
                            setShowContactDropdown(false)
                          }}
                        >
                          <span className="font-medium">{c.first_name} {c.last_name ?? ''}</span>
                          {c.companies && <span className="text-zinc-400"> — {c.companies.name}</span>}
                          {c.job_title && <span className="text-zinc-400 text-xs ml-1">({c.job_title})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.company_name && (
                  <p className="text-xs text-zinc-400 mt-1">Entreprise : <span className="font-medium text-[#1a1918]">{form.company_name}</span> (auto-rempli)</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Titre interne *</label>
                <input required className={inputCls} placeholder="Ex: Community Manager — Seminyak" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Titre public <span className="text-zinc-400">(visible candidat)</span></label>
                <input className={inputCls} placeholder="Ex: Community Manager" value={form.public_title} onChange={e => setForm(p => ({...p, public_title: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Département / Secteur</label>
                <input className={inputCls} placeholder="Marketing, Tech…" value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description interne</label>
                <textarea className={inputCls} rows={2} placeholder="Infos internes…" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description publique</label>
                <textarea className={inputCls} rows={2} placeholder="Description pour le candidat…" value={form.public_description} onChange={e => setForm(p => ({...p, public_description: e.target.value}))} style={{ resize: 'vertical' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Date démarrage souhaitée</label>
                  <input type="date" className={inputCls} value={form.wished_start_date} onChange={e => setForm(p => ({...p, wished_start_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Durée (mois)</label>
                  <select className={inputCls} value={form.wished_duration_months} onChange={e => setForm(p => ({...p, wished_duration_months: e.target.value}))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} mois</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                <div
                  className={['w-10 h-6 rounded-full transition-colors relative flex-shrink-0', form.is_remote ? 'bg-violet-500' : 'bg-zinc-200'].join(' ')}
                  onClick={() => setForm(p => ({...p, is_remote: !p.is_remote}))}
                >
                  <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', form.is_remote ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">Remote</p>
                  <p className="text-xs text-zinc-400">Stage en télétravail possible</p>
                </div>
              </label>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Statut</label>
                <select className={inputCls} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  <option value="open">Cherche stagiaire</option>
                  <option value="staffed">Pourvu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                  {saving ? 'Création…' : 'Créer le job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
