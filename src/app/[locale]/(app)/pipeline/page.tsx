'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/cases/KanbanBoard'
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
    <div className="flex gap-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex-shrink-0 w-52 h-64 bg-zinc-100 rounded-xl" />
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

  // Filters
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
      // Flatten intern fields for KanbanBoard
      const data = raw.map((c) => ({
        ...c,
        first_name: c.first_name ?? c.interns?.first_name ?? '',
        last_name: c.last_name ?? c.interns?.last_name ?? '',
        school: c.school ?? (c as any).schools?.name ?? c.interns?.school ?? null,
        passport_expiry: c.interns?.passport_expiry ?? null,
        desired_start_date: c.desired_start_date ?? (c as any).actual_start_date ?? null,
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

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Pipeline</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{cases.length} dossiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowGroupModal(true)}>
            + Créer un groupe
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            + Nouveau dossier
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          placeholder="Mois"
        />
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-48"
          placeholder="Gestionnaire (ID)"
        />
        {(assignedTo || month) && (
          <button
            onClick={() => { setAssignedTo(''); setMonth('') }}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Effacer filtres
          </button>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && <PipelineSkeleton />}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
            Erreur : {error}
          </div>
        )}
        {!loading && !error && cases.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#c8a96e]/10 flex items-center justify-center mb-5">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#c8a96e" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[#1a1918] mb-2">Pipeline vide</h2>
            <p className="text-sm text-zinc-400 max-w-xs mb-6">
              Aucun dossier dans le pipeline. Commencez par créer votre premier stagiaire.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Créer un premier dossier
            </button>
          </div>
        )}
        {!loading && !error && cases.length > 0 && (
          <KanbanBoard cases={cases} locale={locale} />
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
