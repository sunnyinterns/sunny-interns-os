'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface AdminNotification {
  id: string
  type: string
  title: string
  message?: string | null
  link?: string | null
  is_read: boolean
  created_at: string
  case_id?: string | null
}

const TYPE_CONFIG: Record<string, { color: string; emoji: string }> = {
  new_lead:          { color: '#6b7280', emoji: '👤' },
  payment_received:  { color: '#10b981', emoji: '💳' },
  payment_notified:  { color: '#f59e0b', emoji: '💰' },
  convention_signed: { color: '#3b82f6', emoji: '📝' },
  engagement_signed: { color: '#8b5cf6', emoji: '✍️' },
  visa_received:     { color: '#0ea5e9', emoji: '🛂' },
  employer_response: { color: '#f97316', emoji: '🏢' },
}
const DEFAULT_CONFIG = { color: '#c8a96e', emoji: '🔔' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function groupByDate(items: AdminNotification[]): { label: string; items: AdminNotification[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekStart = new Date(today.getTime() - 6 * 86400000)

  const buckets: { label: string; items: AdminNotification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const n of items) {
    const d = new Date(n.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) buckets[0].items.push(n)
    else if (day >= yesterday) buckets[1].items.push(n)
    else if (day >= weekStart) buckets[2].items.push(n)
    else buckets[3].items.push(n)
  }

  return buckets.filter(g => g.items.length > 0)
}

export default function NotificationsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  throw new Error('Test Sentry - Sunny Interns OS')

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : { notifications: [], unread_count: 0 })
      .then((d: { notifications: AdminNotification[]; unread_count: number }) => {
        setNotifications(Array.isArray(d.notifications) ? d.notifications : [])
        setUnreadCount(d.unread_count ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' }).catch(() => {})
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read)
    if (unread.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await Promise.all(unread.map(n => fetch(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => {})))
  }

  function href(n: AdminNotification): string {
    if (n.link) return n.link
    if (n.case_id) return `/${locale}/cases/${n.case_id}`
    return '#'
  }

  const groups = groupByDate(notifications)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#1a1918]">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            className="text-xs font-medium text-[#c8a96e] hover:text-[#b8995e] transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-sm">No notifications</p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map(n => {
                  const config = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
                  return (
                    <Link
                      key={n.id}
                      href={href(n)}
                      onClick={() => { if (!n.is_read) void markRead(n.id) }}
                      className={[
                        'flex items-start gap-3 rounded-xl px-4 py-3 hover:opacity-80 transition-opacity',
                        n.is_read ? 'bg-white border border-zinc-100' : 'bg-blue-50 border border-blue-200',
                      ].join(' ')}
                    >
                      {/* Colored circle icon */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                        style={{ backgroundColor: config.color + '20', border: `1.5px solid ${config.color}40` }}
                      >
                        <span>{config.emoji}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1a1918] truncate">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-xs text-zinc-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>

                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-300 flex-shrink-0 mt-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
