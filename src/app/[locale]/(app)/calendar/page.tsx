'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

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
  desired_jobs: string[] | null
  case_id: string | null
  html_link: string | null
}

const CANCEL_TEMPLATES = [
  {
    id: 'dates',
    label: 'Dates ne correspondent pas',
    message: `Bonjour,\n\nMerci pour ta candidature chez Bali Interns.\n\nAprès revue de ton dossier, les dates que tu envisages ne correspondent malheureusement pas à nos disponibilités actuelles. Nous ne serons pas en mesure de donner suite à ta candidature pour cette période.\n\nNous t'encourageons à postuler à nouveau lorsque tes disponibilités évolueront.\n\nCordialement,\nL'équipe Bali Interns`
  },
  {
    id: 'no_offers',
    label: "Pas d'offres disponibles",
    message: `Bonjour,\n\nMerci pour ta candidature chez Bali Interns.\n\nMalgré la qualité de ton profil, nous ne disposons malheureusement pas d'offres de stage correspondant à tes souhaits pour la période concernée.\n\nNous gardons ton dossier et reviendrons vers toi si une opportunité se présente.\n\nCordialement,\nL'équipe Bali Interns`
  },
  {
    id: 'too_short',
    label: 'Durée trop courte (3 mois minimum)',
    message: `Bonjour,\n\nMerci pour ta candidature chez Bali Interns.\n\nNous avons bien pris connaissance de ton dossier. Cependant, la durée de stage que tu envisages est inférieure à notre minimum requis de 3 mois. Nos partenaires employeurs exigent un engagement minimum de 3 mois pour garantir un apprentissage de qualité.\n\nSi tes contraintes évoluent, n'hésite pas à nous recontacter.\n\nCordialement,\nL'équipe Bali Interns`
  },
  {
    id: 'english',
    label: "L'anglais est indispensable",
    message: `Bonjour,\n\nMerci pour ta candidature chez Bali Interns.\n\nNous avons étudié ton dossier avec attention. La maîtrise de l'anglais est indispensable pour travailler dans nos entreprises partenaires à Bali, où la langue de travail est exclusivement l'anglais.\n\nNous t'encourageons à renforcer ton niveau et à postuler à nouveau.\n\nCordialement,\nL'équipe Bali Interns`
  },
  {
    id: 'custom',
    label: 'Message personnalisé',
    message: `Bonjour,\n\nMerci pour ta candidature chez Bali Interns.\n\nAprès revue de ton dossier, nous ne serons malheureusement pas en mesure de donner suite à ta candidature.\n\nCordialement,\nL'équipe Bali Interns`
  },
]

const RESCHEDULE_MESSAGE = (link: string | null) =>
  `Bonjour,\n\nNous sommes sincèrement désolés, mais un empêchement de dernière minute nous empêche d'assurer notre rendez-vous prévu.\n\nNous vous invitons à choisir un nouveau créneau via le lien suivant :\n${link ?? '[Lien de reprogrammation]'}\n\nEncore toutes nos excuses pour la gêne occasionnée.\n\nCordialement,\nL'équipe Bali Interns`

function toWITA(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
  })
}

function isToday(iso: string) {
  const bali = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  return bali.toDateString() === now.toDateString()
}

function isTomorrow(iso: string) {
  const bali = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const tom = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  tom.setDate(tom.getDate() + 1)
  return bali.toDateString() === tom.toDateString()
}

function StatusBadge({ ev }: { ev: CalEvent }) {
  if (ev.status === 'cancelled') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Annulé</span>
  if (ev.my_response_status === 'declined') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">Refusé</span>
  if (ev.my_response_status === 'accepted') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Confirmé ✓</span>
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-semibold">En attente</span>
}

