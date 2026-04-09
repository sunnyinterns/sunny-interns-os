'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard, type ViewMode } from '@/components/cases/KanbanBoard'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import { CreateGroupModal } from '@/components/pipeline/CreateGroupModal'

interface CaseData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  desired_start_date?: string | null
  actual_start_date?: string | null
  return_date?: string | null
  assigned_to?: string | null
  internship_type?: string | null
  school?: string | null
  passport_expiry?: string | null
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  logement_reserve?: boolean | null
  scooter_reserve_check?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
  interns?: { first_name?: string; last_name?: string; passport_expiry?: string; school?: string } | null
  [key: string]: unknown
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex-shrink-0 w-[220px] h-56 bg-[#f4f4f5] rounded-xl" />
      ))}
    </div>
  )
}

export default function PipelinePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [cases, setCases] = useState<CaseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // View & filters
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [month, setMonth] = useState('')

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (assignedTo) qs.set('assigned_to', assignedTo)
      if (month) qs.set('month', month)
      const res = await fetch(`/api/cases?${qs.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json() as CaseData[]
      const data = raw.map((c) => ({
        ...c,
        first_name: c.first_name ?? c.interns?.first_name ?? '',
        last_name: c.last_name ?? c.interns?.last_name ?? '',
        school: c.school ?? ((c as Record<string, any>).schools as any)?.name ?? c.interns?.school ?? null,
        passport_expiry: c.interns?.passport_expiry ?? null,
        desired_start_date: c.desired_start_date ?? c.actual_start_date ?? null,
      }))
      setCases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [assignedTo, month])

  useEffect(() => {
    void fetchCases()
  }, [fetchCases])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
    void fetchCases()
  }

  const activeCasesCount = cases.filter((c) =>
    !['alumni', 'not_interested', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed', 'no_job_found', 'lost'].includes(c.status)
  ).length

  return (
    <div className="flex flex-col h-full p-6 gap-3">
      {/* Header compact */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1918]">Pipeline</h1>
          <p className="text-[11px] text-[#71717a]">{activeCasesCount} candidats actifs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[#f4f4f5] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-[#a1a1aa] hover:text-[#71717a]'}`}
              title="Vue Kanban"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="5" height="18" rx="1" />
                <rect x="10" y="3" width="5" height="12" rx="1" />
                <rect x="17" y="3" width="5" height="15" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-[#a1a1aa] hover:text-[#71717a]'}`}
              title="Vue Liste"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShowGroupModal(true)}>
            + Groupe
          </Button>
          <a
            href="/apply"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#c8a96e] text-[#c8a96e] rounded-lg hover:bg-[#c8a96e] hover:text-white transition-colors"
          >
            🔗 Candidat
          </a>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            + Nouveau
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#e4e4e7] rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e] placeholder:text-[#a1a1aa]"
            placeholder="Rechercher un nom…"
          />
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-2.5 py-1.5 text-[12px] border border-[#e4e4e7] rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
          placeholder="Mois"
        />
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="px-2.5 py-1.5 text-[12px] border border-[#e4e4e7] rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 w-36 placeholder:text-[#a1a1aa]"
          placeholder="Manager"
        />
        {(assignedTo || month || search) && (
          <button
            onClick={() => { setAssignedTo(''); setMonth(''); setSearch('') }}
            className="text-[11px] text-[#a1a1aa] hover:text-[#71717a] transition-colors whitespace-nowrap"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && <PipelineSkeleton />}
        {error && (
          <div className="px-4 py-3 bg-[#fef2f2] border border-red-200 rounded-xl text-[12px] text-[#dc2626]">
            Erreur : {error}
          </div>
        )}
        {!loading && !error && cases.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#c8a96e]/10 flex items-center justify-center mb-4">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c8a96e" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[#1a1918] mb-1.5">Pipeline vide</h2>
            <p className="text-[12px] text-[#a1a1aa] max-w-xs mb-4">
              Aucun dossier. Créez votre premier stagiaire.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-[12px] font-medium rounded-lg transition-colors"
            >
              + Premier dossier
            </button>
          </div>
        )}
        {!loading && !error && cases.length > 0 && (
          <KanbanBoard cases={cases} locale={locale} search={search} viewMode={viewMode} />
        )}
      </div>

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCaseCreated}
        />
      )}

      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={() => {
            setShowGroupModal(false)
            setToast({ message: 'Groupe créé avec succès', type: 'success' })
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
