'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { ActivityItem } from '@/lib/types'

interface ActivityCardProps {
  item: ActivityItem
  dimmed?: boolean
}

function getDaysTag(daysUntil: number): { label: string; color: string } {
  if (daysUntil < 0) return { label: `J${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 3) return { label: `J-${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 7) return { label: `J-${daysUntil}`, color: 'text-[#d97706] bg-amber-50' }
  if (daysUntil < 30) return { label: `J-${daysUntil}`, color: 'text-yellow-700 bg-yellow-50' }
  return { label: `J-${daysUntil}`, color: 'text-[#0d9e75] bg-emerald-50' }
}

function priorityToVariant(
  priority: ActivityItem['priority']
): 'default' | 'success' | 'attention' | 'critical' | 'info' {
  switch (priority) {
    case 'critical': return 'critical'
    case 'attention': return 'attention'
    case 'completed': return 'success'
    default: return 'default'
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function ActivityCard({ item, dimmed = false }: ActivityCardProps) {
  const daysTag = item.daysUntil !== undefined ? getDaysTag(item.daysUntil) : null

  return (
    <div
      className={[
        'flex items-start gap-3 p-3 bg-white rounded-xl border border-zinc-100',
        'hover:shadow-sm transition-shadow',
        dimmed ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Avatar */}
      <Avatar name={item.internName} src={item.internAvatar} size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#1a1918]">{item.internName}</span>
          {daysTag && (
            <span
              className={[
                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold',
                daysTag.color,
              ].join(' ')}
            >
              {daysTag.label}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <Badge label={item.priority} variant={priorityToVariant(item.priority)} />
        <span className="text-xs text-zinc-400">{formatTime(item.createdAt)}</span>
      </div>
    </div>
  )
}
