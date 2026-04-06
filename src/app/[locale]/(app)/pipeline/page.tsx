'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/cases/KanbanBoard'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'

interface CaseData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  return_date?: string | null
  assigned_to?: string | null
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
      const data = await res.json() as CaseData[]
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
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
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
        {!loading && !error && (
          <KanbanBoard cases={cases} locale={locale} />
        )}
      </div>

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCaseCreated}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
