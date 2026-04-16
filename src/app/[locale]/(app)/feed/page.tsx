'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'

/* ── Types ── */
interface CaseItem {
  id: string
  status: string
  payment_date: string | null
  payment_amount: number | null
  visa_submitted_to_agent_at: string | null
  flight_number: string | null
  chauffeur_reserve: boolean | null
  convention_signee_check: boolean | null
  interns: { first_name: string; last_name: string } | null
}

interface EnAttenteItem {
  id: string
  type: string
  waiting_for: string
  due_date: string | null
  label: string | null
  cases: { id: string; status: string; interns: { first_name: string; last_name: string } | null } | null
}

interface NotifItem {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

interface CalEvent {
  id: string
  summary: string | null
  start_datetime: string | null
  intern_name: string | null
  case_id: string | null
}

interface ActionItem {
  caseId: string
  name: string
  action: string
  priority: 'red' | 'amber' | 'green'
}

/* ── Helpers ── */
const CANDIDATE_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained']
const PROCEDURE_STATUSES = ['convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep']

const PIPELINE_COLS = [
  { title: 'Leads & RDV', statuses: ['lead', 'rdv_booked'] },
  { title: 'Matching', statuses: ['qualification_done', 'job_submitted', 'job_retained'] },
  { title: 'En procedure', statuses: ['convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep'] },
  { title: 'En stage & Alumni', statuses: ['active', 'alumni'] },
]

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  rdv_booked: 'RDV planifie',
  qualification_done: 'Qualifie',
  job_submitted: 'CV envoye',
  job_retained: 'Retenu',
  convention_signed: 'Convention signee',
  payment_pending: 'Paiement en attente',
  payment_received: 'Paiement recu',
  visa_docs_sent: 'Docs visa envoyes',
  visa_submitted: 'Visa soumis',
  visa_in_progress: 'Visa en cours',
  visa_received: 'Visa recu',
  arrival_prep: 'Depart imminent',
  active: 'En stage',
  alumni: 'Alumni',
}

