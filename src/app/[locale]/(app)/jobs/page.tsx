'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { JOB_TEMPLATES, ALL_TOOLS, type JobTemplate } from '@/lib/job-templates'
import { useAIAssist } from '@/hooks/useAIAssist'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email?: string | null
  whatsapp?: string | null
  company_id?: string | null
  companies: {
    id: string
    name: string
    description?: string | null
    industry?: string | null
    company_type?: string | null
    location?: string | null
    internship_city?: string | null
    logo_url?: string | null
    website?: string | null
  } | null
}
interface JobDept { id: string; name: string; slug: string }
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
  company_name?: string | null
  department_name?: string | null
  required_level?: string | null
  location?: string | null
  missions?: string[] | null
  tools_required?: string[] | null
  profile_sought?: string | null
  is_recurring?: boolean | null
  parent_job_id?: string | null
  actual_end_date?: string | null
  company_type?: string | null
  background_image_url?: string | null
  job_department_id?: string | null
  public_hook?: string | null
  is_public?: boolean | null
  seo_slug?: string | null
  cover_image_url?: string | null
  compensation_type?: string | null
  compensation_amount?: number | null
}

type JobView = 'open' | 'soon' | 'recurring' | 'archived'
type SortKey = 'recent' | 'alphabetical' | 'deadline' | 'submissions'

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche stagiaire' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
  closed: { bg: '#f3f4f6', color: '#374151', label: 'Fermé' },
}

const DEPT_CHIPS = ['Tous', 'Marketing', 'Design', 'Tech', 'Business', 'Finance', 'Hôtellerie', 'RH']