// ─── POPUP ANNULER ───────────────────────────────────────────────────────────
function CancelPopup({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState(CANCEL_TEMPLATES[0].id)
  const [message, setMessage] = useState(CANCEL_TEMPLATES[0].message)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function selectTemplate(id: string) {
    const t = CANCEL_TEMPLATES.find(t => t.id === id)
    if (t) { setSelectedTemplate(id); setMessage(t.message) }
  }

  async function sendCancel() {
    if (!event.intern_email) return
    setSending(true)
    try {
      await fetch('/api/calendar/cancel-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: event.intern_email,
          intern_name: event.intern_name,
          message,
          event_id: event.id,
        })
      })
      setSent(true)
      setTimeout(onClose, 2000)
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-[#1a1918]">❌ Annuler le RDV</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{event.intern_name ?? event.intern_email ?? 'Candidat inconnu'} · {timeOnly(event.start_datetime)} WITA</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Templates */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Motif</p>
            <div className="space-y-1.5">
              {CANCEL_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                    selectedTemplate === t.id
                      ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message éditable */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Message (modifiable)</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={10}
              className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
            />
          </div>

          {sent && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm font-medium">
              ✓ Email envoyé à {event.intern_email}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              Annuler
            </button>
            <button
              onClick={sendCancel}
              disabled={sending || sent || !event.intern_email}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
            >
              {sending ? 'Envoi…' : sent ? '✓ Envoyé' : 'Confirmer et envoyer par email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── POPUP REPROGRAMMER ──────────────────────────────────────────────────────
function ReschedulePopup({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const [message, setMessage] = useState(RESCHEDULE_MESSAGE(event.cancel_reschedule_link))
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendReschedule() {
    if (!event.intern_email) return
    setSending(true)
    try {
      await fetch('/api/calendar/cancel-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: event.intern_email,
          intern_name: event.intern_name,
          message,
          event_id: event.id,
          subject: 'Reprogrammation de votre entretien Bali Interns',
        })
      })
      setSent(true)
      setTimeout(onClose, 2000)
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-[#1a1918]">🔄 Reprogrammer le RDV</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{event.intern_name ?? event.intern_email ?? 'Candidat inconnu'} · {timeOnly(event.start_datetime)} WITA</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {event.cancel_reschedule_link && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
              <span>🔗</span>
              <span className="truncate">{event.cancel_reschedule_link}</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Message (modifiable)</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={12}
              className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e]"
            />
          </div>

          {sent && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm font-medium">
              ✓ Email envoyé à {event.intern_email}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              Annuler
            </button>
            <button
              onClick={sendReschedule}
              disabled={sending || sent || !event.intern_email}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-all"
            >
              {sending ? 'Envoi…' : sent ? '✓ Envoyé' : 'Envoyer le message de reprogrammation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CARD ÉVÉNEMENT ──────────────────────────────────────────────────────────
function EventCard({ event, locale }: { event: CalEvent; locale: string }) {
  const [showCancel, setShowCancel] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)

  const internInitials = event.intern_name
    ? event.intern_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-all">
        {/* Header: heure + statut */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-[#1a1918]">{timeOnly(event.start_datetime)}</span>
              <span className="text-sm text-zinc-400">WITA</span>
            </div>
            <p className="text-xs text-zinc-400">{toWITA(event.start_datetime).split(',')[0]}</p>
          </div>
          <StatusBadge ev={event} />
        </div>

        {/* Intern */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-sm font-bold text-[#c8a96e] flex-shrink-0">
            {internInitials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#1a1918] text-sm">{event.intern_name ?? event.intern_email ?? 'Candidat inconnu'}</p>
            <p className="text-xs text-zinc-400 truncate">{event.intern_name ? (event.intern_email ?? '') : ''}</p>
          </div>
          {event.case_id && (
            <a href={`/${locale}/cases/${event.case_id}`} className="ml-auto text-xs text-[#c8a96e] hover:underline flex-shrink-0">
              Dossier →
            </a>
          )}
        </div>

        {/* Métiers */}
        {event.desired_jobs && event.desired_jobs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.desired_jobs.map((j, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-[#c8a96e]/10 text-[#8a6a2a] rounded-full font-medium">
                {j}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {event.meet_link && (
            <a
              href={event.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a73e8] text-white text-xs font-semibold rounded-lg hover:bg-[#1557b0] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5L17 10V7c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3l4 3.5V6.5z"/></svg>
              Google Meet
            </a>
          )}
          {event.html_link && (
            <a href={event.html_link} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors">
              📅 GCal
            </a>
          )}
          {event.status !== 'cancelled' && (
            <>
              <button
                onClick={() => setShowReschedule(true)}
                className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                🔄 Reprogrammer
              </button>
              <button
                onClick={() => setShowCancel(true)}
                className="px-3 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                ❌ Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {showCancel && <CancelPopup event={event} onClose={() => setShowCancel(false)} />}
      {showReschedule && <ReschedulePopup event={event} onClose={() => setShowReschedule(false)} />}
    </>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'cancelled'>('upcoming')

  const load = useCallback(() => {
    setLoading(true)
    const url = tab === 'cancelled'
      ? '/api/calendar/events?status=cancelled'
      : '/api/calendar/events?status=upcoming&days=60'
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then((d: CalEvent[]) => { setEvents(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  useEffect(() => { load() }, [load])

  // Sync Google Calendar
  useEffect(() => {
    fetch('/api/calendar/google-sync', { method: 'POST' }).catch(() => {})
    // Marquer les notifications calendrier comme vues
    fetch('/api/notifications/unread-count?type=calendar', { method: 'POST' }).catch(() => null)
  }, [])

  // Grouper par Aujourd'hui / Demain / À venir
  const today = events.filter(e => isToday(e.start_datetime))
  const tomorrow = events.filter(e => isTomorrow(e.start_datetime))
  const upcoming = events.filter(e => !isToday(e.start_datetime) && !isTomorrow(e.start_datetime))

  function Section({ title, items, accent }: { title: string; items: CalEvent[]; accent?: string }) {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className={`text-sm font-bold uppercase tracking-wider ${accent ?? 'text-zinc-400'}`}>{title}</h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accent === 'text-emerald-600' ? 'bg-emerald-100 text-emerald-700' : accent === 'text-blue-600' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
            {items.length}
          </span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>
        <div className="space-y-4">
          {items.map(ev => <EventCard key={ev.id} event={ev} locale={locale} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">📅 Calendrier RDV</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · Bali (WITA)
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          <button onClick={() => setTab('upcoming')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'upcoming' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-zinc-500'}`}>
            À venir
          </button>
          <button onClick={() => setTab('cancelled')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'cancelled' ? 'bg-white shadow-sm text-[#1a1918]' : 'text-zinc-500'}`}>
            Annulés / Refusés
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : tab === 'cancelled' ? (
        events.length === 0
          ? <div className="text-center py-16 text-zinc-400 text-sm">Aucun RDV annulé ou refusé</div>
          : <div className="space-y-4">{events.map(ev => <EventCard key={ev.id} event={ev} locale={locale} />)}</div>
      ) : (
        <>
          {events.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium text-[#1a1918]">Aucun RDV à venir</p>
              <p className="text-sm text-zinc-400 mt-1">Les prochains entretiens apparaîtront ici</p>
            </div>
          )}
          <Section title="Aujourd'hui" items={today} accent="text-emerald-600" />
          <Section title="Demain" items={tomorrow} accent="text-blue-600" />
          <Section title="À venir" items={upcoming} />
        </>
      )}
    </div>
  )
}