const NOTIF_ICONS: Record<string, string> = {
  new_lead: '👤',
  payment_received: '💰',
  payment_notified: '💳',
  convention_signed: '📝',
  engagement_signed: '✍️',
  visa_received: '🛂',
  employer_response: '🏢',
  rdv_cancelled: '❌',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

/* ── Component ── */
export default function FeedPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [enAttente, setEnAttente] = useState<EnAttenteItem[]>([])
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [calEvents, setCalEvents] = useState<CalEvent[]>([])

  useEffect(() => {
    fetch('/api/cases?view=all')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCases(Array.isArray(d) ? d : []))
      .catch(() => null)

    fetch('/api/en-attente')
      .then(r => r.ok ? r.json() : [])
      .then(d => setEnAttente(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => null)

    fetch('/api/admin-notifications')
      .then(r => r.ok ? r.json() : [])
      .then(d => setNotifs(Array.isArray(d) ? d.slice(0, 4) : []))
      .catch(() => null)

    fetch('/api/calendar/events?status=upcoming&days=30')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCalEvents(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => null)
  }, [])

  /* ── Derive "A traiter" actions ── */
  const actions: ActionItem[] = []
  for (const c of cases) {
    const name = c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : '—'
    if (c.status === 'convention_signed' && !c.payment_date) {
      actions.push({ caseId: c.id, name, action: 'Envoyer la facture', priority: 'red' })
    }
    if (c.status === 'payment_received' && !c.visa_submitted_to_agent_at) {
      actions.push({ caseId: c.id, name, action: 'Demarrer le visa', priority: 'amber' })
    }
    if (c.status === 'visa_received' && !c.flight_number) {
      actions.push({ caseId: c.id, name, action: 'Confirmer le vol', priority: 'amber' })
    }
    if (c.status === 'visa_in_progress' && c.visa_submitted_to_agent_at) {
      const daysSince = daysUntil(c.visa_submitted_to_agent_at)
      if (daysSince !== null && daysSince < -10) {
        actions.push({ caseId: c.id, name, action: 'Relancer l\'agent', priority: 'green' })
      }
    }
    if (c.status === 'arrival_prep' && !c.chauffeur_reserve) {
      actions.push({ caseId: c.id, name, action: 'Reserver le chauffeur', priority: 'amber' })
    }
  }

  /* ── Pipeline counts ── */
  const leadsCount = cases.filter(c => c.status === 'lead').length
  const candidatsCount = cases.filter(c => CANDIDATE_STATUSES.includes(c.status) && c.status !== 'lead').length
  const procedureCount = cases.filter(c => PROCEDURE_STATUSES.includes(c.status)).length
  const totalActive = cases.filter(c => !['alumni', 'completed', 'not_interested', 'no_job_found', 'lost'].includes(c.status)).length

  /* ── Calendar: current month days with events ── */
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const eventDays = new Set(calEvents.map(e => e.start_datetime ? new Date(e.start_datetime).getDate() : null).filter(Boolean))
  const dayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
  const firstDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  async function markNotifRead(notif: NotifItem) {
    await fetch('/api/admin-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: notif.id }) }).catch(() => null)
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    if (notif.link) router.push(notif.link)
  }

  const priorityStyles = {
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  const priorityDot = { red: 'bg-red-400', amber: 'bg-amber-400', green: 'bg-emerald-400' }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-[#1a1918]">Dashboard</h1>
              <p className="text-xs text-zinc-500 capitalize">{today}</p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-3 py-1.5 text-sm font-medium bg-[#1a1918] text-white rounded-lg hover:bg-[#2a2927] transition-colors">
              + Nouveau dossier
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ═══ ZONE HAUTE — Focus operationnel ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* COL GAUCHE */}
          <div className="space-y-6">
            {/* A traiter aujourd'hui */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">A traiter aujourd&apos;hui</h2>
              {actions.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Tout est a jour</p>
              ) : (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <Link key={`${a.caseId}-${i}`} href={`/${locale}/clients/${a.caseId}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:opacity-80 ${priorityStyles[a.priority]}`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[a.priority]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs opacity-75">{a.action}</p>
                      </div>
                      <span className="text-xs opacity-50">&rarr;</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* En attente */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">En attente</h2>
                <Link href={`/${locale}/en-attente`} className="text-xs text-[#c8a96e] font-medium hover:underline">Voir tout &rarr;</Link>
              </div>
              {enAttente.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Rien en attente</p>
              ) : (
                <div className="space-y-2">
                  {enAttente.map(item => {
                    const name = item.cases?.interns ? `${item.cases.interns.first_name} ${item.cases.interns.last_name}` : '—'
                    const days = daysUntil(item.due_date)
                    const isOverdue = days !== null && days < 0
                    const isUrgent = days !== null && days >= 0 && days <= 3
                    return (
                      <Link key={item.id} href={`/${locale}/cases/${item.cases?.id ?? ''}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1918]">{name}</p>
                          <p className="text-xs text-zinc-400">{item.type.replace(/_/g, ' ')}</p>
                        </div>
                        {days !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isOverdue ? 'bg-red-50 text-red-600' : isUrgent ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {isOverdue ? `${Math.abs(days)}j en retard` : days === 0 ? "Aujourd'hui" : `${days}j`}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* COL DROITE */}
          <div className="space-y-6">
            {/* Mini calendrier */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                  {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <Link href={`/${locale}/calendar`} className="text-xs text-[#c8a96e] font-medium hover:underline">Calendrier &rarr;</Link>
              </div>
              {/* Mini cal grid */}
              <div className="grid grid-cols-7 gap-0.5 text-center mb-4">
                {dayLabels.map(d => (
                  <div key={d} className="text-[10px] font-medium text-zinc-400 py-1">{d}</div>
                ))}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isToday = day === now.getDate()
                  const hasEvent = eventDays.has(day)
                  return (
                    <div key={day} className={`relative py-1 text-xs rounded ${isToday ? 'bg-[#1a1918] text-white font-bold' : 'text-zinc-600'}`}>
                      {day}
                      {hasEvent && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c8a96e]" />}
                    </div>
                  )
                })}
              </div>
              {/* Prochains events */}
              {calEvents.length > 0 && (
                <div className="space-y-2 border-t border-zinc-100 pt-3">
                  {calEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#c8a96e]/10 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
                        {ev.start_datetime ? new Date(ev.start_datetime).getDate() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1918] truncate">{ev.intern_name ?? ev.summary ?? 'RDV'}</p>
                        <p className="text-xs text-zinc-400">
                          {ev.start_datetime ? new Date(ev.start_datetime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}{' '}
                          {ev.start_datetime ? new Date(ev.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notifications recentes */}
            <section className="bg-white rounded-xl border border-zinc-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Notifications</h2>
                <Link href={`/${locale}/notifications`} className="text-xs text-[#c8a96e] font-medium hover:underline">Voir tout &rarr;</Link>
              </div>
              {notifs.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">Aucune notification</p>
              ) : (
                <div className="space-y-1">
                  {notifs.map(n => (
                    <button key={n.id} onClick={() => markNotifRead(n)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-zinc-50 ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                      <span className="text-base flex-shrink-0">{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1918] truncate">{n.title}</p>
                        <p className="text-xs text-zinc-400">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ═══ ZONE BASSE — Pipeline business ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1a1918]">
              Pipeline <span className="text-zinc-400 font-normal text-sm ml-1">{totalActive} dossiers actifs</span>
            </h2>
            <p className="text-xs text-zinc-400 capitalize">{now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-zinc-100 p-4 text-center">
              <p className="text-2xl font-bold text-[#1a1918]">{leadsCount}</p>
              <p className="text-xs text-zinc-400 mt-1">Leads</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-100 p-4 text-center">
              <p className="text-2xl font-bold text-[#1a1918]">{candidatsCount}</p>
              <p className="text-xs text-zinc-400 mt-1">Candidats actifs</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-100 p-4 text-center">
              <p className="text-2xl font-bold text-[#1a1918]">{procedureCount}</p>
              <p className="text-xs text-zinc-400 mt-1">En procedure</p>
            </div>
          </div>

          {/* Pipeline 4 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE_COLS.map(col => {
              const colCases = cases.filter(c => col.statuses.includes(c.status))
              return (
                <div key={col.title} className="bg-white rounded-xl border border-zinc-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#1a1918]">{col.title}</h3>
                    <span className="text-xs text-zinc-400 font-medium">{colCases.length}</span>
                  </div>
                  {colCases.length === 0 ? (
                    <p className="text-xs text-zinc-300 py-2">Aucun dossier</p>
                  ) : (
                    <div className="space-y-1.5">
                      {colCases.slice(0, 8).map(c => {
                        const name = c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : '—'
                        const isClient = PROCEDURE_STATUSES.includes(c.status) || c.status === 'active' || c.status === 'alumni'
                        const href = isClient ? `/${locale}/clients/${c.id}` : `/${locale}/cases/${c.id}`
                        return (
                          <Link key={c.id} href={href}
                            className="block p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                            <p className="text-sm font-medium text-[#1a1918] truncate">{name}</p>
                            <p className="text-xs text-zinc-400 truncate">{STATUS_LABELS[c.status] ?? c.status}</p>
                          </Link>
                        )
                      })}
                      {colCases.length > 8 && (
                        <p className="text-xs text-zinc-400 text-center pt-1">+{colCases.length - 8} autres</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {showModal && <NewCaseModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); setToast({ message: 'Dossier cree', type: 'success' }) }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