function daysUntil(date: string | null | undefined): number {
  if (!date) return 999
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

const EMPTY_FORM = {
  title: '', public_title: '', contact_id: '', company_id: '', company_name: '',
  wished_start_date: '', wished_duration_months: '4', description: '', public_description: '',
  status: 'open', is_remote: false, remote_ok: false, department: '',
  job_department_id: '', required_level: '', required_languages: [] as string[],
  location: 'Bali, Indonesie',
  missions: ['', '', ''] as string[],
  tools_required: [] as string[],
  profile_sought: '',
  is_recurring: false,
  company_type: '',
  background_image_url: '',
  parent_job_id: null as string | null,
  compensation_type: null as string | null,
  compensation_amount: null as number | null,
  // Champs Publication & Contenu
  public_hook: '',
  public_vibe: '',
  public_perks: [] as string[],
  public_hashtags: [] as string[],
  seo_slug: '',
  cv_drop_enabled: false,
  cover_image_url: '',
  is_public: false,
}

export default function JobsPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const { assist, loading: aiLoading } = useAIAssist()

  const [jobs, setJobs] = useState<Job[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [jobDepartments, setJobDepartments] = useState<JobDept[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<JobView>('open')
  const [deptChip, setDeptChip] = useState<string>('Tous')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null)
  const [cities, setCities] = useState<{id:string;name:string;area:string}[]>([])

  useEffect(() => {
    fetch('/api/internship-cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : [])).catch(() => null)
  }, [])

  const selectedContact = contacts.find(c => c.id === form.contact_id)

  function selectContact(c: Contact) {
    const co = c.companies
    setForm(prev => {
      const next = {
        ...prev,
        contact_id: c.id,
        company_id: co?.id ?? '',
        company_name: co?.name ?? '',
      }
      if (!prev.location || prev.location === 'Bali, Indonesie') {
        next.location = co?.internship_city ?? co?.location ?? 'Bali, Indonesie'
      }
      if (!prev.company_type && co?.company_type) {
        next.company_type = co.company_type
      }
      if (!prev.description && co?.description) {
        next.description = co.description
      }
      return next
    })
    if (co?.name) {
      setPrefilledFrom(co.name)
      setTimeout(() => setPrefilledFrom(null), 3000)
    }
  }

  async function load() {
    setLoading(true)
    const [j, c, jd] = await Promise.all([
      fetch('/api/jobs').then(r => r.ok ? r.json() : []),
      fetch('/api/contacts?contact_type=employer').then(r => r.ok ? r.json() : []),
      fetch('/api/job-departments').then(r => r.ok ? r.json() : []),
    ])
    setJobs(Array.isArray(j) ? j : [])
    setContacts(Array.isArray(c) ? c : [])
    setJobDepartments(Array.isArray(jd) ? jd : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
  }

  function applyTemplate(t: JobTemplate) {
    const dept = jobDepartments.find(d => d.slug === t.department_slug)
    setForm(p => ({
      ...p,
      title: p.title || t.label,
      missions: [...t.missions, '', ''].slice(0, Math.max(3, t.missions.length)),
      tools_required: t.tools,
      profile_sought: t.profile_sought,
      required_level: t.required_level,
      required_languages: t.required_languages.map(l => l.toUpperCase()),
      job_department_id: dept?.id ?? p.job_department_id,
      department: dept?.name ?? p.department,
    }))
  }

  function toggleTool(tool: string) {
    setForm(p => ({
      ...p,
      tools_required: p.tools_required.includes(tool)
        ? p.tools_required.filter(t => t !== tool)
        : [...p.tools_required, tool],
    }))
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
      wished_duration_months: form.wished_duration_months,
      remote_ok: form.remote_ok ?? false,
      is_remote: form.remote_ok ?? false,
      status: form.status,
      required_level: form.required_level || null,
      required_languages: form.required_languages.length > 0 ? form.required_languages : [],
      location: form.location || null,
      missions: form.missions.filter(m => m.trim()),
      tools_required: form.tools_required,
      profile_sought: form.profile_sought || null,
      is_recurring: form.is_recurring,
      company_type: form.company_type || null,
      background_image_url: form.background_image_url || null,
      public_hook: form.public_hook || null,
      public_vibe: form.public_vibe || null,
      public_perks: form.public_perks.filter(Boolean),
      public_hashtags: form.public_hashtags.filter(Boolean),
      seo_slug: form.seo_slug || null,
      cv_drop_enabled: form.cv_drop_enabled ?? false,
      cover_image_url: form.cover_image_url || null,
      is_public: form.is_public ?? false,
      parent_job_id: form.parent_job_id,
      compensation_type: form.compensation_type || null,
      compensation_amount: form.compensation_amount ?? null,
      destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
    }
    const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const j = await res.json() as Job
      setShowModal(false)
      resetForm()
      router.push(`/${locale}/jobs/${j.id}`)
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Erreur création: ' + (err.error ?? res.statusText))
    }
    setSaving(false)
  }


  async function deleteJob(jobId: string, jobTitle: string) {
    if (!confirm(`Supprimer l'offre "${jobTitle}" ? Cette action est irréversible.`)) return
    const r = await fetch('/api/jobs/' + jobId, { method: 'DELETE' })
    if (r.ok) setJobs(prev => prev.filter(j => j.id !== jobId))
    else alert('Erreur lors de la suppression')
  }

  function duplicateJob(j: Job) {
    setForm({
      ...EMPTY_FORM,
      title: j.title + ' (copie)',
      public_title: j.public_title ?? '',
      contact_id: j.contacts?.id ?? '',
      company_id: j.companies?.id ?? '',
      company_name: j.companies?.name ?? '',
      department: j.department ?? '',
      job_department_id: j.job_department_id ?? '',
      description: j.description ?? '',
      wished_duration_months: String(j.wished_duration_months ?? 4),
      required_level: j.required_level ?? '',
      location: j.location ?? 'Bali, Indonesie',
      missions: [...(j.missions ?? []), '', '', ''].slice(0, Math.max(3, (j.missions ?? []).length)),
      tools_required: j.tools_required ?? [],
      profile_sought: j.profile_sought ?? '',
      is_recurring: j.is_recurring ?? false,
      company_type: j.company_type ?? '',
      background_image_url: j.background_image_url ?? '',
      parent_job_id: j.parent_job_id ?? j.id,
    })
    setShowModal(true)
  }

  function createInstance(j: Job) {
    duplicateJob({ ...j, parent_job_id: j.id })
  }

  // Filter by view
  const viewFiltered = useMemo(() => {
    return jobs.filter(j => {
      if (view === 'open') return j.status === 'open'
      if (view === 'archived') return j.status === 'cancelled'
      if (view === 'recurring') return Boolean(j.is_recurring)
      if (view === 'soon') return j.status === 'staffed' && j.actual_end_date && daysUntil(j.actual_end_date) <= 60
      return true
    })
  }, [jobs, view])

  // Filter chip (department) + search + sort
  const filtered = useMemo(() => {
    const list = viewFiltered.filter(j => {
      const matchSearch = !search || [j.title, j.public_title, j.companies?.name, j.company_name, j.department, j.department_name].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
      const deptMatch = deptChip === 'Tous' || ((j.department_name ?? j.department ?? '').toLowerCase().includes(deptChip.toLowerCase()))
      return matchSearch && deptMatch
    })
    const sorted = [...list]
    if (sortBy === 'alphabetical') sorted.sort((a, b) => (a.public_title ?? a.title).localeCompare(b.public_title ?? b.title))
    else if (sortBy === 'deadline') sorted.sort((a, b) => (a.wished_start_date ?? '9999').localeCompare(b.wished_start_date ?? '9999'))
    else if (sortBy === 'submissions') sorted.sort((a, b) => (b.submissions_count ?? 0) - (a.submissions_count ?? 0))
    // 'recent' uses default API order
    return sorted
  }, [viewFiltered, search, deptChip, sortBy])

  const counts = useMemo(() => ({
    open: jobs.filter(j => j.status === 'open').length,
    soon: jobs.filter(j => j.status === 'staffed' && j.actual_end_date && daysUntil(j.actual_end_date) <= 60).length,
    recurring: jobs.filter(j => j.is_recurring).length,
    archived: jobs.filter(j => j.status === 'cancelled').length,
  }), [jobs])

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#1a1918]">💼 Offres de stage</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] text-sm font-semibold">{jobs.length}</span>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true) }} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors">
          + Nouvelle offre
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-4 overflow-x-auto">
        {([
          ['open', 'Disponibles', counts.open],
          ['soon', 'Bientôt disponibles', counts.soon],
          ['recurring', 'Récurrents', counts.recurring],
          ['archived', 'Archivés', counts.archived],
        ] as const).map(([v, l, n]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={['px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5', view === v ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
          >
            {l}
            <span className={['text-[10px] px-1.5 py-0.5 rounded-full', view === v ? 'bg-[#c8a96e]/15 text-[#c8a96e]' : 'bg-zinc-200 text-zinc-500'].join(' ')}>{n}</span>
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="recent">Tri: Récents</option>
          <option value="alphabetical">Tri: A-Z</option>
          <option value="deadline">Tri: Début souhaité</option>
          <option value="submissions">Tri: Candidatures</option>
        </select>
      </div>

      {/* Department chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {DEPT_CHIPS.map(dept => (
          <button
            key={dept}
            onClick={() => setDeptChip(dept)}
            className={['px-3 py-1 text-xs rounded-full border transition-colors', deptChip === dept ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'].join(' ')}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucune offre</p>
          <p className="text-sm">Créez votre première offre de stage</p>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="mt-4 px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg">+ Nouvelle offre</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(j => {
            const badge = STATUS_BADGE[j.status] ?? STATUS_BADGE.closed
            const days = j.actual_end_date ? daysUntil(j.actual_end_date) : null
            return (
              <div
                key={j.id}
                onClick={() => router.push(`/${locale}/jobs/${j.id}`)}
                className="relative overflow-hidden border border-zinc-100 rounded-xl p-4 hover:border-[#c8a96e] transition-all cursor-pointer min-h-[120px]"
                style={j.cover_image_url ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.96) 100%), url(${j.cover_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: 'white',
                } : { backgroundColor: 'white' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1a1918] truncate">{j.public_title ?? j.title}</p>
                    {j.title !== j.public_title && j.public_title && <p className="text-[10px] text-zinc-400 truncate">{j.title}</p>}
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {j.company_name ?? j.companies?.name ?? '—'}{(j.department_name ?? j.department) ? ` • ${j.department_name ?? j.department}` : ''}
                    </p>
                    {j.contacts && <p className="text-[10px] text-zinc-400 truncate">👤 {j.contacts.first_name} {j.contacts.last_name ?? ''}</p>}
                    {j.public_hook && <p className="text-[10px] text-[#c8a96e] italic truncate mt-0.5">&ldquo;{j.public_hook}&rdquo;</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    {/* Badge publié cliquable → ouvre la page publique */}
                    {j.is_public && j.seo_slug ? (
                      <a href={`https://bali-interns.com/jobs/${j.seo_slug}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-600 whitespace-nowrap hover:bg-green-100 transition-colors">
                        🌐 Voir page ↗
                      </a>
                    ) : j.is_public ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600 whitespace-nowrap">⚠️ Sans slug</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-400 whitespace-nowrap">⚪ Brouillon</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${(j.submissions_count ?? 0) > 0 ? 'bg-blue-50 text-blue-600' : 'text-zinc-300'}`}>
                      👤 {j.submissions_count ?? 0}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {j.wished_start_date && (() => {
                    const d = new Date(j.wished_start_date)
                    return <span className="text-[10px] bg-[#c8a96e]/10 text-[#b8945a] px-2 py-0.5 rounded-full font-medium">📅 {d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  })()}
                  {j.wished_duration_months && <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">{j.wished_duration_months} mois</span>}
                  {j.required_level && <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">{j.required_level}</span>}
                  {j.location && <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">📍 {j.location}</span>}
                  {j.is_recurring && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">🔄 Récurrent</span>}
                  {(j.remote_ok || j.is_remote) && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Remote OK</span>}
                </div>

                {days !== null && days <= 60 && days >= 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mb-2">
                    ⏰ Disponible dans {days}j — planifier la passation
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-50">
                  <button
                    onClick={e => { e.stopPropagation(); duplicateJob(j) }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600"
                  >
                    📋 Dupliquer
                  </button>
                  {j.is_recurring && (
                    <button
                      onClick={e => { e.stopPropagation(); createInstance(j) }}
                      className="text-[10px] text-[#c8a96e] hover:text-[#b8945a]"
                    >
                      🔄 Nouvelle instance
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); void deleteJob(j.id, j.public_title ?? j.title ?? '') }}
                    className="text-[10px] text-red-400 hover:text-red-600 ml-auto"
                  >
                    🗑 Supprimer
                  </button>
                  {j.is_public && j.seo_slug && (
                    <a
                      href={`/jobs/${j.seo_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] text-green-600 hover:text-green-700 font-medium"
                    >
                      🌐 Voir ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle offre de stage</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={createJob} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

              {/* ÉTAPE 0 — Contact employeur (EN PREMIER) */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">① Contact employeur</p>
                <div>
                  <SearchableSelect
                    label="Contact employeur"
                    required
                    items={contacts.map<SearchableSelectItem>(c => ({
                      id: c.id,
                      label: `${c.first_name} ${c.last_name ?? ''}${c.job_title ? ' — ' + c.job_title : ''}`.trim(),
                      sublabel: c.companies?.name ?? c.companies?.industry ?? undefined,
                      avatar: c.companies?.logo_url ?? (c.companies?.name ?? c.first_name)[0]?.toUpperCase(),
                      badge: c.companies?.description ? 'auto-fill' : undefined,
                      meta: { contact: c },
                    }))}
                    value={form.contact_id || null}
                    onChange={item => {
                      if (!item) {
                        setForm(p => ({ ...p, contact_id: '', company_id: '', company_name: '' }))
                        return
                      }
                      const c = (item.meta?.contact as Contact)
                      selectContact(c)
                    }}
                    searchPlaceholder="Rechercher par nom, entreprise…"
                    placeholder="Sélectionner un contact…"
                    emptyText="Aucun contact trouvé"
                  />
                  {prefilledFrom && (
                    <p className="text-xs text-[#0d9e75] mt-1 flex items-center gap-1">
                      ✓ Champs pré-remplis depuis la fiche <strong>{prefilledFrom}</strong>
                    </p>
                  )}
                  {form.company_name && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-[#c8a96e]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {selectedContact?.companies?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedContact.companies.logo_url} alt="" className="w-8 h-8 object-cover rounded-lg" />
                        ) : (
                          <span className="text-xs font-bold text-[#c8a96e]">{form.company_name[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#1a1918] truncate">{form.company_name}</p>
                        {form.company_id && (
                          <a href={`/${locale}/companies/${form.company_id}`} target="_blank" rel="noreferrer"
                            className="text-[10px] text-[#c8a96e] hover:underline">
                            🏢 Voir la fiche entreprise ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-zinc-100" />

              {/* ÉTAPE 1 — Template (optionnel) */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">② Partir d&apos;un template <span className="text-zinc-300 font-normal normal-case">— optionnel, pré-remplit la suite</span></p>
                <p className="text-[11px] text-zinc-400">Vous pouvez choisir un template ou remplir manuellement.</p>
                <div className="grid grid-cols-3 gap-2">
                  {JOB_TEMPLATES.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => applyTemplate(t)}
                      className="text-left px-3 py-2 border border-zinc-200 rounded-xl hover:border-[#c8a96e] hover:bg-amber-50 transition-all">
                      <span className="text-base">{t.icon}</span>
                      <p className="text-xs font-semibold text-zinc-700 mt-0.5">{t.label}</p>
                    </button>
                  ))}
                  <button type="button" onClick={() => resetForm()} className="px-3 py-2 border border-dashed border-zinc-200 rounded-xl text-center">
                    <span className="text-zinc-300 text-xs">Vide</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* ÉTAPE 2 — Identification du poste */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">③ Identification du poste</p>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Titre interne * <span className="text-zinc-400 text-[10px]">(usage interne — FR ok)</span></label>
                  <input required className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Stage Social Media Manager" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center justify-between">
                    <span>Titre public * <span className="text-amber-600 text-[10px] font-medium">🇬🇧 Visible étudiant — EN</span></span>
                    <button type="button" disabled={aiLoading || !form.title} onClick={async () => {
                      const r = await assist('generate_public_title', { title: form.title, company_name: form.company_name, department: form.department })
                      if (r) setForm(p => ({ ...p, public_title: r }))
                    }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
                  </label>
                  <input className={inputCls} value={form.public_title} onChange={e => setForm(p => ({ ...p, public_title: e.target.value }))} placeholder="Visible par les candidats" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Département / Métier *</label>
                  <select className={inputCls} value={form.job_department_id} onChange={e => {
                    const dept = jobDepartments.find(d => d.id === e.target.value)
                    setForm(p => ({ ...p, job_department_id: e.target.value, department: dept?.name ?? p.department }))
                  }}>
                    <option value="">— Sélectionner —</option>
                    {jobDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* ÉTAPE 3 — Contenu */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">④ Contenu</p>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Missions</label>
                  {form.missions.map((m, i) => (
                    <input key={i} className={`${inputCls} mb-1`} placeholder={`Mission ${i + 1}`} value={m} onChange={e => {
                      const next = [...form.missions]; next[i] = e.target.value
                      setForm(p => ({ ...p, missions: next }))
                    }} />
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center justify-between">
                    <span>Profil recherché</span>
                    <button type="button" disabled={aiLoading || !form.title} onClick={async () => {
                      const r = await assist('generate_profile', { title: form.title, department: form.department, required_level: form.required_level, tools: form.tools_required.join(', '), languages: form.required_languages.join(', ') })
                      if (r) setForm(p => ({ ...p, profile_sought: r }))
                    }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
                  </label>
                  <textarea className={inputCls} rows={2} value={form.profile_sought} onChange={e => setForm(p => ({ ...p, profile_sought: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center justify-between">
                    <span>Description interne</span>
                    <button type="button" disabled={aiLoading || !form.title} onClick={async () => {
                      const r = await assist('generate_description', { title: form.title, company_name: form.company_name, missions: form.missions.join(', '), profile_sought: form.profile_sought, tools: form.tools_required.join(', ') })
                      if (r) setForm(p => ({ ...p, description: r }))
                    }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
                  </label>
                  <textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  {form.description && form.description === selectedContact?.companies?.description && (
                    <p className="text-[10px] text-zinc-400 mt-1">📋 Importé depuis la fiche entreprise — modifiable</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center justify-between">
                    <span>Description publique <span className="text-amber-600 text-[10px] font-medium">🇬🇧 EN</span></span>
                    <button type="button" disabled={aiLoading || !form.title} onClick={async () => {
                      const r = form.public_description
                        ? await assist('improve_text', { text: form.public_description, context: `Offre ${form.title} à Bali` })
                        : await assist('generate_public_description', { title: form.title, public_title: form.public_title, company_type: form.company_type, missions: form.missions.join(','), tools: form.tools_required.join(', ') })
                      if (r) setForm(p => ({ ...p, public_description: r }))
                    }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
                  </label>
                  <textarea className={inputCls} rows={3} value={form.public_description} onChange={e => setForm(p => ({ ...p, public_description: e.target.value }))} />
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* ÉTAPE 4 — Outils */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑤ Outils maîtrisés requis</p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 border border-zinc-100 rounded-lg">
                  {ALL_TOOLS.map(tool => (
                    <button key={tool} type="button" onClick={() => toggleTool(tool)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.tools_required.includes(tool)
                        ? 'bg-[#c8a96e] text-white border-[#c8a96e]'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* ÉTAPE 5 — Modalités */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑥ Modalités</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Durée (mois) *</label>
                    <select className={inputCls} value={form.wished_duration_months} onChange={e => setForm(p => ({ ...p, wished_duration_months: e.target.value }))}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Démarrage</label>
                    <input type="date" className={inputCls} value={form.wished_start_date} onChange={e => setForm(p => ({ ...p, wished_start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Niveau requis</label>
                    <select className={inputCls} value={form.required_level} onChange={e => setForm(p => ({ ...p, required_level: e.target.value }))}>
                      <option value="">—</option>
                      {['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Lieu</label>
                    <select className={inputCls} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}>
                      <option value="">— Ville du stage —</option>
                      {['South Bali','Central Bali','Bukit Peninsula','Capital','North Bali','East Bali'].map(area => {
                        const areaCities = cities.filter(c => c.area === area)
                        if (!areaCities.length) return null
                        return (
                          <optgroup key={area} label={area}>
                            {areaCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Langues</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['FR', 'EN', 'ES', 'DE', 'IT', 'PT', 'ZH'].map(lang => (
                      <button key={lang} type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          required_languages: p.required_languages.includes(lang)
                            ? p.required_languages.filter(l => l !== lang)
                            : [...p.required_languages, lang]
                        }))}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${form.required_languages.includes(lang)
                          ? 'bg-[#c8a96e] text-white border-[#c8a96e]'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.remote_ok} onChange={e => setForm(p => ({ ...p, remote_ok: e.target.checked, is_remote: e.target.checked }))} />
                    <span className="text-xs">Remote OK</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))} />
                    <span className="text-xs">Récurrent</span>
                  </label>
                </div>

                {/* Rémunération */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">💰 Type de rémunération</label>
                    <select className={inputCls} value={form.compensation_type ?? ''} onChange={e => setForm(p => ({ ...p, compensation_type: e.target.value || null }))}>
                      <option value="">— Non rémunéré —</option>
                      <option value="gratification">Gratification obligatoire</option>
                      <option value="salaire">Salaire</option>
                      <option value="indemnite">Indemnité</option>
                    </select>
                  </div>
                  {form.compensation_type && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Montant (€/mois)</label>
                      <input type="number" min={0} step={50} className={inputCls} placeholder="Ex: 650"
                        value={form.compensation_amount ?? ''} onChange={e => setForm(p => ({ ...p, compensation_amount: e.target.value ? Number(e.target.value) : null }))} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Statut</label>
                  <select className={inputCls} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="open">🟢 Cherche stagiaire</option>
                    <option value="staffed">🔵 Pourvu</option>
                    <option value="cancelled">⚫ Annulé</option>
                  </select>
                </div>
              </div>

              {/* ÉTAPE 6 — Publication & Contenu */}
              <details className="pt-2 border-t border-zinc-100" open>
                <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer py-2 flex items-center gap-2" style={{color:'#c8a96e'}}>
                  📢 Publication & Génération de contenu
                </summary>
                <div className="space-y-4 mt-3 bg-amber-50/40 rounded-xl p-4 border border-amber-100">

                  {/* Activer la publication */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1918]">Publier cette offre</p>
                      <p className="text-xs text-zinc-400">Active la page publique + génération de contenu</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} className="sr-only peer" />
                      <div className="w-10 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>

                  {/* Accroche */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">
                      🎣 Accroche du post <span className="text-zinc-400 font-normal">(hook — max 100 car.)</span>
                    </label>
                    <input className={inputCls} maxLength={100}
                      placeholder='Ex: "Tu veux bosser dans un resort 5⭐ à Bali ?"'
                      value={form.public_hook}
                      onChange={e => setForm(p => ({ ...p, public_hook: e.target.value }))} />
                    <p className="text-[10px] text-zinc-400 mt-1">{form.public_hook.length}/100 — utilisé comme première ligne des posts social media</p>
                  </div>

                  {/* Vibe */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">
                      🌴 Ambiance / Culture
                    </label>
                    <input className={inputCls}
                      placeholder='Ex: "Startup surf, équipe internationale, bureau face mer"'
                      value={form.public_vibe}
                      onChange={e => setForm(p => ({ ...p, public_vibe: e.target.value }))} />
                  </div>

                  {/* Avantages */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-2">✨ Avantages mis en avant</label>
                    <div className="space-y-1.5">
                      {(form.public_perks.length === 0 ? [''] : [...form.public_perks, '']).map((perk, i) => (
                        <div key={i} className="flex gap-2">
                          <input className={inputCls + ' flex-1'} placeholder={`Avantage ${i+1} (ex: Logement géré, Vue sur mer…)`}
                            value={perk}
                            onChange={e => {
                              const next = [...form.public_perks]
                              if (i < form.public_perks.length) next[i] = e.target.value
                              else next.push(e.target.value)
                              setForm(p => ({ ...p, public_perks: next.filter((x,j) => x || j < next.length-1) }))
                            }} />
                          {i < form.public_perks.length && (
                            <button type="button" onClick={() => setForm(p => ({ ...p, public_perks: p.public_perks.filter((_,j) => j !== i) }))}
                              className="text-zinc-300 hover:text-red-400 px-1 text-sm">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags custom */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">
                      # Hashtags custom <span className="text-zinc-400 font-normal">(séparés par virgule)</span>
                    </label>
                    <input className={inputCls}
                      placeholder='Ex: BaliInterns, StageMarketing, InternshipBali'
                      value={form.public_hashtags.join(', ')}
                      onChange={e => setForm(p => ({ ...p, public_hashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean) }))} />
                  </div>

                  {/* Slug SEO */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">
                      🔗 Slug URL <span className="text-zinc-400 font-normal">(auto-généré si vide)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 flex-shrink-0">bali-interns.com/jobs/</span>
                      <input className={inputCls + ' flex-1'} placeholder="marketing-digital-resort-bali-4mois"
                        value={form.seo_slug}
                        onChange={e => setForm(p => ({ ...p, seo_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
                    </div>
                  </div>

                  {/* CV Drop */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1918]">📄 CV Drop</p>
                      <p className="text-xs text-zinc-400">Permettre à un candidat de déposer son CV sur la page publique</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.cv_drop_enabled} onChange={e => setForm(p => ({ ...p, cv_drop_enabled: e.target.checked }))} className="sr-only peer" />
                      <div className="w-10 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>

                </div>
              </details>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                  {saving ? 'Création…' : 'Créer l\'offre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
