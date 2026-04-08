'use client'

import { useEffect, useState, useCallback } from 'react'
import { FeedZone } from '@/components/feed/FeedZone'
import { EmptyFeed } from '@/components/feed/EmptyFeed'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { FeedData } from '@/lib/types'

interface KPIs {
  candidats_month: number
  active_bali: number
  revenue_month: number
  pending_payment: number
}

interface Alert {
  id: string
  type: 'critical' | 'attention'
  message: string
  case_id: string
  intern_name: string
  action_url: string
}

function FeedSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-4 w-32 bg-zinc-200 rounded mb-3" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="h-16 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

type FeedFilter = 'all' | 'pending' | 'mine' | 'high'

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedData | null>(null)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/feed').then(r => r.ok ? r.json() as Promise<FeedData> : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch('/api/dashboard/kpis').then(r => r.ok ? r.json() as Promise<KPIs> : null).catch(() => null),
      fetch('/api/dashboard/alerts').then(r => r.ok ? r.json() as Promise<Alert[]> : []).catch(() => [] as Alert[]),
    ])
      .then(([feedData, kpiData, alertData]) => {
        setFeed(feedData)
        setKpis(kpiData)
        setAlerts(alertData as Alert[])
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
    fetchAll()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
      </div>

      {/* SECTION 1 — Alertes du jour */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
            Alertes du jour ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <a
                key={alert.id}
                href={alert.action_url}
                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors"
                style={{
                  background: alert.type === 'critical' ? '#fef2f2' : '#fffbeb',
                  borderColor: alert.type === 'critical' ? '#fecaca' : '#fde68a',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{alert.type === 'critical' ? '🔴' : '🟡'}</span>
                  <span className="text-sm text-[#1a1918]">{alert.message}</span>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: alert.type === 'critical' ? '#dc2626' : '#d97706',
                    color: 'white',
                  }}
                >
                  {alert.type === 'critical' ? 'Haute' : 'Normale'}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2 — KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Candidats ce mois', value: kpis.candidats_month, icon: '📋' },
            { label: 'Actifs à Bali', value: kpis.active_bali, icon: '🌴' },
            { label: 'Revenus ce mois', value: `${kpis.revenue_month.toLocaleString('fr-FR')}€`, icon: '💰' },
            { label: 'Attente paiement', value: kpis.pending_payment, icon: '⏳' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white border border-zinc-200 rounded-xl p-4 text-center"
            >
              <span className="text-xl mb-1 block">{kpi.icon}</span>
              <p className="text-2xl font-bold text-[#1a1918]">{kpi.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3 — Agenda semaine (placeholder) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Agenda de la semaine</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'RDVs qualif', count: feed?.todo.filter(i => i.status === 'rdv_booked').length ?? 0 },
            { label: 'Arrivées', count: feed?.todo.filter(i => i.status === 'arrival_prep').length ?? 0 },
            { label: 'Fins de stage', count: feed?.today.filter(i => i.status === 'active').length ?? 0 },
          ].map((item) => (
            <div key={item.label} className="bg-zinc-50 rounded-lg p-3">
              <p className="text-lg font-bold text-[#1a1918]">{item.count}</p>
              <p className="text-xs text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading && <FeedSkeleton />}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          Erreur lors du chargement : {error}
        </div>
      )}

      {/* Feed filter tabs */}
      {feed && !feed.isEmpty && (
        <div className="flex gap-2 mb-4">
          {([
            { key: 'all' as FeedFilter, label: 'Tous' },
            { key: 'pending' as FeedFilter, label: 'Non traités' },
            { key: 'mine' as FeedFilter, label: 'Mes dossiers' },
            { key: 'high' as FeedFilter, label: 'Haute priorité' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFeedFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                feedFilter === f.key
                  ? 'bg-[#c8a96e] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* SECTION 4 — Activity Feed */}
      {feed && feed.isEmpty && (
        <EmptyFeed onCreateCase={() => setShowModal(true)} />
      )}

      {feed && !feed.isEmpty && (
        <div className="space-y-8">
          <FeedZone
            title="Aujourd'hui"
            count={feed.today.length}
            items={feed.today}
            type="today"
          />
          <FeedZone
            title="À faire maintenant"
            count={feed.todo.length}
            items={feed.todo}
            type="todo"
          />
          <FeedZone
            title="En attente"
            count={feed.waiting.length}
            items={feed.waiting}
            type="waiting"
          />
          <FeedZone
            title="Complété aujourd'hui"
            count={feed.completed.length}
            items={feed.completed}
            type="completed"
          />
        </div>
      )}

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
