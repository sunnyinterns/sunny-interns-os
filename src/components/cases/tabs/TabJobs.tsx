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
  intern_priority?: number | null
  cv_revision_requested?: boolean | null
  cv_revision_done?: boolean | null
  employer_response?: string | null
  notes_charly?: string | null
  jobs?: {
    id: string
    public_title?: string | null
    title?: string | null
    wished_duration_months?: number | null
    companies?: { id: string; name: string } | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  proposed: { label: '💬 Proposé en entretien', bg: '#fef9ee', text: '#92400e' },
  cv_pending: { label: '📄 CV en attente', bg: '#eff6ff', text: '#1d4ed8' },
  cv_validated: { label: '✅ CV validé', bg: '#f0fdf4', text: '#15803d' },
  sent: { label: '📤 Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  interview: { label: '🤝 Entretien employeur', bg: '#ede9fe', text: '#6d28d9' },
  retained: { label: '🎉 Retenu', bg: '#d1fae5', text: '#059669' },
  rejected: { label: '❌ Refusé', bg: '#fee2e2', text: '#dc2626' },
  cancelled: { label: 'Annulé', bg: '#f4f4f5', text: '#71717a' },
}

interface TabJobsProps {
  caseId: string
  firstName?: string | null
  lastName?: string | null
  desiredSectors?: string[] | null
}

export function TabJobs({ caseId, firstName, lastName, desiredSectors }: TabJobsProps) {
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

  async function updateSubmission(submissionId: string, fields: Record<string, unknown>) {
    setActionLoading(submissionId)
    try {
      const res = await fetch(`/api/job-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
      showToast(fields.status === 'retained' ? 'Job retenu 🎉' : 'Mis à jour')
      void fetchSubmissions()
    } catch {
      showToast('Erreur', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function sendToEmployer(sub: JobSubmission) {
    setActionLoading(sub.id)
    try {
      const res = await fetch(`/api/cases/${caseId}/job-submissions/${sub.id}/send-to-employer`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { emailSent?: boolean }
      showToast(data.emailSent ? 'Email envoyé à l\'employeur ✅' : 'Statut mis à jour (pas d\'email)')
      void fetchSubmissions()
    } catch {
      showToast('Erreur lors de l\'envoi', false)
    } finally {
      setActionLoading(null)
    }
  }

  const retainedSub = submissions.find(s => s.status === 'retained')

  return (
    <div className="space-y-5">

      {/* Secteurs désirés */}
      {desiredSectors && desiredSectors.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Métiers recherchés par le candidat</p>
          <div className="flex flex-wrap gap-2">
            {desiredSectors.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-[#c8a96e]/10 text-[#8a6a2a] text-xs font-medium rounded-full border border-[#c8a96e]/20">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

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

      {/* ── SECTION 2: Jobs proposés avec classement candidat ── */}
      {submissions.filter(s => s.status !== 'retained').length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Jobs proposés — classement candidat ({submissions.filter(s => s.status !== 'retained').length})
          </h3>
          <div className="space-y-3">
            {[...submissions.filter(s => s.status !== 'retained')]
              .sort((a, b) => (a.intern_priority ?? 99) - (b.intern_priority ?? 99))
              .map((sub, index) => {
                const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.proposed
                const title = sub.jobs?.public_title ?? sub.jobs?.title ?? 'Offre'
                const company = sub.jobs?.companies?.name
                const isLoading = actionLoading === sub.id
                const priority = sub.intern_priority ?? index + 1
                const canSend = sub.status === 'cv_validated'
                return (
                  <div key={sub.id} className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: cfg.bg }}>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3" style={{ background: cfg.bg }}>
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => void updateSubmission(sub.id, { intern_priority: Math.max(1, priority - 1) })}
                          className="text-zinc-400 hover:text-zinc-700 text-[10px] leading-none">▲</button>
                        <span className="w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
                          style={{ borderColor: cfg.text, color: cfg.text }}>
                          {priority}
                        </span>
                        <button
                          onClick={() => void updateSubmission(sub.id, { intern_priority: priority + 1 })}
                          className="text-zinc-400 hover:text-zinc-700 text-[10px] leading-none">▼</button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${sub.status === 'rejected' || sub.status === 'cancelled' ? 'line-through opacity-60' : ''}`} style={{ color: cfg.text }}>
                          {title}
                        </p>
                        <p className="text-xs opacity-70">
                          {company ?? '—'}
                          {sub.jobs?.wished_duration_months ? ` · ${sub.jobs.wished_duration_months} mois` : ''}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0"
                        style={{ background: 'white', color: cfg.text, border: `1px solid ${cfg.text}33` }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 border-t border-zinc-100 flex flex-wrap gap-2 items-center">
                      {(sub.status === 'proposed' || sub.status === 'cv_pending') && (
                        <>
                          <button disabled={isLoading}
                            onClick={() => void updateSubmission(sub.id, { status: 'cv_pending', cv_revision_requested: true })}
                            className="text-xs px-2.5 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50">
                            📄 Demander MAJ CV
                          </button>
                          <button disabled={isLoading}
                            onClick={() => void updateSubmission(sub.id, { status: 'cv_validated', cv_revision_done: true })}
                            className="text-xs px-2.5 py-1.5 border border-green-300 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50">
                            ✅ Valider CV
                          </button>
                        </>
                      )}

                      {sub.cv_revision_done && sub.status === 'cv_pending' && (
                        <button disabled={isLoading}
                          onClick={() => void updateSubmission(sub.id, { status: 'cv_validated', cv_revision_requested: false })}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                          ✅ Valider le nouveau CV
                        </button>
                      )}

                      {canSend && (
                        <button disabled={isLoading}
                          onClick={() => void sendToEmployer(sub)}
                          className="text-xs px-3 py-1.5 bg-[#1a1918] text-white rounded-lg font-semibold hover:bg-zinc-700 disabled:opacity-50">
                          📤 Envoyer à l&apos;employeur
                        </button>
                      )}

                      {(sub.status === 'sent' || sub.status === 'interview') && (
                        <>
                          <select value={sub.employer_response ?? ''}
                            onChange={e => void updateSubmission(sub.id, {
                              employer_response: e.target.value,
                              status: e.target.value === 'interested' ? 'interview' : e.target.value === 'not_interested' ? 'rejected' : sub.status,
                            })}
                            className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5">
                            <option value="">Retour employeur…</option>
                            <option value="interested">✅ Intéressé</option>
                            <option value="not_interested">❌ Pas intéressé</option>
                            <option value="pending">⏳ En attente</option>
                          </select>
                          {sub.employer_response === 'interested' && (
                            <button disabled={isLoading}
                              onClick={() => void updateSubmission(sub.id, { status: 'retained' })}
                              className="text-xs px-2.5 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                              🎉 Candidat choisit ce stage
                            </button>
                          )}
                        </>
                      )}

                      {sub.status !== 'rejected' && sub.status !== 'cancelled' && (
                        <button disabled={isLoading}
                          onClick={() => void updateSubmission(sub.id, { status: 'rejected' })}
                          className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          ❌
                        </button>
                      )}

                      <input
                        defaultValue={sub.notes_charly ?? ''}
                        placeholder="Note interne…"
                        onBlur={e => {
                          if (e.target.value !== (sub.notes_charly ?? '')) {
                            void updateSubmission(sub.id, { notes_charly: e.target.value })
                          }
                        }}
                        className="text-xs flex-1 min-w-32 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c8a96e]"
                      />
                    </div>
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
