'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'

import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { CaseStatus } from '@/lib/types'

const PRE_EMBAUCHE_STATUSES = [
  'lead', 'rdv_booked', 'qualification_done', 'job_submitted',
  'job_retained', 'convention_signed', 'payment_pending', 'payment_received',
]

interface CaseRow {
  id: string
  status: CaseStatus
  created_at: string
  desired_start_date: string | null
  intern_first_meeting_date: string | null
  interns: {
    first_name: string
    last_name: string
    email: string
    main_desired_job: string | null
  } | null
}

const STATUS_COLORS: Partial<Record<CaseStatus, string>> = {
  rdv_booked: 'bg-blue-100 text-blue-700',
  qualification_done: 'bg-emerald-100 text-emerald-700',
  job_submitted: 'bg-purple-100 text-purple-700',
  job_retained: 'bg-orange-100 text-orange-700',
  convention_signed: 'bg-amber-100 text-amber-700',
  payment_pending: 'bg-red-50 text-red-600',
  payment_received: 'bg-teal-100 text-teal-700',
  lead: 'bg-zinc-100 text-zinc-600',
}

const STATUS_LABELS: Partial<Record<CaseStatus, string>> = {
  lead: 'Lead',
  rdv_booked: 'RDV planifie',
  qualification_done: 'Qualifie',
  job_submitted: 'CV envoye',
  job_retained: 'CV retenu',
  convention_signed: 'Convention signee',
  payment_pending: 'Paiement en attente',
  payment_received: 'Paiement recu',
}

function CasesSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
      ))}
    </div>
  )
}

export default function CasesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'lead', label: 'Lead' },
    { value: 'rdv_booked', label: 'RDV booké' },
    { value: 'qualification_done', label: 'Qualifié' },
    { value: 'job_submitted,job_retained', label: 'Matché' },
    { value: 'convention_signed,payment_pending,payment_received', label: 'Paiement' },
  ]

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cases?view=all')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as CaseRow[]
      const candidats = data.filter((c) => PRE_EMBAUCHE_STATUSES.includes(c.status))
      setCases(candidats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCases()
  }, [fetchCases])

  const filtered = cases.filter((c) => {
    // Status filter
    if (statusFilter !== 'all') {
      const statuses = statusFilter.split(',')
      if (!statuses.includes(c.status)) return false
    }
    // Search filter
    if (!search) return true
    const q = search.toLowerCase()
    const name = `${c.interns?.first_name ?? ''} ${c.interns?.last_name ?? ''}`.toLowerCase()
    return name.includes(q) || (c.interns?.email?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Candidats</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{cases.length} candidats en cours</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          placeholder="Rechercher par nom, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === f.value
                  ? 'bg-[#c8a96e] text-white border-[#c8a96e]'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#c8a96e]/50',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && <CasesSkeleton />}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
              {search ? 'Aucun candidat trouve pour cette recherche' : 'Aucun candidat'}
            </div>
          ) : (
            filtered.map((c) => {
              const intern = c.interns
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/cases/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all"
                >
                  <Avatar name={`${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918]">
                      {intern?.first_name} {intern?.last_name}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {intern?.email ?? '\u2014'}
                      {intern?.main_desired_job ? ` \u00b7 ${intern.main_desired_job}` : ''}
                    </p>
                  </div>
                  {c.intern_first_meeting_date && (
                    <span className="text-xs text-blue-500 flex-shrink-0">
                      📅 {new Date(c.intern_first_meeting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </Link>
              )
            })
          )}
        </div>
      )}

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            setToast({ message: 'Dossier cree avec succes', type: 'success' })
            void fetchCases()
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
