'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GroupBadge } from './GroupBadge'

// 14 active columns — vrai process Bali Interns
const COLUMN_ORDER = [
  'lead',
  'rdv_booked',
  'qualification_done',
  'job_submitted',
  'job_retained',
  'convention_signed',
  'payment_pending',
  'payment_received',
  'visa_docs_sent',
  'visa_submitted',
  'visa_received',
  'arrival_prep',
  'active',
] as const

// Legacy status mapped to closest new column for display
const STATUS_ALIAS: Record<string, string> = {
  visa_in_progress: 'visa_docs_sent',
}

const COLUMN_LABELS: Record<string, string> = {
  lead: 'Demandes entrantes',
  rdv_booked: 'RDV booké',
  qualification_done: 'Qualif faite',
  job_submitted: 'Jobs proposés',
  job_retained: 'Job retenu',
  convention_signed: 'Convention signée',
  payment_pending: 'Paiement attente',
  payment_received: 'Paiement reçu',
  visa_docs_sent: 'Docs visa',
  visa_submitted: 'Visa soumis',
  visa_received: 'Visa reçu',
  arrival_prep: 'Préparation départ',
  active: 'En stage',
}

// Statuts "perdus" — section collapsible
const LOST_STATUSES = ['not_interested', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed', 'no_job_found', 'lost']
const LOST_LABELS: Record<string, string> = {
  not_interested: 'Pas intéressé',
  not_qualified: 'Non qualifié',
  on_hold: 'En attente',
  suspended: 'Suspendu',
  visa_refused: 'Visa refusé',
  archived: 'Archivé',
  completed: 'Terminé',
  no_job_found: 'Pas de job trouvé',
  lost: 'Perdu',
}

interface InternGroup {
  id: string
  name: string
  color?: string | null
}

interface CaseData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  desired_start_date?: string | null
  actual_start_date?: string | null
  return_date?: string | null
  group_id?: string | null
  internship_type?: string | null
  school?: string | null
  passport_expiry?: string | null
}

interface KanbanBoardProps {
  cases: CaseData[]
  locale?: string
}

