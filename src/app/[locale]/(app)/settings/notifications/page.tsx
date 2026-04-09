'use client'

import { useEffect, useState, useCallback } from 'react'

interface AdminNotification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new_applicant: { label: 'Candidature', color: '#c8a96e', bg: '#c8a96e18' },
  school_pending: { label: 'Ecole en attente', color: '#d97706', bg: '#fffbeb' },
  payment_received: { label: 'Paiement', color: '#0d9e75', bg: '#f0fdf4' },
  visa_received: { label: 'Visa', color: '#0d9e75', bg: '#f0fdf4' },
  alert: { label: 'Alerte', color: '#dc2626', bg: '#fef2f2' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-notifications')
      if (res.ok) {
        const data = await res.json() as AdminNotification[]
        setNotifs(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchNotifs() }, [fetchNotifs])

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    await fetch('/api/admin-notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function markAllRead() {
    const unread = notifs.filter((n) => !n.is_read)
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await Promise.all(
      unread.map((n) =>
        fetch('/api/admin-notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: n.id }),
        })
      )
    )
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1918]">Notifications</h1>
          <p className="text-[12px] text-[#a1a1aa]">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => { void markAllRead() }}
            className="px-3 py-1.5 text-[12px] font-medium text-[#c8a96e] border border-[#c8a96e] rounded-lg hover:bg-[#c8a96e] hover:text-white transition-colors"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#f4f4f5] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[#a1a1aa]">Aucune notification</p>
        </div>
      )}

      {!loading && notifs.length > 0 && (
        <div className="space-y-2">
          {notifs.map((n) => {
            const typeInfo = TYPE_LABELS[n.type] ?? { label: n.type, color: '#71717a', bg: '#f4f4f5' }
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  n.is_read
                    ? 'bg-white border-[#e4e4e7] opacity-60'
                    : 'bg-white border-[#e4e4e7] shadow-sm'
                }`}
              >
                {/* Unread dot */}
                <div className="pt-1.5 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-[#c8a96e]'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ color: typeInfo.color, backgroundColor: typeInfo.bg }}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="text-[11px] text-[#a1a1aa]">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-[13px] font-medium text-[#1a1918] truncate">{n.title}</p>
                  {n.message && (
                    <p className="text-[12px] text-[#71717a] truncate">{n.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.link && (
                    <a
                      href={n.link}
                      className="text-[11px] font-medium text-[#c8a96e] hover:underline"
                    >
                      Voir
                    </a>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => { void markRead(n.id) }}
                      className="text-[11px] text-[#a1a1aa] hover:text-[#71717a] transition-colors"
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
