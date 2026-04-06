'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { JobCard } from '@/components/jobs/JobCard'
import type { Job } from '@/components/jobs/JobCard'

type TabId = 'open' | 'staffed' | 'ending_soon'

const TABS: { id: TabId; label: string }[] = [
  { id: 'open', label: 'Offres ouvertes' },
  { id: 'staffed', label: 'Pourvues' },
  { id: 'ending_soon', label: 'Bientôt terminées' },
]

interface NewJobForm {
  title: string
  department: string
  company_id: string
  description: string
  start_date: string
  end_date: string
  missions: string
}

const EMPTY_FORM: NewJobForm = {
  title: '',
  department: '',
  company_id: '',
  description: '',
  start_date: '',
  end_date: '',
  missions: '',
}

interface NewJobModalProps {
  onClose: () => void
  onSuccess: () => void
}

function NewJobModal({ onClose, onSuccess }: NewJobModalProps) {
  const [form, setForm] = useState<NewJobForm>(EMPTY_FORM)
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

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          public_title: form.title,
          department: form.department || null,
          company_id: form.company_id || null,
          description: form.description || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          missions: missionsArray,
        }),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle offre</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => { void handleSubmit(e) }} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-[#dc2626] bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Titre *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              placeholder="Ex: Assistante Marketing"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Département</label>
            <input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              placeholder="Ex: Marketing, Finance…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Missions (1 par ligne, max 3)</label>
            <textarea
              rows={3}
              value={form.missions}
              onChange={(e) => setForm((f) => ({ ...f, missions: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
              placeholder="Ex: Gestion des réseaux sociaux&#10;Création de contenus&#10;Reporting hebdomadaire"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'Création…' : 'Créer l\'offre'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [activeTab, setActiveTab] = useState<TabId>('open')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchJobs = useCallback(async (tab: TabId) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs?status=${tab}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Job[]
      setJobs(data)
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchJobs(activeTab)
  }, [activeTab, fetchJobs])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Offres d'emploi</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{jobs.length} offre{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouvelle offre
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-[#c8a96e] text-[#c8a96e]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
          Aucune offre dans cette catégorie
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} locale={locale} />
          ))}
        </div>
      )}

      {showModal && (
        <NewJobModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            void fetchJobs(activeTab)
          }}
        />
      )}
    </div>
  )
}
