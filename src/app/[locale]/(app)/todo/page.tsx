'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface TodoItem {
  id: string
  type: string
  priority: 'urgent' | 'high' | 'normal'
  case_id: string
  intern_name: string
  title: string
  description: string
  cta_label: string
  cta_url: string
  days_waiting?: number
  status: string
}

const PRIORITY_CONFIG = {
  urgent: { label: '🚨 Urgent', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  high: { label: '⚠️ Important', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  normal: { label: '📋 Normal', bg: 'bg-zinc-50', border: 'border-zinc-200', badge: 'bg-zinc-100 text-zinc-600' },
}

export default function TodoPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    const r = await fetch('/api/todo')
    if (r.ok) {
      const d = await r.json() as { todos: TodoItem[] } | TodoItem[]
      setTodos(Array.isArray(d) ? d : d.todos ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetchTodos() }, [fetchTodos])

  const urgent = todos.filter(t => t.priority === 'urgent')
  const high = todos.filter(t => t.priority === 'high')
  const normal = todos.filter(t => t.priority === 'normal')

  function TodoCard({ item }: { item: TodoItem }) {
    const cfg = PRIORITY_CONFIG[item.priority]
    return (
      <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
              {item.days_waiting !== undefined && item.days_waiting > 0 && (
                <span className="text-xs text-zinc-400">depuis {item.days_waiting}j</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1a1918]">{item.title}</p>
            {item.intern_name && <p className="text-xs text-zinc-500 mt-0.5">{item.intern_name}</p>}
            <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/cases/${item.case_id}`)}
            className="flex-shrink-0 px-3 py-1.5 bg-[#1a1918] text-white text-xs font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {item.cta_label}
          </button>
        </div>
      </div>
    )
  }

  function Section({ title, items }: { title: string; items: TodoItem[] }) {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          {title} <span className="bg-zinc-200 text-zinc-600 px-1.5 rounded-full text-[10px] font-bold">{items.length}</span>
        </h2>
        <div className="space-y-2">{items.map(i => <TodoCard key={i.id} item={i} />)}</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">✅ To Do</h1>
        <p className="text-sm text-zinc-400 mt-1">Actions prioritaires à traiter</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : todos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🎉</p>
          <p className="font-semibold text-[#1a1918]">Tout est à jour !</p>
          <p className="text-sm text-zinc-400 mt-1">Aucune action en attente</p>
        </div>
      ) : (
        <>
          <Section title="🚨 Urgent" items={urgent} />
          <Section title="⚠️ Important" items={high} />
          <Section title="📋 À traiter" items={normal} />
        </>
      )}
    </div>
  )
}
