'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Company { id: string; name: string }
interface Job { id: string; title: string; status: string; job_submissions?: { id: string }[] }
interface ActivityEntry { id: string; action_type: string; description: string; created_at: string; created_by?: string | null }

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
  linkedin_url?: string | null
  contact_type: string
  is_active: boolean
  left_company?: boolean | null
  left_company_at?: string | null
  companies: Company | null
  jobs?: Job[]
}

const TYPE_LABELS: Record<string, string> = {
  employer: 'Employeur',
  promo_partner: 'Partenaire promo',
  visa_agent: 'Agent visa',
  school_contact: 'École',
  other: 'Autre',
}

const JOB_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
}

type Tab = 'infos' | 'jobs' | 'activite'

const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

function relativeDate(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `il y a ${days}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [contact, setContact] = useState<Contact | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('infos')
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Edit state
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // New job form
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDate, setJobDate] = useState('')
  const [jobDuration, setJobDuration] = useState('4')
  const [creatingJob, setCreatingJob] = useState(false)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [cr, co] = await Promise.all([
      fetch(`/api/contacts/${contactId}`).then(r => r.ok ? r.json() as Promise<Contact> : null),
      fetch('/api/companies').then(r => r.ok ? r.json() as Promise<Company[]> : []),
    ])
    if (cr) setContact(cr)
    setCompanies(Array.isArray(co) ? co : [])
    setLoading(false)
  }, [contactId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (activeTab === 'activite') {
      fetch(`/api/cases?contact_id=${contactId}`)
        .then(r => r.ok ? r.json() : [])
        .then((cases: { id: string }[]) => {
          if (!Array.isArray(cases) || cases.length === 0) return
          // Fetch activity for the first linked case
          return fetch(`/api/cases/${cases[0].id}/activity`).then(r => r.ok ? r.json() : [])
        })
        .then((entries) => setActivity(Array.isArray(entries) ? entries : []))
        .catch(() => null)
    }
  }, [activeTab, contactId])

  async function patchContact(patch: Record<string, unknown>) {
    if (!contact) return
    setSaving(true)
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { void load(); showToast('Sauvegardé') }
    else showToast('Erreur lors de la sauvegarde')
    setSaving(false)
  }

  async function saveField() {
    if (!editField) return
    await patchContact({ [editField]: editValue || null })
    setEditField(null)
  }

  async function createJob() {
    if (!contact || !jobTitle) return
    setCreatingJob(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: jobTitle,
        contact_id: contact.id,
        company_id: contact.companies?.id ?? null,
        wished_start_date: jobDate || null,
        wished_duration_months: Number(jobDuration),
        status: 'open',
      }),
    })
    if (res.ok) {
      const j = await res.json() as { id: string }
      setShowJobForm(false)
      setJobTitle('')
      setJobDate('')
      setJobDuration('4')
      void load()
      router.push(`/${locale}/jobs/${j.id}`)
    }
    setCreatingJob(false)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">Contact introuvable.</p>
        <button onClick={() => router.push(`/${locale}/contacts`)} className="mt-2 text-sm text-[#c8a96e] hover:underline">← Retour</button>
      </div>
    )
  }

  const initials = `${contact.first_name[0] ?? ''}${contact.last_name?.[0] ?? ''}`.toUpperCase()
  const tabs: { key: Tab; label: string }[] = [
    { key: 'infos', label: 'Infos' },
    { key: 'jobs', label: `Jobs (${(contact.jobs ?? []).length})` },
    { key: 'activite', label: 'Activité' },
  ]

  const editableFields = [
    { field: 'first_name', label: 'Prénom', value: contact.first_name },
    { field: 'last_name', label: 'Nom', value: contact.last_name ?? '' },
    { field: 'job_title', label: 'Titre / Poste', value: contact.job_title ?? '' },
    { field: 'email', label: 'Email', value: contact.email ?? '' },
    { field: 'whatsapp', label: 'WhatsApp', value: contact.whatsapp ?? '' },
    { field: 'linkedin_url', label: 'LinkedIn', value: contact.linkedin_url ?? '' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">{toastMsg}</div>
      )}

      {/* Back */}
      <button onClick={() => router.push(`/${locale}/contacts`)} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 mb-5 transition-colors">
        ← Retour aux contacts
      </button>

      {/* Header */}
      <div className={`bg-white border rounded-xl p-5 mb-5 ${contact.left_company ? "border-zinc-100 opacity-60" : "border-zinc-100"}`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#c8a96e] text-lg font-bold">{initials}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1a1918]">{contact.first_name} {contact.last_name ?? ''}</h1>
            {contact.job_title && <p className="text-sm text-zinc-500 mt-0.5">{contact.job_title}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {TYPE_LABELS[contact.contact_type] ?? contact.contact_type}
              </span>
              {contact.left_company && <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">🚪 Ne travaille plus ici</span>}
              {contact.companies && (
                <span className="text-xs text-zinc-500">{contact.companies.name}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 self-start">
            {contact.left_company ? (
              <button
                onClick={() => void patchContact({ left_company: false, left_company_at: null })}
                className="text-xs px-2 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                ✓ Travaille encore ici
              </button>
            ) : contact.companies ? (
              <button
                onClick={() => void patchContact({ left_company: true, left_company_at: new Date().toISOString() })}
                className="text-xs px-2 py-1.5 bg-zinc-50 text-zinc-400 rounded-lg border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap"
              >
                🚪 Ne travaille plus ici
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-100 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors', activeTab === tab.key ? 'text-[#c8a96e] border-b-2 border-[#c8a96e]' : 'text-zinc-500 hover:text-[#1a1918]'].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Infos */}
      {activeTab === 'infos' && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
          {editableFields.map(({ field, label, value }) => (
            <div key={field}>
              <p className="text-xs text-zinc-400 mb-1">{label}</p>
              {editField === field ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 px-2 py-1.5 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void saveField(); if (e.key === 'Escape') setEditField(null) }}
                  />
                  <button onClick={() => void saveField()} disabled={saving} className="text-xs px-2 py-1 bg-[#c8a96e] text-white rounded-lg disabled:opacity-50">✓</button>
                  <button onClick={() => setEditField(null)} className="text-xs px-2 py-1 bg-zinc-100 rounded-lg">×</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditField(field); setEditValue(value) }}
                  className="text-sm text-[#1a1918] hover:text-[#c8a96e] transition-colors text-left w-full"
                >
                  {value || <span className="text-zinc-300 italic text-xs">Cliquer pour modifier</span>}
                </button>
              )}
            </div>
          ))}



          {/* Company */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Entreprise</p>
            <select
              className={inputCls}
              value={contact.companies?.id ?? ''}
              onChange={e => void patchContact({ company_id: e.target.value || null })}
            >
              <option value="">— Aucune —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>


        </div>
      )}

      {/* Tab Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {(contact.jobs ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400 italic py-4 text-center">Aucun job pour ce contact.</p>
          ) : (
            <div className="space-y-2">
              {(contact.jobs ?? []).map(job => {
                const badge = JOB_STATUS[job.status] ?? JOB_STATUS.cancelled
                return (
                  <Link
                    key={job.id}
                    href={`/${locale}/jobs/${job.id}`}
                    className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-4 py-3 hover:border-zinc-200 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-[#1a1918]">{job.title}</p>
                    <div className="flex items-center gap-2">
                      {(job.job_submissions?.length ?? 0) > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#c8a96e]/10 text-[#c8a96e] font-medium">
                          {job.job_submissions?.length} candidat{(job.job_submissions?.length ?? 0) > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Create job — redirige vers la page Jobs avec ce contact pré-sélectionné */}
          <Link
            href={`/${locale}/jobs?contact_id=${contactId}`}
            className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors flex items-center justify-center gap-2 block text-center"
          >
            + Créer une offre pour ce contact →
          </Link>
        </div>
      )}

      {/* Tab Activité */}
      {activeTab === 'activite' && (
        <div>
          {activity.length === 0 ? (
            <p className="text-sm text-zinc-400 italic py-4 text-center">Aucune activité liée à ce contact.</p>
          ) : (
            <div className="space-y-2">
              {activity.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-zinc-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[#1a1918]">{entry.description}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{relativeDate(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
