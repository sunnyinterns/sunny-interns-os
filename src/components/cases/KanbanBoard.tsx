'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

// 5 colonnes candidats — pipeline Bali Interns
const COLUMN_ORDER = [
  'rdv_booked',
  'qualification_done',
  'job_submitted',
  'job_retained',
  'convention_signed',
] as const

const COLUMN_LABELS: Record<string, string> = {
  rdv_booked: '📅 RDV planifié',
  qualification_done: '✅ Qualifié',
  job_submitted: '💼 Jobs envoyés',
  job_retained: '🤝 Job retenu',
  convention_signed: '📝 Convention',
}

// Map real DB statuses → kanban column
const STATUS_TO_COLUMN: Record<string, string> = {
  rdv_booked: 'rdv_booked',
  qualification_done: 'qualification_done',
  job_submitted: 'job_submitted',
  job_retained: 'job_retained',
  convention_signed: 'convention_signed',
}

// When dragging to a column → what DB status to set
const COLUMN_TO_STATUS: Record<string, string> = {
  rdv_booked: 'rdv_booked',
  qualification_done: 'qualification_done',
  job_submitted: 'job_submitted',
  job_retained: 'job_retained',
  convention_signed: 'convention_signed',
}

const LOST_STATUSES = ['not_interested', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed', 'no_job_found', 'lost']

function getLinkedinSlug(url?: string | null): string | null {
  if (!url) return null
  if (!url.includes('linkedin.com')) return url.trim() || null
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return m ? m[1] : null
}

function getAvatarSrc(data: { avatar_url?: string | null; linkedin_url?: string | null }): string | null {
  if (data.avatar_url) return data.avatar_url
  const slug = getLinkedinSlug(data.linkedin_url)
  if (slug) return `https://unavatar.io/linkedin/${slug}`
  return null
}

interface InternGroup {
  id: string
  name: string
  color?: string | null
}

export interface CaseData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  desired_start_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  return_date?: string | null
  group_id?: string | null
  internship_type?: string | null
  school?: string | null
  passport_expiry?: string | null
  assigned_manager_name?: string | null
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
  email?: string | null
  main_desired_job?: string | null
  created_at?: string | null
  linkedin_url?: string | null
  avatar_url?: string | null
}

export type ViewMode = 'kanban' | 'list'

interface KanbanBoardProps {
  cases: CaseData[]
  locale?: string
  search?: string
  viewMode?: ViewMode
}

// ─── Urgency logic ────────────────────────────────────────────────

function getBorderColor(data: CaseData): string {
  const status = data.status
  const col = STATUS_TO_COLUMN[status]
  if (col === 'arrived') {
    if (status === 'active') return '#059669'
    const ref = data.actual_start_date ?? data.desired_start_date
    if (ref) {
      const days = Math.ceil((new Date(ref).getTime() - Date.now()) / 86400000)
      if (days < 7) return '#dc2626'
    }
    return '#d97706'
  }
  if (status === 'payment_pending') return '#d97706'
  if (col === 'visa') return '#d97706'
  if (['rdv_booked', 'qualification_done'].includes(status)) return '#c8a96e'
  if (col === 'completed') return '#059669'
  return '#d4d4d8'
}

function getUrgencyPulse(data: CaseData): boolean {
  if (data.status === 'arrival_prep') {
    const ref = data.actual_start_date ?? data.desired_start_date
    if (ref) {
      const days = Math.ceil((new Date(ref).getTime() - Date.now()) / 86400000)
      return days < 7
    }
  }
  return false
}

// ─── Date display ────────────────────────────────────────────────

function getDateLabel(data: CaseData): { text: string; urgent: boolean } | null {
  const status = data.status

  if (['rdv_booked'].includes(status)) {
    if (data.desired_start_date) {
      const d = new Date(data.desired_start_date)
      return { text: `Départ: ${d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`, urgent: false }
    }
    return null
  }

  if (status === 'active') {
    if (data.actual_end_date) {
      const d = new Date(data.actual_end_date)
      return { text: `Fin: ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`, urgent: false }
    }
    return null
  }

  if (status === 'arrival_prep') {
    const ref = data.actual_start_date ?? data.desired_start_date
    if (ref) {
      const d = new Date(ref)
      const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
      return { text: `Arrive: ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`, urgent: days < 7 }
    }
    return null
  }

  return null
}

// ─── J-X tag ────────────────────────────────────────────────

