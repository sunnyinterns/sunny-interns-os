'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { FunnelKPIs } from '@/components/dashboard/FunnelKPIs'
import type { FeedResponse } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CaseLog {
  id: string
  author_name: string
  action: string
  field_label?: string | null
  old_value?: string | null
  new_value?: string | null
  description: string
  created_at: string
  cases?: { id: string; interns?: { first_name: string; last_name: string } | null } | null
}

interface KpiData {
  candidats_month: number
  rdv_month: number
  active_bali: number
  payments_month: number
}

interface TodoItem {
  id: string
  type: 'action_required' | 'relance' | 'alerte'
  priority: 'urgent' | 'high' | 'normal'
  case_id: string
  intern_name: string
  title: string
  description: string
  cta_label?: string
  cta_url?: string
  days_waiting?: number
  status: string
}

interface ActiveClient {
  id: string
  status: string
  interns: { first_name: string; last_name: string; main_desired_job?: string | null } | null
}

type Tab = 'dashboard' | 'todo'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-zinc-100 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i}>
          <div className="h-4 w-40 bg-zinc-200 rounded mb-3" />
          <div className="space-y-2">
            {[1, 2].map(j => (
              <div key={j} className="h-16 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color }: {
  icon: string
  label: string
  value: number
  sub: string
  color?: 'emerald'
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color === 'emerald' ? 'text-emerald-700' : 'text-[#1a1918]'}`}>{value}</p>
      <p className="text-[11px] text-zinc-400">{sub}</p>
    </div>
  )
}

function TodoCard({ item, locale }: { item: TodoItem; locale: string }) {
  const router = useRouter()
  const priorityColors = {
    urgent: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
    high: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
    normal: { bg: 'bg-white', border: 'border-zinc-200', badge: 'bg-zinc-100 text-zinc-600' },
  }
  const typeLabels: Record<string, string> = {
    action_required: 'Action requise',
    relance: 'Relance',
    alerte: 'Alerte',
  }
  const colors = priorityColors[item.priority]

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
              {typeLabels[item.type] ?? item.type}
            </span>
            {item.days_waiting != null && item.days_waiting > 0 && (
              <span className="text-xs text-zinc-400">{item.days_waiting}j en attente</span>
            )}
          </div>
          <p className="text-sm font-semibold text-[#1a1918] mb-0.5">{item.intern_name}</p>
          <p className="text-sm text-zinc-700">{item.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
        </div>
        {item.cta_label && item.cta_url && (
          <button
            onClick={() => router.push(`/${locale}${item.cta_url}`)}
            className="flex-shrink-0 px-3 py-1.5 bg-[#c8a96e] text-white text-xs font-semibold rounded-lg hover:bg-[#b8945a] transition-all whitespace-nowrap"
          >
            {item.cta_label}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter()
  const locale = 'fr'

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Dashboard state
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [activeClients, setActiveClients] = useState<ActiveClient[]>([])
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([])
  const [feedData, setFeedData] = useState<FeedResponse | null>(null)

  // Todo state
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoCount, setTodoCount] = useState(0)

  const fetchAll = useCallback(() => {
    setLoading(true)

    Promise.all([
      fetch('/api/dashboard/kpis').then(r => r.ok ? r.json() as Promise<KpiData> : null),
      fetch('/api/cases?status=active&limit=10').then(r => r.ok ? r.json() as Promise<ActiveClient[]> : []),
      fetch('/api/case-logs').then(r => r.ok ? r.json() as Promise<CaseLog[]> : []),
      fetch('/api/todo').then(r => r.ok ? r.json() as Promise<{ todos: TodoItem[]; count: number }> : { todos: [], count: 0 }),
      fetch('/api/feed').then(r => r.ok ? r.json() as Promise<FeedResponse> : null),
    ]).then(([kpiData, clients, logs, todoData, feed]) => {
      if (kpiData) setKpis(kpiData)
      setActiveClients(Array.isArray(clients) ? clients.slice(0, 10) : [])
      setCaseLogs(Array.isArray(logs) ? logs.slice(0, 5) : [])
      setTodos(todoData.todos)
      setTodoCount(todoData.count)
      setFeedData(feed)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
    fetchAll()
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Group todos for display
  const urgentTodos = todos.filter(t => t.priority === 'urgent')
  const actionTodos = todos.filter(t => t.type === 'action_required' && t.priority !== 'urgent')
  const relanceTodos = todos.filter(t => t.type === 'relance' && t.priority !== 'urgent')
  const alerteTodos = todos.filter(t => t.type === 'alerte' && t.priority !== 'urgent')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      {/* HEADER with tabs */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-[#1a1918]">Bali Interns</h1>
              <p className="text-xs text-zinc-500 capitalize">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-zinc-500'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('todo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'todo' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-zinc-500'}`}
                >
                  Todo
                  {todoCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{todoCount}</span>
                  )}
                </button>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                + Nouveau dossier
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading && <FeedSkeleton />}

        {!loading && activeTab === 'dashboard' && (
          <>
            {/* Funnel KPIs cliquables — 13 étapes */}
            <FunnelKPIs locale={locale} />

            {/* Activité récente */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">⚡ Activité récente</h2>
              <ActivityFeed locale={locale} showFilters={true} initialLimit={20} />
            </section>

            {/* Calendrier RDV */}
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">📅 Prochains entretiens</h2>
              <CalendarWidget />
            </section>
          </>
        )}

        {!loading && activeTab === 'todo' && (
          <>
            {todos.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-lg font-semibold text-[#1a1918]">Tout est à jour !</p>
                <p className="text-sm text-zinc-500 mt-1">Aucune action en attente</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Alertes urgentes */}
                {urgentTodos.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-2">
                      🚨 Alertes urgentes
                      <span className="bg-red-100 text-red-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{urgentTodos.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {urgentTodos.map(item => <TodoCard key={item.id} item={item} locale={locale} />)}
                    </div>
                  </section>
                )}

                {/* Actions requises */}
                {actionTodos.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-2">
                      ⚡ Actions requises
                      <span className="bg-amber-100 text-amber-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{actionTodos.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {actionTodos.map(item => <TodoCard key={item.id} item={item} locale={locale} />)}
                    </div>
                  </section>
                )}

                {/* Alertes non-urgentes */}
                {alerteTodos.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-3 flex items-center gap-2">
                      🚨 Alertes
                      <span className="bg-orange-100 text-orange-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{alerteTodos.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {alerteTodos.map(item => <TodoCard key={item.id} item={item} locale={locale} />)}
                    </div>
                  </section>
                )}

                {/* Relances */}
                {relanceTodos.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-2">
                      🔔 Relances
                      <span className="bg-blue-100 text-blue-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{relanceTodos.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {relanceTodos.map(item => <TodoCard key={item.id} item={item} locale={locale} />)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
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
