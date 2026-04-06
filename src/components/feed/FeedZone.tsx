'use client'

import { useState } from 'react'
import { ActivityCard } from './ActivityCard'
import type { ActivityItem, CaseStatus } from '@/lib/types'

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

export function FeedZone({ title, count, items: initialItems, type }: FeedZoneProps) {
  const isCompleted = type === 'completed'
  const [items, setItems] = useState<ActivityItem[]>(initialItems)

  function handleStatusUpdate(itemId: string, newStatus: CaseStatus) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    )
  }

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
          {items.length > 0 ? items.length : count}
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
            <ActivityCard
              key={item.id}
              item={item}
              dimmed={isCompleted}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </section>
  )
}
