'use client'

import { useEffect, useState } from 'react'
import { InternCard } from './InternCard'
import { GroupBadge } from './GroupBadge'

const COLUMN_ORDER = [
  'lead',
  'rdv_booked',
  'qualification_done',
  'job_submitted',
  'job_retained',
  'convention_signed',
  'payment_pending',
  'payment_received',
  'visa_in_progress',
  'visa_received',
  'arrival_prep',
  'active',
] as const

const COLUMN_LABELS: Record<string, string> = {
  lead: 'Lead',
  rdv_booked: 'RDV planifié',
  qualification_done: 'Qualifié',
  job_submitted: 'Job soumis',
  job_retained: 'Job retenu',
  convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente',
  payment_received: 'Paiement reçu',
  visa_in_progress: 'Visa en cours',
  visa_received: 'Visa reçu',
  arrival_prep: 'Préparation arrivée',
  active: 'Actif',
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
  return_date?: string | null
  group_id?: string | null
}

interface KanbanBoardProps {
  cases: CaseData[]
  locale?: string
}

export function KanbanBoard({ cases, locale = 'fr' }: KanbanBoardProps) {
  const [groups, setGroups] = useState<InternGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  useEffect(() => {
    fetch('/api/intern-groups')
      .then((res) => res.ok ? res.json() as Promise<InternGroup[]> : Promise.resolve([]))
      .then((data) => setGroups(data))
      .catch(() => setGroups([]))
  }, [])

  const filteredCases = selectedGroup === 'all'
    ? cases
    : cases.filter((c) => c.group_id === selectedGroup)

  const grouped = COLUMN_ORDER.reduce<Record<string, CaseData[]>>(
    (acc, status) => ({ ...acc, [status]: [] }),
    {}
  )

  for (const c of filteredCases) {
    if (c.status in grouped) {
      grouped[c.status].push(c)
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

      <div className="flex gap-3 overflow-x-auto pb-4 min-h-0 flex-1">
        {COLUMN_ORDER.map((status) => {
          const items = grouped[status]
          return (
            <div
              key={status}
              className="flex-shrink-0 w-52 flex flex-col bg-zinc-50 rounded-xl border border-zinc-100"
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-zinc-100 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-600 truncate">
                  {COLUMN_LABELS[status]}
                </span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-zinc-200 text-zinc-600 text-xs font-bold flex-shrink-0">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
                {items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-300">—</div>
                ) : (
                  items.map((c) => {
                    const group = getGroupForCase(c.group_id)
                    return (
                      <div key={c.id} className="space-y-1">
                        <InternCard data={c} locale={locale} />
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
    </div>
  )
}
