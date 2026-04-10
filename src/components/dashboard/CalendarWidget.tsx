'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CalEvent {
  id: string
  summary: string | null
  status: string
  start_datetime: string
  end_datetime: string
  intern_name: string | null
  intern_email: string | null
  meet_link: string | null
  cancel_reschedule_link: string | null
  my_response_status: string | null
  organizer_email: string | null
  case_id: string | null
  google_calendar_id: string | null
  html_link?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  })
}

function StatusBadge({ status, myResponse }: { status: string; myResponse: string | null }) {
  if (status === 'cancelled') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Annulé</span>
  if (myResponse === 'declined') return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Refusé</span>
  if (myResponse === 'accepted') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">Confirmé</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">En attente</span>
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'cancelled'>('upcoming')

  function load(t: 'upcoming' | 'cancelled') {
    setLoading(true)
    fetch(`/api/calendar/events?status=${t}&days=30`)
      .then(r => r.ok ? r.json() : [])
      .then((d: CalEvent[]) => { setEvents(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-[#1a1918]">Calendrier RDV</h3>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          <button onClick={() => setTab('upcoming')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tab === 'upcoming' ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500'}`}>
            À venir
          </button>
          <button onClick={() => setTab('cancelled')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tab === 'cancelled' ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500'}`}>
            Annulés
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="divide-y divide-zinc-50">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">Chargement...</div>
        ) : events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-2xl mb-2">{tab === 'upcoming' ? '🎉' : '✨'}</p>
            <p className="text-sm text-zinc-400">
              {tab === 'upcoming' ? 'Aucun RDV à venir dans les 30 jours' : 'Aucun RDV annulé récemment'}
            </p>
          </div>
        ) : events.slice(0, 3).map(ev => (
          <div key={ev.id} className={`px-5 py-3.5 hover:bg-zinc-50 transition-colors ${ev.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-[#1a1918] truncate">
                    {ev.intern_name ?? ev.summary ?? 'RDV Bali Interns'}
                  </p>
                  <StatusBadge status={ev.status} myResponse={ev.my_response_status} />
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDate(ev.start_datetime)} · WITA (Bali)
                </p>
                {ev.intern_email && (
                  <p className="text-xs text-zinc-400 mt-0.5">{ev.intern_email}</p>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {ev.meet_link && (
                  <a href={ev.meet_link} target="_blank" rel="noopener noreferrer"
                     className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium">
                    Meet
                  </a>
                )}
                {ev.cancel_reschedule_link && ev.status !== 'cancelled' && (
                  <a href={ev.cancel_reschedule_link} target="_blank" rel="noopener noreferrer"
                     className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-medium">
                    Reprog.
                  </a>
                )}
                {ev.case_id && (
                  <Link href={`/fr/cases/${ev.case_id}`}
                     className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 font-medium">
                    Dossier
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
        <Link href="/fr/calendar" className="text-xs text-[#c8a96e] hover:underline font-medium">
          Voir tous les RDVs →
        </Link>
        <a href="https://calendar.google.com/calendar/u/0/r/week" target="_blank" rel="noopener noreferrer"
           className="text-xs text-zinc-400 hover:text-zinc-600 font-medium">
          Google Calendar ↗
        </a>
      </div>
    </div>
  )
}
