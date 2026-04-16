'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'

/* ── Types ── */
interface ActionItem {
  case_id: string; intern_name: string; action: string
  reason: string; priority: 'urgent' | 'today' | 'week'
  case_status: string; days_in_stage: number | null
}
interface EnAttenteItem {
  id: string; case_id: string; type: string
  waiting_for: string; due_date: string | null; notes: string | null; intern_name: string
}
interface NotifItem {
  id: string; type: string; title: string
  message: string | null; link: string | null; is_read: boolean; created_at: string
}
interface CalEvent {
  id: string; title: string; start_time: string | null
  end_time: string | null; case_id: string | null; type: string
}
interface PipelineCase {
  case_id: string; intern_name: string; status: string
  stage_label: string; days_in_stage: number | null
  alert?: boolean; desired_start_date?: string | null
  actual_start_date?: string | null; actual_end_date?: string | null; created_at?: string
}
interface DashboardData {
  today_actions: ActionItem[]
  en_attente: EnAttenteItem[]
  en_attente_total: number
  notifications: NotifItem[]
  notifications_unread: number
  calendar_events: CalEvent[]
  pipeline: { leads: PipelineCase[]; candidates: PipelineCase[]; procedure: PipelineCase[]; active: PipelineCase[]; alumni: PipelineCase[] }
  stats: { total_active: number; leads: number; candidates: number; procedure: number; active_internships: number; alumni: number }
}

