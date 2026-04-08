'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import type { FeedResponse, FeedItem } from '@/lib/types'

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

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: 'Lead', bg: '#f4f4f5', text: '#71717a' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualifié', bg: '#ede9fe', text: '#6d28d9' },
  job_submitted: { label: 'Jobs proposés', bg: '#fef3c7', text: '#d97706' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#059669' },
  convention_signed: { label: 'Convention', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: 'Paiement', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: 'Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: 'Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa reçu', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: 'Arrivée', bg: '#fee2e2', text: '#dc2626' },
  active: { label: 'En stage', bg: '#d1fae5', text: '#059669' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
}

const URGENCY_BORDER: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  normal: '#c8a96e',
  low: '#d4d4d8',
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
}

function FeedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i}>
          <div className="h-4 w-40 bg-zinc-200 rounded mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-16 bg-zinc-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KpiCard({
  icon,
  value,
  label,
  highlight,
  onClick,
}: {
  icon: string
  value: string | number
  label: string
  highlight?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
        highlight
          ? 'bg-red-50 border-red-200 hover:bg-red-100'
          : 'bg-white border-zinc-200 hover:bg-zinc-50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <p className={`text-lg font-bold ${highlight ? 'text-[#dc2626]' : 'text-[#1a1918]'}`}>{value}</p>
        <p className="text-[11px] text-zinc-500 leading-tight">{label}</p>
      </div>
    </button>
  )
}

