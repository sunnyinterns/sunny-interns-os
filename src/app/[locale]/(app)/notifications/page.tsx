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

const TYPE_CONFIG: Record<string, { icon: string; cls: string }> = {
  new_lead:          { icon: '👤', cls: 'bg-zinc-50 border-zinc-200' },
  payment_received:  { icon: '💳', cls: 'bg-green-50 border-green-200' },
  payment_notified:  { icon: '💳', cls: 'bg-amber-50 border-amber-200' },
  convention_signed: { icon: '📝', cls: 'bg-blue-50 border-blue-200' },
  engagement_signed: { icon: '✍️', cls: 'bg-purple-50 border-purple-200' },
  visa_received:     { icon: '🛂', cls: 'bg-teal-50 border-teal-200' },
  employer_response: { icon: '🏢', cls: 'bg-orange-50 border-orange-200' },
}

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

export default function NotificationsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

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
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' }).catch(() => {})
  }

  const href = (n: AdminNotification) => {
    if (n.link) return n.link
    if (n.case_id) return `/${locale}/cases/${n.case_id}`
    return '#'
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">Notifications</h1>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
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

      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => {
            const config = TYPE_CONFIG[n.type] ?? { icon: '🔔', cls: 'bg-white border-zinc-200' }
            return (
              <Link
                key={n.id}
                href={href(n)}
                onClick={() => { if (!n.is_read) void markRead(n.id) }}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 hover:opacity-80 transition-opacity ${config.cls}`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1a1918] truncate">{n.title}</p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-300 flex-shrink-0 mt-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
