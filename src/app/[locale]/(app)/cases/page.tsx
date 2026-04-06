'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { CaseStatus } from '@/lib/types'

interface CaseRow {
  id: string
  first_name: string
  last_name: string
  status: CaseStatus
  arrival_date: string | null
  destination: string | null
  created_at: string
}

function statusToVariant(status: CaseStatus): 'default' | 'success' | 'attention' | 'critical' | 'info' {
  if (['payment_pending', 'visa_in_progress'].includes(status)) return 'attention'
  if (['not_interested', 'not_qualified', 'visa_refused', 'suspended'].includes(status)) return 'critical'
  if (['active', 'alumni', 'completed'].includes(status)) return 'success'
  return 'default'
}

const STATUS_LABELS: Partial<Record<CaseStatus, string>> = {
  lead: 'Lead',
  rdv_booked: 'RDV planifié',
  qualification_done: 'Qualifié',
  job_submitted: 'CV envoyé',
  job_retained: 'CV retenu',
  convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente',
  payment_received: 'Paiement reçu',
  visa_in_progress: 'Visa en cours',
  visa_received: 'Visa reçu',
  arrival_prep: 'Arrivée prévue',
  active: 'En stage',
  alumni: 'Alumni',
  not_interested: 'Pas intéressé',
  not_qualified: 'Non qualifié',
  on_hold: 'En pause',
  suspended: 'Suspendu',
  visa_refused: 'Visa refusé',
  archived: 'Archivé',
  completed: 'Terminé',
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

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as CaseRow[]
      setCases(data)
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
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.destination?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Dossiers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{cases.length} dossiers au total</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom, destination…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        />
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
              {search ? 'Aucun dossier trouvé pour cette recherche' : 'Aucun dossier'}
            </div>
          ) : (
            filtered.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/cases/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all"
              >
                <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a1918]">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {c.destination ?? '—'}
                    {c.arrival_date
                      ? ` · ${new Date(c.arrival_date).toLocaleDateString('fr-FR')}`
                      : ''}
                  </p>
                </div>
                <Badge
                  label={STATUS_LABELS[c.status] ?? c.status}
                  variant={statusToVariant(c.status)}
                />
              </Link>
            ))
          )}
        </div>
      )}

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            setToast({ message: 'Dossier créé avec succès', type: 'success' })
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