function TodoCard({ item, onNavigate }: { item: FeedItem; onNavigate: (id: string) => void }) {
  const badge = STATUS_BADGE[item.status]
  const borderColor = URGENCY_BORDER[item.urgency] ?? URGENCY_BORDER.normal

  function handleCta() {
    if (item.cta_action === 'open_meet' && item.google_meet_link) {
      window.open(item.google_meet_link, '_blank')
    } else {
      onNavigate(item.case_id)
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100 hover:shadow-sm transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="w-8 h-8 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-white">{getInitials(item.intern_name)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#1a1918] truncate">{item.intern_name}</span>
          {badge && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.school_name && (
            <span className="text-[11px] text-zinc-400 truncate max-w-[120px]">{item.school_name}</span>
          )}
          {item.school_name && item.days_info && <span className="text-zinc-300 text-[10px]">·</span>}
          {item.days_info && (
            <span className={`text-[11px] font-medium ${item.urgency === 'critical' ? 'text-[#dc2626]' : item.urgency === 'high' ? 'text-[#d97706]' : 'text-zinc-400'}`}>
              {item.days_info}
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
          <span className="inline-block w-3 h-3 text-center leading-3">📌</span>
          {item.action_label}
        </p>
      </div>

      <Button size="sm" variant={item.cta_action === 'open_meet' ? 'primary' : 'secondary'} onClick={handleCta}>
        {item.cta_label}
      </Button>
    </div>
  )
}

function WaitingRow({ item, onNavigate }: { item: FeedItem; onNavigate: (id: string) => void }) {
  const badge = STATUS_BADGE[item.status]

  return (
    <button
      onClick={() => onNavigate(item.case_id)}
      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg hover:bg-zinc-100 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-zinc-500">{getInitials(item.intern_name)}</span>
      </div>
      <span className="text-sm font-medium text-[#1a1918] truncate">{item.intern_name}</span>
      {badge && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      )}
      <span className="text-[11px] text-zinc-400 truncate flex-1">{item.wait_label}</span>
      {item.days_info && (
        <span className="text-[11px] text-zinc-400 whitespace-nowrap">{item.days_info}</span>
      )}
      <span className="text-zinc-300 text-sm">→</span>
    </button>
  )
}

function ActiveRow({ item, onNavigate }: { item: FeedItem; onNavigate: (id: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(item.case_id)}
      className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-emerald-100/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-emerald-700">{getInitials(item.intern_name)}</span>
      </div>
      <span className="text-sm font-medium text-[#1a1918] truncate flex-1">{item.intern_name}</span>
      {item.days_info && (
        <span className="text-[11px] text-emerald-600 whitespace-nowrap">{item.days_info}</span>
      )}
      <span className="text-zinc-300 text-sm">→</span>
    </button>
  )
}

function AlumniRow({ item, onNavigate }: { item: FeedItem; onNavigate: (id: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(item.case_id)}
      className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-amber-50/50 transition-colors text-left"
    >
      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-[#92400e]">{getInitials(item.intern_name)}</span>
      </div>
      <span className="text-sm font-medium text-[#1a1918] truncate flex-1">{item.intern_name}</span>
      {item.school_name && (
        <span className="text-[11px] text-zinc-400 truncate max-w-[120px]">{item.school_name}</span>
      )}
      <span className="text-zinc-300 text-sm">→</span>
    </button>
  )
}

export default function FeedPage() {
  const router = useRouter()
  const [data, setData] = useState<FeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [alumniOpen, setAlumniOpen] = useState(false)
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([])

  const fetchFeed = useCallback(() => {
    setLoading(true)
    fetch('/api/feed')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<FeedResponse>
      })
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchFeed()
    fetch('/api/case-logs')
      .then(r => r.ok ? r.json() as Promise<CaseLog[]> : [])
      .then(setCaseLogs)
      .catch(() => {})
  }, [fetchFeed])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
    fetchFeed()
  }

  function navigateCase(caseId: string) {
    router.push(`/fr/cases/${caseId}?tab=process`)
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1918]">Bonjour 👋</h1>
          <p className="text-xs text-zinc-400 mt-0.5 capitalize">{today}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          + Nouveau dossier
        </Button>
      </div>

      {loading && <FeedSkeleton />}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626] mb-4">
          Erreur : {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard
              icon="⚡"
              value={data.kpis.todo_count}
              label="À faire"
              highlight={data.kpis.todo_count > 0}
              onClick={() => scrollTo('section-todo')}
            />
            <KpiCard
              icon="🌴"
              value={data.kpis.active_bali}
              label="En stage"
              onClick={() => scrollTo('section-active')}
            />
            <KpiCard
              icon="🛫"
              value={data.kpis.arriving_soon}
              label="Arrivent bientôt"
              onClick={() => scrollTo('section-waiting')}
            />
            <KpiCard
              icon="💰"
              value={`${Math.round(data.kpis.revenue_month / 1000)}k€`}
              label="Ce mois"
            />
          </div>

          {/* SECTION TODO */}
          <section id="section-todo" className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1a1918] mb-3 flex items-center gap-2">
              ⚡ Actions requises
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-50 text-[#dc2626] text-xs font-bold">
                {data.todo.length}
              </span>
            </h2>

            {data.todo.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium text-emerald-700">
                  Rien à faire pour l&#39;instant — tu es à jour !
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {data.todo.map(item => (
                  <TodoCard key={item.case_id} item={item} onNavigate={navigateCase} />
                ))}
              </div>
            )}
          </section>

          {/* SECTION WAITING */}
          <section id="section-waiting" className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              ⏳ En attente
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-bold">
                {data.waiting.length}
              </span>
            </h2>

            {data.waiting.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
                Aucun dossier en attente
              </div>
            ) : (
              <div className="bg-zinc-50 rounded-xl border border-zinc-100 divide-y divide-zinc-100">
                {data.waiting.map(item => (
                  <WaitingRow key={item.case_id} item={item} onNavigate={navigateCase} />
                ))}
              </div>
            )}
          </section>

          {/* SECTION ACTIVE */}
          <section id="section-active" className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-2">
              🌴 En stage
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                {data.active.length}
              </span>
            </h2>

            {data.active.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
                Aucun stagiaire actif
              </div>
            ) : (
              <div className="bg-emerald-50/30 rounded-xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-emerald-100">
                {data.active.map(item => (
                  <ActiveRow key={item.case_id} item={item} onNavigate={navigateCase} />
                ))}
              </div>
            )}
          </section>

          {/* SECTION ALUMNI */}
          {data.alumni.length > 0 && (
            <section className="mb-6">
              <button
                onClick={() => setAlumniOpen(prev => !prev)}
                className="text-xs font-semibold uppercase tracking-wider text-[#92400e] mb-3 flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                🎓 Anciens stagiaires
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-100 text-[#92400e] text-xs font-bold">
                  {data.alumni.length}
                </span>
                <span className={`text-zinc-400 text-[10px] transition-transform ${alumniOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>

              {alumniOpen && (
                <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
                  {data.alumni.map(item => (
                    <AlumniRow key={item.case_id} item={item} onNavigate={navigateCase} />
                  ))}
                </div>
              )}
            </section>
          )}
          {/* SECTION Activité récente */}
          {caseLogs.length > 0 && (
            <section className="mb-6">
              <div className="bg-white rounded-xl border border-[#e4e4e7] p-5">
                <h2 className="text-sm font-semibold text-[#1a1918] mb-4">📋 Activité récente</h2>
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-zinc-100" />
                  <div className="space-y-4">
                    {caseLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 pl-1">
                        <div className={[
                          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                          log.action === 'status_changed' ? 'bg-blue-50 text-blue-600' :
                          log.action === 'field_edited' ? 'bg-amber-50 text-amber-600' :
                          log.action === 'email_sent' ? 'bg-green-50 text-green-600' :
                          log.action === 'note_added' ? 'bg-purple-50 text-purple-600' :
                          'bg-zinc-50 text-zinc-400'
                        ].join(' ')}>
                          <span className="text-xs">
                            {log.action === 'status_changed' ? '🔄' :
                             log.action === 'field_edited' ? '✏️' :
                             log.action === 'email_sent' ? '📧' :
                             log.action === 'note_added' ? '💬' :
                             log.action === 'doc_uploaded' ? '📎' :
                             '•'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1a1918]">{log.description}</p>
                          {log.field_label && log.old_value && log.new_value && log.action !== 'status_changed' && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              <span className="line-through">{log.old_value}</span>
                              {' → '}
                              <span className="text-zinc-600">{String(log.new_value).substring(0, 50)}{String(log.new_value).length > 50 ? '…' : ''}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-zinc-400">{log.author_name}</span>
                            <span className="text-zinc-200">·</span>
                            <span className="text-xs text-zinc-400">{relativeDate(log.created_at)}</span>
                            {log.cases?.id && (
                              <>
                                <span className="text-zinc-200">·</span>
                                <a
                                  href={`/fr/cases/${log.cases.id}?tab=process`}
                                  className="text-xs text-[#c8a96e] hover:underline"
                                >
                                  Voir le dossier →
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
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