export function KanbanBoard({ cases, locale = 'fr' }: KanbanBoardProps) {
  const [groups, setGroups] = useState<InternGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [lostOpen, setLostOpen] = useState(false)

  useEffect(() => {
    fetch('/api/intern-groups')
      .then((res) => res.ok ? res.json() as Promise<InternGroup[]> : Promise.resolve([]))
      .then((data) => setGroups(data))
      .catch(() => setGroups([]))
  }, [])

  const filteredCases = selectedGroup === 'all'
    ? cases
    : cases.filter((c) => c.group_id === selectedGroup)

  // Normalize alias statuses
  const normalizedCases = filteredCases.map((c) => ({
    ...c,
    status: STATUS_ALIAS[c.status] ?? c.status,
  }))

  const grouped = COLUMN_ORDER.reduce<Record<string, CaseData[]>>(
    (acc, status) => ({ ...acc, [status]: [] }),
    {}
  )

  const lostCases: CaseData[] = []
  const alumniCases: CaseData[] = []

  for (const c of normalizedCases) {
    if (c.status === 'alumni') {
      alumniCases.push(c)
    } else if (c.status in grouped) {
      grouped[c.status].push(c)
    } else if (LOST_STATUSES.includes(c.status)) {
      lostCases.push(c)
    }
  }

  const getGroupForCase = (groupId: string | null | undefined): InternGroup | undefined => {
    if (!groupId) return undefined
    return groups.find((g) => g.id === groupId)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Group filter */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium">Groupe :</span>
          <button
            onClick={() => setSelectedGroup('all')}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              selectedGroup === 'all'
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            Tous
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                selectedGroup === g.id ? 'text-white' : 'text-zinc-600 hover:opacity-80',
              ].join(' ')}
              style={
                selectedGroup === g.id
                  ? { backgroundColor: g.color ?? '#c8a96e' }
                  : { backgroundColor: `${g.color ?? '#c8a96e'}22`, color: g.color ?? '#c8a96e' }
              }
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* 14-column board */}
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-0 flex-1">
        {COLUMN_ORDER.map((status) => {
          const items = grouped[status]
          return (
            <div
              key={status}
              className="flex-shrink-0 w-[280px] flex flex-col bg-zinc-50 rounded-xl border border-zinc-100"
            >
              <div className="px-3 py-2.5 border-b border-zinc-100 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-600 truncate">
                  {COLUMN_LABELS[status]}
                </span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-zinc-200 text-zinc-600 text-xs font-bold flex-shrink-0">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                {items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-300">—</div>
                ) : (
                  items.map((c) => {
                    const group = getGroupForCase(c.group_id)
                    return (
                      <div key={c.id} className="space-y-1">
                        <CaseCard data={c} locale={locale} />
                        {group && (
                          <div className="px-1">
                            <GroupBadge
                              groupId={c.group_id ?? undefined}
                              groupName={group.name}
                              color={group.color ?? undefined}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Section Alumni — séparée visuellement */}
      {alumniCases.length > 0 && (
        <div className="flex-shrink-0 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#92400e] mb-3">
            <span className="text-base">🎓</span>
            Anciens stagiaires ({alumniCases.length})
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4">
            <div className="flex-shrink-0 w-[280px] flex flex-col bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="px-3 py-2.5 border-b border-amber-100 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#92400e] truncate">Alumni</span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-100 text-[#92400e] text-xs font-bold flex-shrink-0">
                  {alumniCases.length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-48">
                {alumniCases.map((c) => (
                  <CaseCard key={c.id} data={c} locale={locale} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Perdus — collapsible */}
      {lostCases.length > 0 && (
        <div className="flex-shrink-0 border-t border-zinc-100 pt-3">
          <button
            onClick={() => setLostOpen((o) => !o)}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition-colors mb-3"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={['transition-transform', lostOpen ? 'rotate-90' : ''].join(' ')}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Perdus / Inactifs ({lostCases.length})
          </button>
          {lostOpen && (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {LOST_STATUSES.map((status) => {
                const items = lostCases.filter((c) => c.status === status)
                if (items.length === 0) return null
                return (
                  <div key={status} className="flex-shrink-0 w-[280px] flex flex-col bg-zinc-50/50 rounded-xl border border-zinc-100 opacity-70">
                    <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-400 truncate">{LOST_LABELS[status]}</span>
                      <span className="text-xs text-zinc-400 font-bold">{items.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 max-h-48 overflow-y-auto">
                      {items.map((c) => (
                        <CaseCard key={c.id} data={c} locale={locale} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CaseCard — status badge + progress + checklist ─────────────────────────

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: 'Demande', bg: '#f4f4f5', text: '#71717a' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#6d28d9' },
  job_submitted: { label: 'Jobs proposés', bg: '#fef3c7', text: '#d97706' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#059669' },
  convention_signed: { label: 'Convention', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: 'Paiement ⏳', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé ✓', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: 'Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa ✓', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: '🛫 Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: '🌴 En stage', bg: '#d1fae5', text: '#059669' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
}

function getStepIndex(status: string): number {
  const idx = COLUMN_ORDER.indexOf(status as typeof COLUMN_ORDER[number])
  return idx >= 0 ? idx + 1 : 1
}

const CHECKLIST_LABELS = [
  'Billet avion',
  'Papiers visa',
  'Visa reçu',
  'Formulaire logement',
  'Logement réservé',
  'Scooter réservé',
  'Convention signée',
  'Chauffeur réservé',
]

interface CaseCardExtended extends CaseData {
  billet_avion?: boolean
  papiers_visas?: boolean
  visa_recu?: boolean
  logement_scooter_formulaire?: boolean
  logement_reserve?: boolean
  scooter_reserve_check?: boolean
  convention_signee_check?: boolean
  chauffeur_reserve?: boolean
}

const NO_DAYS_TAG_STATUSES = ['not_interested', 'no_job_found', 'lost', 'alumni', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed']

function CaseCard({ data, locale }: { data: CaseCardExtended; locale: string }) {
  const router = useRouter()
  const dateRef = data.desired_start_date ?? data.arrival_date
  const tag = dateRef && !NO_DAYS_TAG_STATUSES.includes(data.status) ? getDaysUntilTag(dateRef) : null

  const showPassportWarning = (() => {
    if (!data.passport_expiry || !data.desired_start_date) return false
    const startPlus6 = new Date(data.desired_start_date)
    startPlus6.setMonth(startPlus6.getMonth() + 6)
    return new Date(data.passport_expiry) < startPlus6
  })()

  const checklist = [
    data.billet_avion,
    data.papiers_visas,
    data.visa_recu,
    data.logement_scooter_formulaire,
    data.logement_reserve,
    data.scooter_reserve_check,
    data.convention_signee_check,
    data.chauffeur_reserve,
  ]

  const badge = STATUS_BADGE[data.status]
  const step = getStepIndex(data.status)
  const progressPct = Math.round((step / 14) * 100)

  return (
    <button
      onClick={() => router.push(`/${locale}/cases/${data.id}?tab=process`)}
      className="w-full text-left p-3 bg-white rounded-lg border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all"
    >
      {/* Status badge - prominent at top */}
      {badge && (
        <div className="mb-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-zinc-400">Étape {step}/14</span>
          <span className="text-[10px] text-zinc-400">{progressPct}%</span>
        </div>
        <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, backgroundColor: '#c8a96e' }}
          />
        </div>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">
            {(data.first_name?.[0] ?? '').toUpperCase()}{(data.last_name?.[0] ?? '').toUpperCase()}
          </span>
        </div>
        <span className="text-xs font-semibold text-[#1a1918] truncate flex-1">
          {data.first_name} {data.last_name}
        </span>
      </div>

      {/* School */}
      {data.school && (
        <p className="text-[10px] text-zinc-400 truncate mb-1.5">{data.school}</p>
      )}

      {/* Badges: J-X + VISA + PASSEPORT */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {data.internship_type === 'visa_only' && (
          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700">VISA</span>
        )}
        {tag && (
          <span className={['text-[10px] font-bold px-1 py-0.5 rounded', tag.color].join(' ')}>
            {tag.label}
          </span>
        )}
        {showPassportWarning && (
          <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-red-100 text-[#dc2626]">PASSEPORT</span>
        )}
      </div>

      {/* Mini checklist — 8 pastilles avec tooltip au hover */}
      <div className="flex gap-1 flex-wrap">
        {checklist.map((v, i) => (
          <div
            key={i}
            title={CHECKLIST_LABELS[i]}
            className={['w-2.5 h-2.5 rounded-full cursor-default', v ? 'bg-[#0d9e75]' : 'bg-zinc-200'].join(' ')}
          />
        ))}
      </div>
    </button>
  )
}

function getDaysUntilTag(dateRef: string): { label: string; color: string } | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateRef)
  target.setHours(0, 0, 0, 0)
  const days = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: `J${days}`, color: 'bg-red-100 text-[#dc2626]' }
  if (days < 3) return { label: `J-${days}`, color: 'bg-red-100 text-[#dc2626]' }
  if (days < 7) return { label: `J-${days}`, color: 'bg-amber-100 text-[#d97706]' }
  if (days < 30) return { label: `J-${days}`, color: 'bg-amber-100 text-[#d97706]' }
  return { label: `J-${days}`, color: 'bg-emerald-50 text-[#0d9e75]' }
}
