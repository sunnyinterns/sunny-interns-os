'use client'

import { useEffect, useState } from 'react'

interface CalEvent {
  id?: string | null
  summary?: string | null
  start?: { dateTime?: string | null; date?: string | null } | null
  end?: { dateTime?: string | null } | null
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] | null } | null
  htmlLink?: string | null
}

interface CaseSuggestion {
  id: string
  first_name: string
  last_name: string
  interns?: { email?: string | null } | null
}

export default function AgendaPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Modal state
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<CaseSuggestion[]>([])
  const [selected, setSelected] = useState<CaseSuggestion | null>(null)
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('09:00')
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then((r) => r.ok ? r.json() as Promise<CalEvent[]> : Promise.resolve([]))
      .then((data) => {
        setEvents(data)
        setIsMock(data.length === 0)
        setLoading(false)
      })
      .catch(() => { setIsMock(true); setLoading(false) })
  }, [])

  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); return }
    const t = setTimeout(() => {
      fetch(`/api/cases?q=${encodeURIComponent(search)}&limit=10`)
        .then((r) => r.ok ? r.json() as Promise<CaseSuggestion[]> : Promise.resolve([]))
        .then(setSuggestions)
        .catch(() => [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleBook() {
    if (!selected || !date || !heure) return
    setBooking(true)
    try {
      const startDateTime = `${date}T${heure}:00`
      const [h, m] = heure.split(':').map(Number)
      const totalMin = (h ?? 0) * 60 + (m ?? 0) + 45
      const endH = String(Math.floor(totalMin / 60)).padStart(2, '0')
      const endM = String(totalMin % 60).padStart(2, '0')
      const endDateTime = `${date}T${endH}:${endM}:00`

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selected.id,
          internEmail: selected.interns?.email ?? '',
          internName: `${selected.first_name} ${selected.last_name}`,
          startDateTime,
          endDateTime,
        }),
      })
      const result = await res.json() as { meetLink?: string }
      showToast(`RDV créé ! ${result.meetLink ? `Meet: ${result.meetLink}` : ''}`)
      setShowModal(false)
      // refresh
      fetch('/api/calendar/events')
        .then((r) => r.ok ? r.json() as Promise<CalEvent[]> : Promise.resolve([]))
        .then(setEvents)
        .catch(() => null)
    } catch {
      showToast('Erreur lors de la création du RDV')
    } finally {
      setBooking(false)
    }
  }

  const hours = Array.from({ length: 19 }, (_, i) => {
    const total = 9 * 60 + i * 30
    const h = String(Math.floor(total / 60)).padStart(2, '0')
    const m = String(total % 60).padStart(2, '0')
    return `${h}:${m}`
  })

  return (
    <div className="p-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Agenda</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Entretiens et rendez-vous</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#c8a96e] text-white rounded-lg text-sm font-medium hover:bg-[#b8996e] transition-colors"
        >
          + Nouveau RDV
        </button>
      </div>

      {/* Google not configured banner */}
      {isMock && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Google Calendar non configuré — <code className="text-xs">GOOGLE_REFRESH_TOKEN=placeholder</code>. Les RDV créés seront simulés.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">Aucun événement à venir</div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const dt = ev.start?.dateTime ?? ev.start?.date
            const meetLink = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri
            return (
              <div key={ev.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-shrink-0 text-right w-20">
                  {dt && (
                    <>
                      <p className="text-xs text-zinc-400">{new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-sm font-semibold text-[#1a1918]">{new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918] truncate">{ev.summary ?? 'Sans titre'}</p>
                </div>
                {meetLink && (
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 bg-[#1a73e8] text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Meet
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[#1a1918] mb-4">Nouveau RDV</h2>

            {/* Search intern */}
            <div className="mb-4 relative">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Stagiaire</label>
              <input
                type="text"
                value={selected ? `${selected.first_name} ${selected.last_name}` : search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
                placeholder="Rechercher un stagiaire..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
              {suggestions.length > 0 && !selected && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelected(s); setSearch(''); setSuggestions([]) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
                    >
                      {s.first_name} {s.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Heure (Bali)</label>
                <select
                  value={heure}
                  onChange={(e) => setHeure(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                >
                  {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => { void handleBook() }}
                disabled={booking || !selected || !date}
                className="flex-2 flex-1 py-2.5 bg-[#c8a96e] text-white rounded-lg text-sm font-semibold hover:bg-[#b8996e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {booking ? 'Création…' : 'Créer le RDV (45min)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
