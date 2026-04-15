'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface NotifCase {
  id: string
  intern?: { first_name: string; last_name: string }
  status: string
  payment_notified_by_intern_at?: string
  engagement_letter_signed_at?: string
  created_at?: string
}

export default function NotificationsPage() {
  const [leads, setLeads] = useState<NotifCase[]>([])
  const [paymentNotifs, setPaymentNotifs] = useState<NotifCase[]>([])
  const [missingEngagement, setMissingEngagement] = useState<NotifCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/cases?status=lead').then(r => r.ok ? r.json() : []),
      fetch('/api/cases?payment_notified=true').then(r => r.ok ? r.json() : []),
      fetch('/api/cases?missing_engagement=true').then(r => r.ok ? r.json() : []),
    ]).then(([l, p, m]) => {
      setLeads(Array.isArray(l) ? l : [])
      setPaymentNotifs(Array.isArray(p) ? p : [])
      setMissingEngagement(Array.isArray(m) ? m : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    // Mark as seen
    fetch('/api/notifications/unread-count', { method: 'POST' }).catch(() => {})
  }, [])

  const total = leads.length + paymentNotifs.length + missingEngagement.length

  function internName(c: NotifCase) {
    return c.intern ? `${c.intern.first_name} ${c.intern.last_name}` : c.id
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">Notifications</h1>
        {total > 0 && (
          <span className="bg-zinc-200 text-zinc-600 text-xs font-bold px-2 py-0.5 rounded-full">{total}</span>
        )}
      </div>

      {loading && <p className="text-zinc-400 text-sm">Chargement...</p>}

      {!loading && total === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-sm">Aucune notification en attente</p>
        </div>
      )}

      {leads.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Nouveaux leads ({leads.length})
          </h2>
          <div className="space-y-2">
            {leads.map(c => (
              <Link key={c.id} href={`/fr/cases/${c.id}`}
                className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-3 hover:border-zinc-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{internName(c)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Nouveau lead</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {paymentNotifs.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Paiement notifié ({paymentNotifs.length})
          </h2>
          <div className="space-y-2">
            {paymentNotifs.map(c => (
              <Link key={c.id} href={`/fr/cases/${c.id}`}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:border-amber-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{internName(c)}</p>
                  <p className="text-xs text-amber-600 mt-0.5">A notifié son paiement — à vérifier</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {missingEngagement.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Lettre d&apos;engagement manquante ({missingEngagement.length})
          </h2>
          <div className="space-y-2">
            {missingEngagement.map(c => (
              <Link key={c.id} href={`/fr/cases/${c.id}`}
                className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 hover:border-purple-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{internName(c)}</p>
                  <p className="text-xs text-purple-600 mt-0.5">Qualification faite — lettre non signée</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-purple-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