/* ── Helpers ── */
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const PRIORITY_STYLES = {
  urgent: { bg: 'bg-red-50', border: 'border-red-100', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  today: { bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  week: { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
}

const WAITING_COLORS: Record<string, string> = {
  intern: 'bg-purple-400', school: 'bg-blue-400', agent: 'bg-orange-400', employer: 'bg-sky-400', manager: 'bg-zinc-400',
}
const WAITING_LABELS: Record<string, string> = {
  intern: 'Intern', school: 'Ecole', agent: 'Agent', employer: 'Employeur', manager: 'Manager',
}

const NOTIF_COLORS: Record<string, string> = {
  new_lead: 'bg-zinc-400', payment_received: 'bg-emerald-400', payment_notified: 'bg-emerald-300',
  convention_signed: 'bg-purple-400', engagement_signed: 'bg-zinc-400',
  visa_received: 'bg-blue-400', employer_response: 'bg-sky-400', rdv_cancelled: 'bg-red-400',
}

const PIPELINE_COLS = [
  { key: 'leads' as const, title: 'Leads & RDV', keys: ['leads'] },
  { key: 'candidates' as const, title: 'Matching', keys: ['candidates'] },
  { key: 'procedure' as const, title: 'En procedure', keys: ['procedure'] },
  { key: 'active' as const, title: 'En stage & Alumni', keys: ['active', 'alumni'] },
]

/* ── Skeleton ── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-100 rounded ${className}`} />
}

/* ── Component ── */
export default function FeedPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [data, setData] = useState<DashboardData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => null)
  }, [])

  async function markNotifRead(n: NotifItem) {
    fetch('/api/admin-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => null)
    setData(prev => prev ? { ...prev, notifications: prev.notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x) } : prev)
    if (n.link) router.push(n.link)
  }

  const now = new Date()
  const todayStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Week calendar: current week + next week (14 days)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
  const weekDays: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d)
  }
  const eventDates = new Set((data?.calendar_events ?? []).map(e => e.start_time ? new Date(e.start_time).toDateString() : null).filter(Boolean))

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      {/* ── SECTION 1: Header ── */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between py-5">
            <div>
              <h1 className="text-xl font-bold text-[#1a1918]">Bonjour Sidney</h1>
              <p className="text-sm text-zinc-400 capitalize mt-0.5">
                {todayStr} {data ? `· ${data.today_actions.length} choses a traiter` : ''}
              </p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-3 py-1.5 text-sm font-medium bg-[#1a1918] text-white rounded-lg hover:bg-[#2a2927] transition-colors">
              + Nouveau dossier
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-6 space-y-8">

        {/* ── SECTION 2: Grille 2 colonnes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '42% 1fr', gap: '16px', alignItems: 'start' }} className="max-lg:grid max-lg:!grid-cols-1">
          {/* COL GAUCHE (42%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* A traiter */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">A traiter</h2>
              {!data ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : data.today_actions.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">Tout est a jour</p>
              ) : (
                <div className="space-y-2">
                  {data.today_actions.map((a, i) => {
                    const s = PRIORITY_STYLES[a.priority]
                    return (
                      <Link key={`${a.case_id}-${i}`} href={`/${locale}/clients/${a.case_id}`}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:opacity-80 ${s.bg} ${s.border}`}>
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${s.text}`}>{a.intern_name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{a.action}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{a.reason}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge} flex-shrink-0`}>
                          {a.priority === 'urgent' ? 'Urgent' : a.priority === 'today' ? 'Aujourd\'hui' : 'Cette semaine'}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {/* En attente */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">En attente</h2>
                <Link href={`/${locale}/en-attente`} className="text-xs text-[#c8a96e] font-medium hover:underline">
                  Voir tout{data ? ` (${data.en_attente_total})` : ''} &rarr;
                </Link>
              </div>
              {!data ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : data.en_attente.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Rien en attente</p>
              ) : (
                <div className="space-y-2">
                  {data.en_attente.slice(0, 3).map(item => {
                    const days = daysUntil(item.due_date)
                    const overdue = days !== null && days < 0
                    const dotColor = WAITING_COLORS[item.waiting_for] ?? 'bg-zinc-400'
                    return (
                      <Link key={item.id} href={`/${locale}/cases/${item.case_id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1918]">{item.intern_name}</p>
                          <p className="text-xs text-zinc-400">{item.type.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {days !== null && (
                            <span className={`text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-zinc-400'}`}>
                              {overdue ? `${Math.abs(days)}j retard` : days === 0 ? "Auj." : `${days}j`}
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                            {WAITING_LABELS[item.waiting_for] ?? item.waiting_for}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* COL DROITE (58%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Cette semaine */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cette semaine</h2>
                <Link href={`/${locale}/calendar`} className="text-xs text-[#c8a96e] font-medium hover:underline">Calendrier &rarr;</Link>
              </div>
              {/* Week grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
                  <div key={d} className="text-[10px] font-medium text-zinc-400 text-center py-1">{d}</div>
                ))}
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === now.toDateString()
                  const hasEvent = eventDates.has(d.toDateString())
                  return (
                    <div key={i} className={`relative text-center py-1.5 rounded-lg text-xs ${isToday ? 'bg-[#1a1918] text-white font-bold' : 'text-zinc-600'}`}>
                      {d.getDate()}
                      {hasEvent && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c8a96e]" />}
                    </div>
                  )
                })}
              </div>
              {/* Prochains events */}
              {!data ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : data.calendar_events.length > 0 ? (
                <div className="space-y-2 border-t border-zinc-100 pt-3">
                  {data.calendar_events.slice(0, 3).map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-[#c8a96e]/10 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
                        {ev.start_time ? new Date(ev.start_time).getDate() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1918] truncate">{ev.title}</p>
                        <p className="text-xs text-zinc-400">
                          {ev.start_time ? new Date(ev.start_time).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                          {ev.start_time ? ` · ${new Date(ev.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-3 border-t border-zinc-100">Aucun RDV prevu</p>
              )}
            </section>

            {/* Notifications */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Notifications
                  {data && data.notifications_unread > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{data.notifications_unread}</span>
                  )}
                </h2>
                <Link href={`/${locale}/notifications`} className="text-xs text-[#c8a96e] font-medium hover:underline">Voir tout &rarr;</Link>
              </div>
              {!data ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : data.notifications.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Aucune notification</p>
              ) : (
                <div className="space-y-1">
                  {data.notifications.slice(0, 4).map(n => {
                    const dotColor = NOTIF_COLORS[n.type] ?? 'bg-zinc-400'
                    const msg = n.message && n.message.length > 60 ? n.message.slice(0, 60) + '...' : n.message
                    return (
                      <button key={n.id} onClick={() => markNotifRead(n)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-zinc-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1918] truncate">{n.title}</p>
                          {msg && <p className="text-xs text-zinc-400 truncate mt-0.5">{msg}</p>}
                        </div>
                        <span className="text-[11px] text-zinc-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── SECTION 3: Stats pills ── */}
        {data && (
          <div className="flex flex-wrap items-center gap-2 py-3 border-t border-b border-zinc-200">
            <span className="text-sm font-semibold text-[#1a1918]">{data.stats.total_active} dossiers actifs</span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-500">{data.stats.leads} leads</span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-500">{data.stats.candidates} en matching</span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-500">{data.stats.procedure} en procedure</span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-500">{data.stats.active_internships} en stage</span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-500">{data.stats.alumni} alumni</span>
          </div>
        )}

        {/* ── SECTION 4: Pipeline kanban ── */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Pipeline</h2>
          {!data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PIPELINE_COLS.map(col => {
                const items: PipelineCase[] = col.keys.flatMap(k => (data.pipeline as Record<string, PipelineCase[]>)[k] ?? [])
                return (
                  <div key={col.key} className="bg-white rounded-xl border border-zinc-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[#1a1918]">{col.title}</h3>
                      <span className="text-xs text-zinc-400 font-medium">{items.length}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-zinc-300 py-2">Aucun dossier</p>
                    ) : (
                      <div className="space-y-1">
                        {items.slice(0, 10).map(c => (
                          <Link key={c.case_id} href={`/${locale}/cases/${c.case_id}`}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1a1918] truncate">{c.intern_name}</p>
                              <p className="text-xs text-zinc-400 truncate">{c.stage_label}</p>
                            </div>
                            {c.alert && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                          </Link>
                        ))}
                        {items.length > 10 && (
                          <p className="text-xs text-zinc-400 text-center pt-1">+{items.length - 10} autres</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {showModal && <NewCaseModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); setToast({ message: 'Dossier cree', type: 'success' }) }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
