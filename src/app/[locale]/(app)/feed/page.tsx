'use client'

import { useEffect, useState, useCallback } from 'react'
import { FeedZone } from '@/components/feed/FeedZone'
import { EmptyFeed } from '@/components/feed/EmptyFeed'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { FeedData } from '@/lib/types'

interface AgendaCase {
  id: string
  first_name: string
  last_name: string
  status: string
  actual_start_date?: string | null
  actual_end_date?: string | null
}

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

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: 'Demande', bg: '#e5e7eb', text: '#374151' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#7c3aed' },
  job_submitted: { label: 'Jobs proposés', bg: '#ffedd5', text: '#c2410c' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#065f46' },
  convention_signed: { label: 'Convention', bg: '#d1fae5', text: '#065f46' },
  payment_pending: { label: 'Paiement \u23f3', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé \u2713', bg: '#d1fae5', text: '#065f46' },
  visa_docs_sent: { label: 'Docs visa', bg: '#ffedd5', text: '#c2410c' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa reçu \u2713', bg: '#d1fae5', text: '#065f46' },
  arrival_prep: { label: 'Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: 'En stage \ud83c\udf34', bg: '#d1fae5', text: '#065f46' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return d >= startOfWeek && d <= endOfWeek
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedData | null>(null)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [agendaCases, setAgendaCases] = useState<AgendaCase[]>([])
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
      fetch('/api/cases').then(r => r.ok ? r.json() as Promise<AgendaCase[]> : []).catch(() => [] as AgendaCase[]),
    ])
      .then(([feedData, kpiData, alertData, casesData]) => {
        setFeed(feedData)
        setKpis(kpiData)
        setAlerts(alertData as Alert[])
        setAgendaCases(casesData as AgendaCase[])
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

      {/* SECTION 3 — Agenda semaine */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Agenda de la semaine</h2>
        {(() => {
          const arrivals = agendaCases.filter(c => c.actual_start_date && isThisWeek(c.actual_start_date)).slice(0, 5)
          const departures = agendaCases.filter(c => c.actual_end_date && isThisWeek(c.actual_end_date)).slice(0, 5)
          const rdvs = feed?.todo.filter(i => i.status === 'rdv_booked').length ?? 0
          return (
            <div className="space-y-4">
              {/* Summary counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-[#1a1918]">{rdvs}</p>
                  <p className="text-xs text-zinc-500">RDVs qualif</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-[#1a1918]">{arrivals.length}</p>
                  <p className="text-xs text-zinc-500">Arrivées</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-[#1a1918]">{departures.length}</p>
                  <p className="text-xs text-zinc-500">Fins de stage</p>
                </div>
              </div>

              {/* Arrivals list */}
              {arrivals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Arrivées cette semaine</p>
                  <div className="space-y-1.5">
                    {arrivals.map(c => {
                      const b = STATUS_BADGE[c.status]
                      return (
                        <a key={c.id} href={`/fr/cases/${c.id}?tab=process`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors">
                          <span className="text-sm font-medium text-[#1a1918] flex-1">{c.first_name} {c.last_name}</span>
                          <span className="text-xs text-zinc-400">{new Date(c.actual_start_date!).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          {b && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: b.bg, color: b.text }}>{b.label}</span>}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Departures list */}
              {departures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Fins de stage cette semaine</p>
                  <div className="space-y-1.5">
                    {departures.map(c => {
                      const b = STATUS_BADGE[c.status]
                      return (
                        <a key={c.id} href={`/fr/cases/${c.id}?tab=process`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors">
                          <span className="text-sm font-medium text-[#1a1918] flex-1">{c.first_name} {c.last_name}</span>
                          <span className="text-xs text-zinc-400">{new Date(c.actual_end_date!).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          {b && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: b.bg, color: b.text }}>{b.label}</span>}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {arrivals.length === 0 && departures.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-2">Aucune arrivée ou fin de stage cette semaine</p>
              )}
            </div>
          )
        })()}
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
