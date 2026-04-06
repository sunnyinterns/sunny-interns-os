'use client'

import { ActivityCard } from './ActivityCard'
import type { ActivityItem } from '@/lib/types'

interface FeedZoneProps {
  title: string
  count: number
  items: ActivityItem[]
  type: 'today' | 'todo' | 'waiting' | 'completed'
}

const zoneHeaderColors: Record<FeedZoneProps['type'], string> = {
  today: 'text-[#dc2626]',
  todo: 'text-[#d97706]',
  waiting: 'text-zinc-500',
  completed: 'text-[#0d9e75]',
}

const zoneBadgeColors: Record<FeedZoneProps['type'], string> = {
  today: 'bg-red-50 text-[#dc2626]',
  todo: 'bg-amber-50 text-[#d97706]',
  waiting: 'bg-zinc-100 text-zinc-500',
  completed: 'bg-emerald-50 text-[#0d9e75]',
}

export function FeedZone({ title, count, items, type }: FeedZoneProps) {
  const isCompleted = type === 'completed'

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className={['text-xs font-semibold uppercase tracking-wider', zoneHeaderColors[type]].join(' ')}>
          {title}
        </h2>
        <span
          className={[
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
            zoneBadgeColors[type],
          ].join(' ')}
        >
          {count}
        </span>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
          Aucun élément
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ActivityCard key={item.id} item={item} dimmed={isCompleted} />
          ))}
        </div>
      )}
    </section>
  )
}
