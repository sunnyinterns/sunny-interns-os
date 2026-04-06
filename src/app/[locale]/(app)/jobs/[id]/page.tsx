'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface JobDetail {
  id: string
  public_title?: string | null
  title?: string | null
  internal_company_name?: string | null
  department?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  missions?: string[] | null
  description?: string | null
  wished_start_date?: string | null
  wished_end_date?: string | null
  parent_job_id?: string | null
  companies?: { id: string; name: string } | null
  job_contacts?: Array<{ id: string; name: string; email: string }> | null
  cases?: Array<{ id: string; first_name: string; last_name: string; status: string }> | null
}

function statusVariant(status: string | null | undefined): 'success' | 'info' | 'attention' | 'default' {
  if (status === 'open') return 'success'
  if (status === 'staffed') return 'info'
  if (status === 'ending_soon') return 'attention'
  return 'default'
}

function statusLabel(status: string | null | undefined): string {
  if (status === 'open') return 'Ouverte'
  if (status === 'staffed') return 'Pourvue'
  if (status === 'ending_soon') return 'Bientôt terminée'
  return status ?? '—'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface EditModalProps {
  job: JobDetail
  onClose: () => void
  onSuccess: (updated: JobDetail) => void
}

function EditModal({ job, onClose, onSuccess }: EditModalProps) {
  const [form, setForm] = useState({
    public_title: job.public_title ?? job.title ?? '',
    department: job.department ?? '',
    description: job.description ?? '',
    start_date: job.start_date?.slice(0, 10) ?? '',
    end_date: job.end_date?.slice(0, 10) ?? '',
    missions: (job.missions ?? []).join('\n'),
    status: job.status ?? 'open',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const missionsArray = form.missions
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 3)
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_title: form.public_title,
          department: form.department || null,
          description: form.description || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          missions: missionsArray,
          status: form.status,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as JobDetail
      onSuccess(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">Modifier l'offre</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => { void handleSubmit(e) }} className="p-6 space-y-4">
          {error && <p className="text-sm text-[#dc2626] bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Titre public *</label>
            <input
              required
              value={form.public_title}
              onChange={(e) => setForm((f) => ({ ...f, public_title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Statut</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            >
              <option value="open">Ouverte</option>
              <option value="staffed">Pourvue</option>
              <option value="ending_soon">Bientôt terminée</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date début</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Missions (1 par ligne, max 3)</label>
            <textarea rows={3} value={form.missions}
              onChange={(e) => setForm((f) => ({ ...f, missions: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/jobs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<JobDetail>
      })
      .then((data) => { setJob(data); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [id])

  async function handleDelete() {
    if (!job) return
    if (!window.confirm('Supprimer cette offre ?')) return
    setDeleting(true)
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      router.push(`/${locale}/jobs`)
    } finally {
      setDeleting(false)
    }
  }

  async function handleRenew() {
    if (!job) return
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_title: job.public_title ?? job.title,
          title: job.title ?? job.public_title,
          department: job.department,
          company_id: job.companies?.id ?? null,
          description: job.description,
          missions: job.missions,
          parent_job_id: job.id,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const newJob = await res.json() as JobDetail
      router.push(`/${locale}/jobs/${newJob.id}`)
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-16 bg-zinc-100 rounded-xl" />
        <div className="h-32 bg-zinc-100 rounded-xl" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          Offre introuvable
        </div>
      </div>
    )
  }

  const retainedIntern = (job.cases ?? []).find((c) => c.status === 'job_retained')
  const displayTitle = job.public_title ?? job.title ?? 'Offre sans titre'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <Button variant="secondary" size="sm" onClick={() => router.push(`/${locale}/jobs`)}>
        ← Retour
      </Button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-lg font-semibold text-[#1a1918]">{displayTitle}</h1>
          <Badge label={statusLabel(job.status)} variant={statusVariant(job.status)} />
        </div>
        {job.department && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-[#c8a96e] mb-3">
            {job.department}
          </span>
        )}
        <p className="text-sm text-zinc-500">
          du {formatDate(job.start_date)} au {formatDate(job.end_date)}
        </p>
        {job.companies?.name && (
          <p className="text-xs text-zinc-400 mt-1">{job.companies.name}</p>
        )}
      </div>

      {/* Missions */}
      {(job.missions ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Missions</h2>
          <ul className="space-y-1.5">
            {(job.missions ?? []).slice(0, 3).map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="text-[#c8a96e] flex-shrink-0">•</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-2">Description</h2>
          <p className="text-sm text-zinc-600 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {/* Retained intern */}
      {retainedIntern && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#0d9e75] mb-2">Stagiaire retenu</h2>
          <Link
            href={`/${locale}/cases/${retainedIntern.id}`}
            className="text-sm font-medium text-[#1a1918] hover:underline"
          >
            {retainedIntern.first_name} {retainedIntern.last_name}
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" size="sm" onClick={() => setShowEdit(true)}>
          Modifier
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { void handleRenew() }}>
          Renouveler
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { void handleDelete() }}
          disabled={deleting}
        >
          {deleting ? 'Suppression…' : 'Supprimer'}
        </Button>
      </div>

      {showEdit && (
        <EditModal
          job={job}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => { setJob(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}
