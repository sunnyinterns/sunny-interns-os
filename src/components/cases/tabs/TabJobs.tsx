'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AIRecommendations } from '@/components/jobs/AIRecommendations'

interface OpenJob {
  id: string
  public_title?: string | null
  title?: string | null
  companies?: { id: string; name: string } | null
}

interface JobSubmission {
  id: string
  job_id: string
  status: 'submitted' | 'retained' | 'rejected'
  submitted_at?: string | null
  created_at?: string | null
  jobs?: {
    id: string
    public_title?: string | null
    title?: string | null
    companies?: { id: string; name: string } | null
    job_contacts?: Array<{ id: string; name: string; email: string }> | null
  } | null
}

function submissionVariant(status: JobSubmission['status']): 'default' | 'success' | 'critical' | 'info' {
  if (status === 'retained') return 'success'
  if (status === 'rejected') return 'critical'
  if (status === 'submitted') return 'info'
  return 'default'
}

function submissionLabel(status: JobSubmission['status']): string {
  if (status === 'retained') return 'Retenu'
  if (status === 'rejected') return 'Refusé'
  return 'Soumis'
}

interface ProposeModalProps {
  caseId: string
  onClose: () => void
  onSuccess: () => void
  preselectedJobId?: string | null
}

function ProposeModal({ caseId, onClose, onSuccess, preselectedJobId }: ProposeModalProps) {
  const [jobs, setJobs] = useState<OpenJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then((res) => res.ok ? res.json() as Promise<OpenJob[]> : Promise.resolve([]))
      .then((data) => { setJobs(data); setLoading(false) })
      .catch(() => { setJobs([]); setLoading(false) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedJobId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/job-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, job_id: selectedJobId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">Proposer un job</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => { void handleSubmit(e) }} className="p-6 space-y-4">
          {error && <p className="text-sm text-[#dc2626] bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Offre ouverte *</label>
            {loading ? (
              <div className="h-9 bg-zinc-100 rounded-lg animate-pulse" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune offre ouverte disponible</p>
            ) : (
              <select
                required
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              >
                <option value="">Sélectionner une offre…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.public_title ?? j.title ?? 'Offre sans titre'}
                    {j.companies?.name ? ` — ${j.companies.name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving || !selectedJobId}>
              {saving ? 'Soumission…' : 'Soumettre'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TabJobsProps {
  caseId: string
  firstName?: string | null
  lastName?: string | null
}

export function TabJobs({ caseId, firstName, lastName }: TabJobsProps) {
  const [submissions, setSubmissions] = useState<JobSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedJobIdFromAI, setSelectedJobIdFromAI] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/job-submissions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as JobSubmission[]
      setSubmissions(data)
    } catch {
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void fetchSubmissions()
  }, [fetchSubmissions])

  async function handleStatusChange(submissionId: string, status: 'retained' | 'rejected') {
    setActionLoading(submissionId)
    try {
      const sub = submissions.find((s) => s.id === submissionId)
      const jobTitle = sub?.jobs?.public_title ?? sub?.jobs?.title ?? 'ce job'
      const contactEmail = sub?.jobs?.job_contacts?.[0]?.email ?? null
      const internName = [firstName, lastName].filter(Boolean).join(' ')

      const res = await fetch(`/api/job-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      if (status === 'retained') {
        console.log(`[EMAIL] is ${firstName} your next intern?`, {
          to: contactEmail,
          internName,
          jobTitle,
        })
      }

      await fetchSubmissions()
    } finally {
      setActionLoading(null)
    }
  }

  function handleSelectJobFromAI(jobId: string) {
    setSelectedJobIdFromAI(jobId)
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* AI Recommendations */}
      <AIRecommendations caseId={caseId} onSelectJob={handleSelectJobFromAI} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a1918]">Soumissions</h3>
        <Button variant="primary" size="sm" onClick={() => { setSelectedJobIdFromAI(null); setShowModal(true) }}>
          + Proposer un job
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl" />)}
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
          Aucune offre soumise
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => {
            const title = sub.jobs?.public_title ?? sub.jobs?.title ?? 'Offre sans titre'
            const company = sub.jobs?.companies?.name ?? null
            const date = sub.submitted_at ?? sub.created_at
            const isLoading = actionLoading === sub.id

            return (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918] truncate">{title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {company && <span className="text-xs text-zinc-400">{company}</span>}
                    {date && (
                      <span className="text-xs text-zinc-300">
                        {new Date(date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <Badge label={submissionLabel(sub.status)} variant={submissionVariant(sub.status)} />
                {sub.status === 'submitted' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      disabled={isLoading}
                      onClick={() => { void handleStatusChange(sub.id, 'retained') }}
                      className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-[#0d9e75] hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Accepté
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => { void handleStatusChange(sub.id, 'rejected') }}
                      className="px-2.5 py-1 text-xs font-medium bg-red-50 text-[#dc2626] hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Refusé
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ProposeModal
          caseId={caseId}
          onClose={() => { setShowModal(false); setSelectedJobIdFromAI(null) }}
          onSuccess={() => {
            setShowModal(false)
            setSelectedJobIdFromAI(null)
            void fetchSubmissions()
          }}
          preselectedJobId={selectedJobIdFromAI}
        />
      )}
    </div>
  )
}
