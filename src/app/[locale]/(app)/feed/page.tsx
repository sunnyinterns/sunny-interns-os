'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { FunnelKPIs } from '@/components/dashboard/FunnelKPIs'

// ─── Types ───────────────────────────────────────────────────────────────────

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

type Tab = 'dashboard' | 'todo'

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
  const locale = 'fr'

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Todo state
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoCount, setTodoCount] = useState(0)

  const fetchAll = useCallback(() => {
    setLoading(true)

    fetch('/api/todo')
      .then(r => r.ok ? r.json() as Promise<{ todos: TodoItem[]; count: number }> : { todos: [], count: 0 })
      .then(todoData => {
        setTodos(todoData.todos)
        setTodoCount(todoData.count)
        setLoading(false)
      })
      .catch(() => {
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
