'use client'

import { useEffect, useState, useCallback } from 'react'

interface Job {
  id: string
  title?: string | null
  public_title?: string | null
  department?: string | null
  wished_duration_months?: number | null
  wished_start_date?: string | null
  location?: string | null
  status?: string | null
  companies?: { id: string; name: string } | null
  contacts?: { id: string; first_name: string; last_name: string; email?: string | null } | null
}

interface JobSubmission {
  id: string
  job_id: string
  status: string
  submitted_at?: string | null
  created_at?: string | null
  intern_interested?: boolean | null
  jobs?: {
    id: string
    public_title?: string | null
    title?: string | null
    wished_duration_months?: number | null
    companies?: { id: string; name: string } | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  proposed: { label: 'Proposé', bg: '#fef3c7', text: '#d97706' },
  sent: { label: 'Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  interview: { label: 'Entretien', bg: '#ede9fe', text: '#6d28d9' },
  retained: { label: '✅ Retenu', bg: '#d1fae5', text: '#059669' },
  rejected: { label: 'Refusé', bg: '#fee2e2', text: '#dc2626' },
  cancelled: { label: 'Annulé', bg: '#f4f4f5', text: '#71717a' },
}

interface TabJobsProps {
  caseId: string
  firstName?: string | null
  lastName?: string | null
}

export function TabJobs({ caseId, firstName, lastName }: TabJobsProps) {
  const [submissions, setSubmissions] = useState<JobSubmission[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [proposingId, setProposingId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/job-submissions`)
      if (res.ok) setSubmissions(await res.json() as JobSubmission[])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [caseId])

  useEffect(() => { void fetchSubmissions() }, [fetchSubmissions])

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() as Promise<Job[]> : Promise.resolve([]))
      .then(data => setAllJobs(data))
      .catch(() => setAllJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  const submittedJobIds = new Set(submissions.map(s => s.job_id))

  const filteredJobs = allJobs.filter(j => {
    const q = search.toLowerCase()
    const title = (j.public_title ?? j.title ?? '').toLowerCase()
    const company = (j.companies?.name ?? '').toLowerCase()
    const dept = (j.department ?? '').toLowerCase()
    return title.includes(q) || company.includes(q) || dept.includes(q)
  })

  async function proposeJob(jobId: string) {
    setProposingId(jobId)
    try {
      const res = await fetch('/api/job-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, job_id: jobId }),
      })
      if (!res.ok) throw new Error()
      showToast('Job proposé au candidat ✅')
      void fetchSubmissions()
    } catch {
      showToast('Erreur lors de la soumission', false)
    } finally {
      setProposingId(null)
    }
  }

  async function updateSubmission(submissionId: string, status: string) {
    setActionLoading(submissionId)
    try {
      const res = await fetch(`/api/job-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      showToast(status === 'retained' ? 'Job retenu 🎉' : 'Statut mis à jour')
      void fetchSubmissions()
    } catch {
      showToast('Erreur', false)
    } finally {
      setActionLoading(null)
    }
  }

  const retainedSub = submissions.find(s => s.status === 'retained')

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-[#059669]' : 'bg-[#dc2626]'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── SECTION 1: Job retenu (si existe) ── */}
      {retainedSub && (
        <div className="bg-emerald-50 border-2 border-[#059669] rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#059669] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#059669] uppercase tracking-wide mb-0.5">Job retenu</p>
            <p className="text-sm font-semibold text-[#1a1918] truncate">
              {retainedSub.jobs?.public_title ?? retainedSub.jobs?.title ?? 'Offre'}
            </p>
            {retainedSub.jobs?.companies?.name && (
              <p className="text-xs text-zinc-500">{retainedSub.jobs.companies.name}
                {retainedSub.jobs.wished_duration_months ? ` · ${retainedSub.jobs.wished_duration_months} mois` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 2: Soumissions en cours ── */}
      {submissions.filter(s => s.status !== 'retained').length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Soumissions en cours ({submissions.filter(s => s.status !== 'retained').length})
          </h3>
          <div className="space-y-1.5">
            {submissions.filter(s => s.status !== 'retained').map(sub => {
              const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.proposed
              const title = sub.jobs?.public_title ?? sub.jobs?.title ?? 'Offre'
              const company = sub.jobs?.companies?.name
              const isLoading = actionLoading === sub.id
              return (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-zinc-100">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${sub.status === 'rejected' || sub.status === 'cancelled' ? 'line-through text-zinc-400' : 'text-[#1a1918]'}`}>
                      {title}
                    </p>
                    {company && <p className="text-xs text-zinc-400">{company}</p>}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                    {cfg.label}
                  </span>
                  {(sub.status === 'proposed' || sub.status === 'sent' || sub.status === 'interview') && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button disabled={isLoading}
                        onClick={() => void updateSubmission(sub.id, 'retained')}
                        className="px-2 py-1 text-xs font-medium bg-emerald-50 text-[#059669] hover:bg-emerald-100 rounded transition-colors disabled:opacity-50">
                        ✅ Retenu
                      </button>
                      <button disabled={isLoading}
                        onClick={() => void updateSubmission(sub.id, 'rejected')}
                        className="px-2 py-1 text-xs font-medium bg-red-50 text-[#dc2626] hover:bg-red-100 rounded transition-colors disabled:opacity-50">
                        ❌
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 3: Liste des jobs disponibles ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Jobs disponibles ({filteredJobs.length})
          </h3>
        </div>

        {/* Searchbar */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par titre, entreprise, secteur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Job list */}
        {jobsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl" />)}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400 bg-white rounded-xl border border-dashed border-zinc-200">
            {search ? `Aucun job pour "${search}"` : 'Aucun job ouvert disponible'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map(job => {
              const isSubmitted = submittedJobIds.has(job.id)
              const isProposing = proposingId === job.id
              const title = job.public_title ?? job.title ?? 'Offre sans titre'
              const company = job.companies?.name

              return (
                <div key={job.id}
                  className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all ${
                    isSubmitted ? 'border-[#c8a96e] bg-amber-50/30' : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
                  }`}>

                  {/* Company initial */}
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-zinc-500">
                    {(company ?? title)[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918] truncate">{title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {company && <span className="text-xs text-zinc-500 font-medium">{company}</span>}
                      {job.wished_duration_months && (
                        <>
                          <span className="text-zinc-300 text-xs">·</span>
                          <span className="text-xs text-zinc-400">{job.wished_duration_months} mois</span>
                        </>
                      )}
                      {job.wished_start_date && (
                        <>
                          <span className="text-zinc-300 text-xs">·</span>
                          <span className="text-xs text-zinc-400">
                            Dès {new Date(job.wished_start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                          </span>
                        </>
                      )}
                      {job.department && (
                        <>
                          <span className="text-zinc-300 text-xs">·</span>
                          <span className="text-xs text-zinc-400">{job.department}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {isSubmitted ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                      Déjà proposé
                    </span>
                  ) : (
                    <button
                      disabled={isProposing}
                      onClick={() => void proposeJob(job.id)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      {isProposing ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : '+ Proposer'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