const NO_DAYS_TAG_STATUSES = ['not_interested', 'no_job_found', 'lost', 'alumni', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed']

function getJTag(data: CaseData): { label: string; bg: string; text: string } | null {
  if (NO_DAYS_TAG_STATUSES.includes(data.status)) return null

  if (data.status === 'active') {
    if (!data.actual_end_date) return null
    const days = Math.ceil((new Date(data.actual_end_date).getTime() - Date.now()) / 86400000)
    if (days <= 0 || days > 14) return null
    if (days <= 7) return { label: `${days}j`, bg: '#fef2f2', text: '#dc2626' }
    return { label: `${days}j`, bg: '#fffbeb', text: '#d97706' }
  }

  if (data.status === 'arrival_prep') {
    const ref = data.actual_start_date ?? data.desired_start_date
    if (!ref) return null
    const days = Math.ceil((new Date(ref).getTime() - Date.now()) / 86400000)
    if (days > 14) return null
    if (days < 0) return { label: `J${days}`, bg: '#fef2f2', text: '#dc2626' }
    if (days < 7) return { label: `J-${days}`, bg: '#fef2f2', text: '#dc2626' }
    return { label: `J-${days}`, bg: '#fffbeb', text: '#d97706' }
  }

  const dateRef = data.desired_start_date
  if (!dateRef) return null
  const days = Math.ceil((new Date(dateRef).getTime() - Date.now()) / 86400000)
  if (days < 0 || days > 14) return null
  if (days < 7) return { label: `J-${days}`, bg: '#fef2f2', text: '#dc2626' }
  return { label: `J-${days}`, bg: '#fffbeb', text: '#d97706' }
}

// ─── CaseCard compact ────────────────────────────────────────────

function CaseCard({ data, locale }: { data: CaseData; locale: string }) {
  const router = useRouter()
  const borderColor = getBorderColor(data)
  const pulse = getUrgencyPulse(data)
  const dateLabel = getDateLabel(data)
  const jTag = getJTag(data)

  const checklist = [
    data.billet_avion,
    data.papiers_visas,
    data.visa_recu,
    data.convention_signee_check,
    data.chauffeur_reserve,
  ]

  const col = STATUS_TO_COLUMN[data.status] ?? data.status
  const step = COLUMN_ORDER.indexOf(col as typeof COLUMN_ORDER[number])
  const progressPct = step >= 0 ? Math.round(((step + 1) / COLUMN_ORDER.length) * 100) : 0

  const initials = `${(data.first_name?.[0] ?? '').toUpperCase()}${(data.last_name?.[0] ?? '').toUpperCase()}`
  const avatarSrc = getAvatarSrc(data)

  // RDV stale > 7 days
  const leadStale = data.status === 'rdv_booked' && data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000) > 7
    : false

  return (
    <button
      onClick={() => router.push(`/${locale}/cases/${data.id}?tab=process`)}
      className="w-full text-left bg-white rounded-lg border border-[#e4e4e7] hover:border-[#a1a1aa] hover:shadow-sm transition-all cursor-pointer"
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      <div className="p-2.5">
        {/* Row 1: Avatar + Name + J-X */}
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={`${data.first_name} ${data.last_name}`}
                className="w-7 h-7 rounded-full object-cover border border-zinc-100"
                onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden') }}
              />
            ) : null}
            <div className={`w-7 h-7 rounded-full bg-[#c8a96e] flex items-center justify-center ${avatarSrc ? 'hidden' : ''}`}>
              <span className="text-white text-[10px] font-bold leading-none">{initials}</span>
            </div>
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-pulse" />
            )}
          </div>
          <span className="text-[13px] font-semibold text-[#1a1918] truncate flex-1 leading-tight">
            {data.first_name} {data.last_name}
          </span>
          {jTag && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 leading-none"
              style={{ backgroundColor: jTag.bg, color: jTag.text }}
            >
              {jTag.label}
            </span>
          )}
          {leadStale && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 leading-none bg-[#fef2f2] text-[#dc2626]">
              +7j
            </span>
          )}
        </div>

        {/* Row 2: Email */}
        {data.email && (
          <p className="text-[10px] text-[#a1a1aa] truncate leading-tight mb-0.5">{data.email}</p>
        )}

        {/* Row 3: Desired job + checklist dots */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-[#71717a] truncate flex-1 leading-tight">
            {data.main_desired_job || data.internship_type || data.school || '\u2014'}
          </span>
          <div className="flex gap-0.5 flex-shrink-0">
            {checklist.map((v, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${v ? 'bg-[#c8a96e]' : 'bg-[#d4d4d8]'}`}
              />
            ))}
          </div>
        </div>

        {/* Row 4: Date */}
        {dateLabel && (
          <p className={`text-[11px] mt-1 leading-tight ${dateLabel.urgent ? 'text-[#dc2626] font-semibold' : 'text-[#a1a1aa]'}`}>
            {dateLabel.text}
          </p>
        )}

        {/* Thin progress bar */}
        <div className="mt-1.5 w-full h-[2px] bg-[#f4f4f5] rounded-full overflow-hidden opacity-40">
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPct}%`, backgroundColor: '#c8a96e' }}
          />
        </div>
      </div>
    </button>
  )
}

// ─── List view ────────────────────────────────────────────────

function ListView({ cases, locale }: { cases: CaseData[]; locale: string }) {
  const router = useRouter()

  const sorted = useMemo(() => {
    return [...cases].sort((a, b) => {
      const colA = STATUS_TO_COLUMN[a.status] ?? a.status
      const colB = STATUS_TO_COLUMN[b.status] ?? b.status
      const ia = COLUMN_ORDER.indexOf(colA as typeof COLUMN_ORDER[number])
      const ib = COLUMN_ORDER.indexOf(colB as typeof COLUMN_ORDER[number])
      const sa = ia >= 0 ? ia : 99
      const sb = ib >= 0 ? ib : 99
      if (sa !== sb) return sa - sb
      const da = a.desired_start_date ?? ''
      const db = b.desired_start_date ?? ''
      return da.localeCompare(db)
    })
  }, [cases])

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e4e4e7]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-white border-b border-[#e4e4e7]">
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Nom</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Statut</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">École</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Date début</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Manager</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const borderColor = getBorderColor(c)
            return (
              <tr
                key={c.id}
                onClick={() => router.push(`/${locale}/cases/${c.id}?tab=process`)}
                className={`cursor-pointer hover:bg-[#f4f4f5] transition-colors ${i % 2 === 1 ? 'bg-[#fafaf9]' : 'bg-white'}`}
              >
                <td className="px-3 py-2 flex items-center gap-2">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: borderColor }}
                  />
                  <div className="w-6 h-6 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[9px] font-bold">
                      {(c.first_name?.[0] ?? '').toUpperCase()}{(c.last_name?.[0] ?? '').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-[#1a1918] truncate">{c.first_name} {c.last_name}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-medium text-[#71717a]">{COLUMN_LABELS[c.status] ?? c.status}</span>
                </td>
                <td className="px-3 py-2 text-[11px] text-[#71717a] truncate max-w-[140px]">{c.school ?? '—'}</td>
                <td className="px-3 py-2 text-[11px] text-[#71717a]">
                  {c.desired_start_date ? new Date(c.desired_start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-3 py-2 text-[11px] text-[#71717a] truncate max-w-[120px]">{c.assigned_manager_name ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── KanbanBoard ────────────────────────────────────────────────

// ─── DnD wrappers ────────────────────────────────────────────

function DroppableColumn({ id, children, isOver }: { id: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-280px)] transition-colors rounded-b-xl ${isOver ? 'bg-[#c8a96e]/10' : ''}`}>
      {children}
    </div>
  )
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  )
}

export function KanbanBoard({ cases, locale = 'fr', search = '', viewMode = 'kanban' }: KanbanBoardProps) {
  const [groups, setGroups] = useState<InternGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [lostOpen, setLostOpen] = useState(false)
  const [localCases, setLocalCases] = useState(cases)
  const [overColumn, setOverColumn] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { setLocalCases(cases) }, [cases])

  useEffect(() => {
    fetch('/api/intern-groups')
      .then((res) => res.ok ? res.json() as Promise<InternGroup[]> : Promise.resolve([]))
      .then((data) => setGroups(data))
      .catch(() => setGroups([]))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setOverColumn(null)
    const { active, over } = event
    if (!over) return
    const caseId = String(active.id)
    const targetCol = String(over.id)
    const caseItem = localCases.find(c => c.id === caseId)
    if (!caseItem) return
    const currentCol = STATUS_TO_COLUMN[caseItem.status] ?? caseItem.status
    if (currentCol === targetCol) return
    const newStatus = COLUMN_TO_STATUS[targetCol]
    if (!newStatus) return
    // Optimistic update
    setLocalCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus } : c))
    fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {
      // Revert on failure
      setLocalCases(prev => prev.map(c => c.id === caseId ? { ...c, status: caseItem.status } : c))
    })
  }, [localCases])

  const filteredCases = useMemo(() => {
    let result = selectedGroup === 'all' ? localCases : localCases.filter((c) => c.group_id === selectedGroup)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      )
    }
    return result
  }, [localCases, selectedGroup, search])

  const { grouped, lostCases } = useMemo(() => {
    const g = COLUMN_ORDER.reduce<Record<string, CaseData[]>>(
      (acc, col) => ({ ...acc, [col]: [] }),
      {}
    )
    const lost: CaseData[] = []

    for (const c of filteredCases) {
      const col = STATUS_TO_COLUMN[c.status]
      if (col && col in g) {
        g[col].push(c)
      } else if (LOST_STATUSES.includes(c.status)) {
        lost.push(c)
      }
    }
    return { grouped: g, lostCases: lost }
  }, [filteredCases])

  // Count active (non-lost) cases
  const activeCount = filteredCases.filter((c) => !LOST_STATUSES.includes(c.status) && STATUS_TO_COLUMN[c.status]).length

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Group filter */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className="text-[11px] text-[#71717a] font-medium">Groupe :</span>
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              selectedGroup === 'all'
                ? 'bg-[#1a1918] text-white'
                : 'bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]'
            }`}
          >
            Tous
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={
                selectedGroup === g.id
                  ? { backgroundColor: g.color ?? '#c8a96e', color: '#fff' }
                  : { backgroundColor: `${g.color ?? '#c8a96e'}18`, color: g.color ?? '#c8a96e' }
              }
            >
              {g.name}
            </button>
          ))}
          <span className="text-[11px] text-[#a1a1aa] ml-2">{activeCount} candidats actifs</span>
        </div>
      )}

      {/* Main board or list */}
      {viewMode === 'list' ? (
        <ListView cases={filteredCases.filter((c) => !LOST_STATUSES.includes(c.status) && STATUS_TO_COLUMN[c.status])} locale={locale} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragOver={(e) => setOverColumn(e.over ? String(e.over.id) : null)}>
          <div className="flex gap-2 overflow-x-auto pb-4 min-h-0 flex-1">
            {COLUMN_ORDER.map((col) => {
              const items = grouped[col]
              return (
                <div
                  key={col}
                  className="flex-shrink-0 w-[220px] flex flex-col bg-white rounded-xl border border-[#e4e4e7]"
                >
                  {/* Column header */}
                  <div className="px-2.5 py-2 border-b border-[#e4e4e7] flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a] truncate">
                      {COLUMN_LABELS[col]}
                    </span>
                    <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#f4f4f5] text-[#71717a] text-[10px] font-bold flex-shrink-0">
                      {items.length}
                    </span>
                  </div>
                  {/* Column body — droppable */}
                  <DroppableColumn id={col} isOver={overColumn === col}>
                    {items.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#d4d4d8]">—</div>
                    ) : (
                      items.map((c) => (
                        <DraggableCard key={c.id} id={c.id}>
                          <CaseCard data={c} locale={locale} />
                        </DraggableCard>
                      ))
                    )}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Section Perdus */}
      {lostCases.length > 0 && (
        <div className="flex-shrink-0 border-t border-[#e4e4e7] pt-3">
          <button
            onClick={() => setLostOpen((o) => !o)}
            className="flex items-center gap-2 text-[11px] font-medium text-[#a1a1aa] hover:text-[#71717a] transition-colors mb-2"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              className={`transition-transform ${lostOpen ? 'rotate-90' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Dossiers fermés ({lostCases.length})
          </button>
          {lostOpen && (
            <div className="flex gap-2 overflow-x-auto pb-3">
              {LOST_STATUSES.map((status) => {
                const items = lostCases.filter((c) => c.status === status)
                if (items.length === 0) return null
                return (
                  <div key={status} className="flex-shrink-0 w-[220px] flex flex-col bg-[#f4f4f5] rounded-xl border border-[#e4e4e7] opacity-60">
                    <div className="px-2.5 py-2 border-b border-[#e4e4e7] flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#a1a1aa] truncate">{status}</span>
                      <span className="text-[10px] text-[#a1a1aa] font-bold">{items.length}</span>
                    </div>
                    <div className="flex-1 p-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
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
