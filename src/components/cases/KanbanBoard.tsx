'use client'

import { InternCard } from './InternCard'

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

interface CaseData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  return_date?: string | null
}

interface KanbanBoardProps {
  cases: CaseData[]
  locale?: string
}

export function KanbanBoard({ cases, locale = 'fr' }: KanbanBoardProps) {
  const grouped = COLUMN_ORDER.reduce<Record<string, CaseData[]>>(
    (acc, status) => ({ ...acc, [status]: [] }),
    {}
  )

  for (const c of cases) {
    if (c.status in grouped) {
      grouped[c.status].push(c)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-0">
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
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
              {items.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-300">—</div>
              ) : (
                items.map((c) => (
                  <InternCard key={c.id} data={c} locale={locale} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
