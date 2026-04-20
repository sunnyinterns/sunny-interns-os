'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'
import { useAIAssist } from '@/hooks/useAIAssist'

function daysUntil(date: string | null | undefined): number {
  if (!date) return 999
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

interface RelatedJob { id: string; title: string; wished_start_date: string | null; status: string }

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
}

interface JobSubmission {
  id: string
  status: string
  cv_sent?: boolean | null
  intern_interested?: boolean | null
  created_at?: string | null
  cases?: {
    id: string
    interns?: { first_name: string; last_name: string } | null
  } | null
}

interface JobDepartment {
  id: string
  name: string
  slug: string | null
  categories: string[] | null
}

interface JobDetail {
  id: string
  title?: string | null
  public_title?: string | null
  job_private_name?: string | null
  description?: string | null
  public_description?: string | null
  department?: string | null
  missions?: string[] | null
  status?: string | null
  location?: string | null
  remote_ok?: boolean | null
  remote_work?: string | null
  required_languages?: string[] | null
  required_level?: string | null
  wished_start_date?: string | null
  wished_end_date?: string | null
  wished_duration_months?: number | null
  is_recurring?: boolean | null
  notes_internal?: string | null
  is_active?: boolean | null
  job_department_id?: string | null
  max_candidates?: number | null
  compensation_type?: string | null
  compensation_amount?: number | null
  skills_required?: string[] | null
  profile_sought?: string | null
  actual_end_date?: string | null
  company_type?: string | null
  tools_required?: string[] | null
  background_image_url?: string | null
  parent_job_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  // Champs publics
  public_hook?: string | null
  public_vibe?: string | null
  public_perks?: string[] | null
  public_hashtags?: string[] | null
  seo_slug?: string | null
  cv_drop_enabled?: boolean | null
  cover_image_url?: string | null
  is_public?: boolean | null
  companies?: {
    id: string
    name: string
    contact_name?: string | null
    contact_email?: string | null
    contact_whatsapp?: string | null
    whatsapp_number?: string | null
    industry?: string | null
    location?: string | null
  } | null
  contacts?: Contact | null
  job_departments?: JobDepartment | null
  job_submissions?: JobSubmission[]
}

interface QualifiedCase {
  id: string
  interns?: { first_name: string; last_name: string } | null
  status: string
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche stagiaire' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annule' },
}

const SUB_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  proposed: { bg: '#f3f4f6', color: '#374151', label: 'Propose' },
  sent: { bg: '#fef3c7', color: '#92400e', label: 'CV envoye' },
  submitted: { bg: '#fef3c7', color: '#92400e', label: 'Soumis' },
  interview: { bg: '#dbeafe', color: '#1e40af', label: 'Entretien' },
  retained: { bg: '#d1fae5', color: '#065f46', label: 'Retenu' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Refuse' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Annule' },
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [qualifiedCases, setQualifiedCases] = useState<QualifiedCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [allDepartments, setAllDepartments] = useState<JobDepartment[]>([])
  const [relatedJobs, setRelatedJobs] = useState<RelatedJob[]>([])
  const { assist, loading: aiLoading } = useAIAssist()

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function load() {
    if (!id) return
    try {
      const res = await fetch(`/api/jobs/${id}`)
      if (res.ok) {
        const data = await res.json() as JobDetail
        setJob(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  useEffect(() => {
    if (!job) return
    const parentId = job.parent_job_id ?? (job.is_recurring ? job.id : null)
    if (!parentId) { setRelatedJobs([]); return }
    fetch(`/api/jobs?parent_id=${parentId}`)
      .then(r => r.ok ? r.json() as Promise<RelatedJob[]> : [])
      .then(d => setRelatedJobs(Array.isArray(d) ? d.filter(j => j.id !== job.id) : []))
      .catch(() => setRelatedJobs([]))
  }, [job])

  useEffect(() => {
    fetch('/api/cases?status=qualification_done')
      .then(r => r.ok ? r.json() as Promise<QualifiedCase[]> : [])
      .then(d => setQualifiedCases(Array.isArray(d) ? d : []))
      .catch(() => null)
    fetch('/api/job-departments')
      .then(r => r.ok ? r.json() as Promise<JobDepartment[]> : [])
      .then(d => setAllDepartments(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  async function patchJob(patch: Record<string, unknown>) {
    if (!job) return
    setSaving(true)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { void load(); setEditing({}); showToast('Sauvegardé ✓') }
    else showToast('Erreur lors de la sauvegarde')
    setSaving(false)
  }

  async function addCandidate() {
    if (!selectedCaseId || !job) return
    setAddingCandidate(true)
    const res = await fetch('/api/job-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: selectedCaseId, job_id: job.id }),
    })
    if (res.ok) { void load(); setSelectedCaseId(''); showToast('Candidat ajoute') }
    else showToast("Erreur lors de l'ajout")
    setAddingCandidate(false)
  }

  async function updateSubmission(subId: string, status: string) {
    const res = await fetch(`/api/job-submissions/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { void load(); showToast(status === 'retained' ? 'Candidat retenu !' : 'Statut mis a jour') }
  }

  async function markStaffed() {
    await patchJob({ status: 'staffed' })
    showToast('Job marque comme pourvu')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="px-5 py-8 bg-white border border-zinc-100 rounded-xl text-center">
          <p className="text-lg font-semibold text-[#1a1918] mb-1">Job introuvable</p>
          <p className="text-sm text-zinc-400 mb-4">Ce job n&apos;existe pas ou a ete supprime.</p>
          <button
            onClick={() => router.push(`/${locale}/jobs`)}
            className="px-4 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] transition-colors"
          >
            Retour aux jobs
          </button>
        </div>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE[job.status ?? 'open'] ?? STATUS_BADGE.open
  const displayTitle = job.public_title ?? job.title ?? 'Job sans titre'
  const departmentName = job.job_departments?.name ?? job.department ?? null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toastMsg}
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push(`/${locale}/jobs`)} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 transition-colors">
        &larr; Retour aux jobs
      </button>

      {/* ═══ HEADER ═══ */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            {editing.public_title ? (
              <input
                className="text-xl font-bold text-[#1a1918] border border-[#c8a96e] rounded-lg px-2 py-1 w-full focus:outline-none"
                defaultValue={job.public_title ?? job.title ?? ''}
                autoFocus
                onBlur={e => void patchJob({ public_title: e.target.value || null })}
                onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_title: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }}
              />
            ) : (
              <h1 className="text-xl font-bold text-[#1a1918] cursor-pointer hover:text-[#c8a96e] transition-colors" onClick={() => setEditing(p => ({ ...p, public_title: true }))}>
                {displayTitle}
              </h1>
            )}
            {job.title && job.title !== displayTitle && (
              <p className="text-xs text-zinc-400 mt-0.5">Titre interne : {job.title}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
              {editing.job_department_id ? (
                <select
                  className="text-xs px-2 py-0.5 rounded-full border border-[#c8a96e] bg-amber-50 text-[#c8a96e] font-medium focus:outline-none"
                  defaultValue={job.job_department_id ?? ''}
                  autoFocus
                  onChange={e => void patchJob({ job_department_id: e.target.value || null })}
                  onBlur={() => setEditing({})}
                >
                  <option value="">— Aucun —</option>
                  {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <button onClick={() => setEditing(p => ({ ...p, job_department_id: true }))} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-[#c8a96e] font-medium hover:bg-amber-100 transition-colors">
                  {departmentName ?? 'Définir métier'}
                </button>
              )}
              {job.companies?.industry && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{job.companies.industry}</span>
              )}
              {(job.remote_ok || job.remote_work) && (
                <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">Remote</span>
              )}
              {job.is_active === false && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-[#dc2626] font-medium">Inactif</span>
              )}
            </div>
          </div>
          {job.companies?.name && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/15 flex items-center justify-center text-sm font-bold text-[#c8a96e] flex-shrink-0">
                {job.companies.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1918]">{job.companies.name}</p>
                {job.companies.location && <p className="text-xs text-zinc-400">{job.companies.location}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Infos grille */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Duree souhaitee</p>
            {editing.wished_duration_months ? (
              <select
                className="px-2 py-1 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                defaultValue={job.wished_duration_months ?? ''}
                autoFocus
                onChange={e => void patchJob({ wished_duration_months: Number(e.target.value) || null })}
                onBlur={() => setEditing({})}
              >
                <option value="">—</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} mois</option>)}
              </select>
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, wished_duration_months: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.wished_duration_months ? `${job.wished_duration_months} mois` : <span className="text-zinc-300 italic text-xs">Definir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Date demarrage</p>
            {editing.wished_start_date ? (
              <div className="flex gap-1">
                <input type="date" className="flex-1 px-2 py-1 text-sm border border-[#c8a96e] rounded-lg" defaultValue={job.wished_start_date?.slice(0, 10) ?? ''} onBlur={e => void patchJob({ wished_start_date: e.target.value || null })} autoFocus />
                <button onClick={() => setEditing({})} className="text-xs px-1 text-zinc-400">x</button>
              </div>
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, wished_start_date: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.wished_start_date ? new Date(job.wished_start_date).toLocaleDateString('fr-FR') : <span className="text-zinc-300 italic text-xs">Definir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Niveau requis</p>
            {editing.required_level ? (
              <select
                className="px-2 py-1 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                defaultValue={job.required_level ?? ''}
                autoFocus
                onChange={e => void patchJob({ required_level: e.target.value || null })}
                onBlur={() => setEditing({})}
              >
                <option value="">—</option>
                {['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, required_level: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.required_level ?? <span className="text-zinc-300 italic text-xs">Definir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Langues requises</p>
            <div className="flex gap-1 flex-wrap">
              {job.required_languages && job.required_languages.length > 0
                ? job.required_languages.map(l => (
                    <span key={l} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{l}</span>
                  ))
                : <span className="text-sm text-zinc-300">—</span>
              }
            </div>
          </div>
        </div>

        {/* Extra info row */}
        {(job.max_candidates || job.compensation_type || job.location) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
            {job.location && (
              <div>
                <p className="text-xs text-zinc-400 mb-1">Lieu</p>
                <p className="text-sm text-[#1a1918]">{job.location}</p>
              </div>
            )}
            {job.max_candidates && (
              <div>
                <p className="text-xs text-zinc-400 mb-1">Max candidats</p>
                <p className="text-sm text-[#1a1918]">{job.max_candidates}</p>
              </div>
            )}
            {job.compensation_type && (
              <div>
                <p className="text-xs text-zinc-400 mb-1">Compensation</p>
                {editing.compensation_type ? (
                  <div className="flex gap-2">
                    <select className="text-sm border border-[#c8a96e] rounded-lg px-2 py-1 focus:outline-none"
                      defaultValue={job.compensation_type ?? ''}
                      onBlur={e => void patchJob({ compensation_type: e.target.value || null })}
                      onKeyDown={e => { if (e.key === 'Escape') setEditing({}) }}>
                      <option value="">—</option>
                      <option value="gratification">Gratification</option>
                      <option value="salaire">Salaire</option>
                      <option value="indemnite">Indemnité</option>
                    </select>
                    <input type="number" min={0} step={50} className="text-sm border border-[#c8a96e] rounded-lg px-2 py-1 w-24 focus:outline-none"
                      defaultValue={job.compensation_amount ?? ''}
                      placeholder="€/mois"
                      onBlur={e => void patchJob({ compensation_amount: e.target.value ? Number(e.target.value) : null })}
                      onKeyDown={e => { if (e.key === 'Escape') setEditing({}) }} />
                  </div>
                ) : (
                  <button onClick={() => setEditing(p => ({ ...p, compensation_type: true }))}
                    className="text-sm text-[#1a1918] hover:text-[#c8a96e] transition-colors text-left">
                    {job.compensation_type}{job.compensation_amount ? ` — ${job.compensation_amount}€/mois` : ''}
                  </button>
                )}
              </div>
            )}
            {!job.compensation_type && (
              <div>
                <p className="text-xs text-zinc-400 mb-1">Compensation</p>
                <button onClick={() => setEditing(p => ({ ...p, compensation_type: true }))}
                  className="text-sm text-zinc-300 italic hover:text-[#c8a96e] transition-colors">
                  Non rémunéré — modifier
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status select + actual_end_date */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-50 flex-wrap items-center">
          <select
            value={job.status ?? 'open'}
            onChange={e => void patchJob({ status: e.target.value })}
            disabled={saving}
            className="text-xs px-2 py-1 rounded-lg border border-zinc-200 focus:outline-none focus:border-[#c8a96e]"
          >
            <option value="open">🟢 Cherche stagiaire</option>
            <option value="staffed">🔵 Pourvu</option>
            <option value="cancelled">⚫ Annulé</option>
          </select>
          {job.status === 'staffed' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Fin prévue stagiaire</span>
              <input
                type="date"
                defaultValue={job.actual_end_date ?? ''}
                onBlur={e => void patchJob({ actual_end_date: e.target.value || null })}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#c8a96e]"
              />
              {job.actual_end_date && daysUntil(job.actual_end_date) <= 60 && daysUntil(job.actual_end_date) >= 0 && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  ⏰ J-{daysUntil(job.actual_end_date)} passation
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MISSIONS & OUTILS ═══ */}
      {((job.missions && job.missions.length > 0) || (job.tools_required && job.tools_required.length > 0)) && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
          {job.missions && job.missions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Missions</p>
              <ul className="space-y-1">
                {job.missions.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1a1918]">
                    <span className="text-[#c8a96e] flex-shrink-0 mt-0.5">→</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.tools_required && job.tools_required.length > 0 && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Outils requis</p>
              <div className="flex flex-wrap gap-1.5">
                {job.tools_required.map(t => (
                  <span key={t} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ INSTANCES RÉCURRENTES ═══ */}
      {(job.is_recurring || job.parent_job_id) && relatedJobs.length > 0 && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            {job.is_recurring ? 'Instances liées' : 'Autres instances'}
          </p>
          {relatedJobs.map(r => (
            <Link key={r.id} href={`/${locale}/jobs/${r.id}`} className="flex items-center justify-between py-2 border-b border-zinc-50 hover:text-[#c8a96e] transition-colors">
              <span className="text-xs">{r.title}</span>
              <span className="text-xs text-zinc-400">{r.wished_start_date ?? '—'}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ═══ CANDIDATURES EN COURS ═══ */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#1a1918] mb-3">
          Candidatures en cours <span className="text-zinc-400 font-normal">({(job.job_submissions ?? []).length})</span>
        </h2>

        {(job.job_submissions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Aucun candidat propose pour ce job.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Candidat</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Statut</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Reponse</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">CV</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Date</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(job.job_submissions ?? []).map(sub => {
                  const subBadge = SUB_STATUS[sub.status] ?? { bg: '#f3f4f6', color: '#374151', label: sub.status }
                  const internName = sub.cases?.interns
                    ? `${sub.cases.interns.first_name} ${sub.cases.interns.last_name}`
                    : 'Candidat inconnu'
                  return (
                    <tr key={sub.id}>
                      <td className="py-2 pr-3">
                        {sub.cases?.id ? (
                          <Link href={`/${locale}/cases/${sub.cases.id}`} className="font-medium text-[#1a1918] hover:text-[#c8a96e] transition-colors">
                            {internName}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">{internName}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: subBadge.bg, color: subBadge.color }}>
                          {subBadge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {sub.intern_interested === true && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-[#0d9e75] font-medium">Interesse</span>}
                        {sub.intern_interested === false && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">Pas interesse</span>}
                        {(sub.intern_interested === null || sub.intern_interested === undefined) && <span className="text-xs text-zinc-300">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs ${sub.cv_sent ? 'text-[#0d9e75]' : 'text-zinc-300'}`}>{sub.cv_sent ? 'Oui' : '—'}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-zinc-400">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {sub.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => void updateSubmission(sub.id, 'retained')}
                                className="text-xs px-2 py-1 bg-green-100 text-[#0d9e75] rounded-lg hover:bg-green-200 font-medium transition-colors"
                              >
                                Retenu
                              </button>
                              <button
                                onClick={() => void updateSubmission(sub.id, 'rejected')}
                                className="text-xs px-2 py-1 bg-red-50 text-[#dc2626] rounded-lg hover:bg-red-100 font-medium transition-colors"
                              >
                                Refuse
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Ajouter un candidat */}
        <div className="mt-4 pt-4 border-t border-zinc-50">
          <p className="text-xs font-medium text-zinc-500 mb-2">Proposer un candidat (qualification_done)</p>
          <div className="space-y-2">
            <SearchableSelect
              items={qualifiedCases.map((c): SearchableSelectItem => ({
                id: c.id,
                label: c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : 'Candidat inconnu',
                sublabel: c.status ?? undefined,
                avatar: c.interns?.first_name?.[0]?.toUpperCase() ?? '?',
                avatarColor: '#f0ebe2',
              }))}
              value={selectedCaseId || null}
              onChange={item => setSelectedCaseId(item?.id ?? '')}
              placeholder="Rechercher un candidat…"
              searchPlaceholder="Nom, prénom, statut…"
              emptyText="Aucun candidat en qualification"
            />
            <button
              onClick={() => void addCandidate()}
              disabled={!selectedCaseId || addingCandidate}
              className="w-full px-3 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
            >
              {addingCandidate ? 'Proposition en cours…' : '→ Proposer ce candidat'}
            </button>
          </div>
        </div>
      </div>
      {/* ═══ DESCRIPTIONS ═══ */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#1a1918]">Description</h2>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-400">Description interne</p>
            <button type="button" disabled={aiLoading || !job.title} onClick={async () => {
              const r = job.description
                ? await assist('improve_text', { text: job.description, context: `Offre ${job.title} à Bali` })
                : await assist('generate_description', { title: job.title ?? '', company_name: job.companies?.name ?? '', missions: (job.missions ?? []).join(', '), profile_sought: job.profile_sought ?? '', tools: (job.tools_required ?? []).join(', ') })
              if (r) void patchJob({ description: r })
            }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
          </div>
          {editing.description ? (
            <textarea
              className="w-full text-sm text-zinc-600 border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
              rows={4}
              defaultValue={job.description ?? ''}
              autoFocus
              onBlur={e => void patchJob({ description: e.target.value || null })}
              style={{ resize: 'vertical' }}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, description: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
              {job.description || <span className="text-zinc-300 italic">Cliquer pour ajouter une description...</span>}
            </button>
          )}
        </div>

        {job.public_description && (
          <div>
            <p className="text-xs text-zinc-400 mb-1">Description publique</p>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{job.public_description}</p>
          </div>
        )}

        {job.missions && job.missions.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 mb-1">Missions</p>
            <ul className="list-disc list-inside text-sm text-zinc-600 space-y-1">
              {job.missions.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-400">Profil recherché</p>
            <button type="button" disabled={aiLoading || !job.title} onClick={async () => {
              const r = job.profile_sought
                ? await assist('improve_text', { text: job.profile_sought, context: `Profil pour ${job.title}` })
                : await assist('generate_profile', { title: job.title ?? '', department: departmentName ?? '', required_level: job.required_level ?? '', tools: (job.tools_required ?? []).join(', '), languages: (job.required_languages ?? []).join(', ') })
              if (r) void patchJob({ profile_sought: r })
            }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{aiLoading ? '...' : '✨ IA'}</button>
          </div>
          {editing.profile_sought ? (
            <textarea
              className="w-full text-sm text-zinc-600 border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
              rows={3}
              defaultValue={job.profile_sought ?? ''}
              autoFocus
              onBlur={e => void patchJob({ profile_sought: e.target.value || null })}
              style={{ resize: 'vertical' }}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, profile_sought: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
              {job.profile_sought || <span className="text-zinc-300 italic">Cliquer pour définir le profil recherché...</span>}
            </button>
          )}
        </div>

        {job.skills_required && job.skills_required.length > 0 && (
          <div>
            <p className="text-xs text-zinc-400 mb-1">Competences requises</p>
            <div className="flex flex-wrap gap-1">
              {job.skills_required.map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-zinc-400 mb-1">Notes internes</p>
          {editing.notes_internal ? (
            <textarea
              className="w-full text-sm text-zinc-500 italic border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
              rows={3}
              defaultValue={job.notes_internal ?? ''}
              autoFocus
              onBlur={e => void patchJob({ notes_internal: e.target.value || null })}
              style={{ resize: 'vertical' }}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, notes_internal: true }))} className="text-left w-full text-sm text-zinc-500 italic hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
              {job.notes_internal || <span className="text-zinc-300 not-italic">Cliquer pour ajouter des notes...</span>}
            </button>
          )}
        </div>

        {!job.description && !job.public_description && !job.missions?.length && !job.profile_sought && !job.notes_internal && !editing.description && !editing.notes_internal && (
          <p className="text-sm text-zinc-300 italic">Cliquez sur les champs ci-dessus pour ajouter du contenu.</p>
        )}
      </div>

      {/* ═══ PUBLICATION & CONTENU ═══ */}
      <section className="bg-white border border-zinc-100 rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">📢 Publication & Contenu</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={!!job.is_public} onChange={e => void patchJob({ is_public: e.target.checked })} className="sr-only peer" />
            <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            <span className="ml-2 text-xs text-zinc-500">{job.is_public ? '🟢 Publiée' : '⚪ Brouillon'}</span>
          </label>
        </div>

        {/* Lien page publique */}
        {job.is_public && job.seo_slug && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-lg">🌐</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700">Page publique active</p>
              <p className="text-[10px] text-green-500 font-mono truncate">/jobs/{job.seo_slug}</p>
            </div>
            <a href={`/jobs/${job.seo_slug}`} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex-shrink-0">↗ Voir</a>
          </div>
        )}

        {/* Description publique */}
        <div>
          <p className="text-xs text-zinc-400 mb-1">Description publique <span className="text-amber-600 text-[10px]">🇬🇧 visible candidats</span></p>
          {editing.public_description ? (
            <textarea className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none resize-none" autoFocus rows={3}
              defaultValue={job.public_description ?? ''}
              onBlur={e => void patchJob({ public_description: e.target.value || null })}
              onKeyDown={e => { if (e.key === 'Escape') setEditing({}) }} />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, public_description: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors">
              {job.public_description || <span className="text-zinc-300 italic">Cliquer pour ajouter une description publique...</span>}
            </button>
          )}
        </div>

        {/* Accroche */}
        <div>
          <p className="text-xs text-zinc-400 mb-1">Accroche publique <span className="text-zinc-300">(100 car. max)</span></p>
          {editing.public_hook ? (
            <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none" autoFocus
              defaultValue={job.public_hook ?? ''}
              maxLength={100}
              onBlur={e => void patchJob({ public_hook: e.target.value || null })}
              onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_hook: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, public_hook: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors italic">
              {job.public_hook || <span className="text-zinc-300 not-italic">Cliquer pour ajouter une accroche...</span>}
            </button>
          )}
        </div>

        {/* Ambiance */}
        <div>
          <p className="text-xs text-zinc-400 mb-1">Ambiance / vibe</p>
          {editing.public_vibe ? (
            <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none" autoFocus
              defaultValue={job.public_vibe ?? ''}
              onBlur={e => void patchJob({ public_vibe: e.target.value || null })}
              onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_vibe: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, public_vibe: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors italic">
              {job.public_vibe || <span className="text-zinc-300 not-italic">Cliquer pour décrire l&apos;ambiance...</span>}
            </button>
          )}
        </div>

        {/* Avantages */}
        <div>
          <p className="text-xs text-zinc-400 mb-1">Avantages <span className="text-zinc-300">(un par ligne)</span></p>
          {editing.public_perks ? (
            <textarea className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none resize-none" autoFocus rows={3}
              defaultValue={(job.public_perks ?? []).join('\n')}
              onBlur={e => void patchJob({ public_perks: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            />
          ) : (
            <button onClick={() => setEditing(p => ({ ...p, public_perks: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors">
              {job.public_perks?.filter(Boolean).length ? (
                <div className="flex flex-wrap gap-1">{job.public_perks.filter(Boolean).map((p, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">✨ {p}</span>)}</div>
              ) : <span className="text-zinc-300 italic not-italic text-sm">Cliquer pour ajouter des avantages...</span>}
            </button>
          )}
        </div>

        {/* Slug SEO */}
        <div>
          <p className="text-xs text-zinc-400 mb-1">Slug SEO <span className="text-zinc-300">(ex: social-media-manager-bali)</span></p>
          {editing.seo_slug ? (
            <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none font-mono" autoFocus
              defaultValue={job.seo_slug ?? ''}
              onBlur={e => void patchJob({ seo_slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null })}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing({}) }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(p => ({ ...p, seo_slug: true }))} className="text-left text-sm font-mono text-zinc-600 hover:text-[#c8a96e] transition-colors">
                {job.seo_slug || <span className="text-zinc-300 not-italic font-sans">Cliquer pour définir le slug...</span>}
              </button>
              {job.seo_slug && <a href={`/jobs/${job.seo_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">↗ voir</a>}
            </div>
          )}
        </div>

        {/* CV Drop */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1a1918]">CV Drop activé</p>
            <p className="text-xs text-zinc-400">Les candidats peuvent déposer leur CV directement</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={!!job.cv_drop_enabled} onChange={e => void patchJob({ cv_drop_enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
      </section>

      {/* ═══ CONTACT EMPLOYEUR ═══ */}
      {(job.contacts || job.companies?.contact_email) && (
        <section className="bg-white border border-zinc-100 rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Contact employeur</h2>
          {job.contacts ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#c8a96e]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#c8a96e] font-bold text-sm">{(job.contacts.first_name?.[0] ?? '?').toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{job.contacts.first_name} {job.contacts.last_name ?? ''}</p>
                  {job.contacts.job_title && <p className="text-xs text-zinc-400">{job.contacts.job_title}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                {job.contacts.email && <a href={`mailto:${job.contacts.email}`} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#c8a96e]"><span className="w-4 text-center text-zinc-400">@</span>{job.contacts.email}</a>}
                {job.contacts.whatsapp && <a href={`https://wa.me/${job.contacts.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#0d9e75]"><span className="w-4 text-center text-zinc-400">WA</span>{job.contacts.whatsapp}</a>}
              </div>
              <Link href={`/${locale}/contacts/${job.contacts.id}`} className="text-xs text-[#c8a96e] hover:underline mt-2 block">Voir fiche contact →</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-[#1a1918]">{job.companies?.contact_name ?? job.companies?.name}</p>
              {job.companies?.contact_email && <a href={`mailto:${job.companies.contact_email}`} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#c8a96e]"><span className="w-4 text-center text-zinc-400">@</span>{job.companies.contact_email}</a>}
            </div>
          )}
        </section>
      )}
    </div>
  )
}