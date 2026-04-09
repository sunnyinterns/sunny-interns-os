'use client'

import { useState } from 'react'

interface TabArriveeProps {
  caseData: {
    id: string
    flight_number?: string | null
    flight_departure_city?: string | null
    flight_arrival_time_local?: string | null
    actual_start_date?: string | null
    actual_end_date?: string | null
    driver_booked?: boolean | null
    welcome_kit_sent_at?: string | null
    whatsapp_ambassador_bali_msg?: string | null
    whatsapp_ambassador_done_msg?: string | null
    interns?: {
      first_name?: string | null
      last_name?: string | null
      return_plane_ticket_url?: string | null
    } | null
  }
}

function showToast(msg = 'Sauvegardé ✓') {
  const el = document.createElement('div')
  el.textContent = msg
  el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 bg-[#0d9e75] text-white text-sm font-medium rounded-lg shadow-lg transition-opacity'
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) }, 1500)
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-50">
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

export function TabArrivee({ caseData }: TabArriveeProps) {
  const firstName = caseData.interns?.first_name ?? ''
  const lastName = caseData.interns?.last_name ?? ''

  const [actualStart, setActualStart] = useState(caseData.actual_start_date ?? '')
  const [actualEnd, setActualEnd] = useState(caseData.actual_end_date ?? '')
  const [flightNumber, setFlightNumber] = useState(caseData.flight_number ?? '')
  const [flightCity, setFlightCity] = useState(caseData.flight_departure_city ?? '')
  const [flightTime, setFlightTime] = useState(caseData.flight_arrival_time_local ?? '')
  const [driverBooked, setDriverBooked] = useState(!!caseData.driver_booked)
  const [welcomeKitSentAt, setWelcomeKitSentAt] = useState<string | null>(caseData.welcome_kit_sent_at ?? null)
  const [markingWelcome, setMarkingWelcome] = useState(false)
  const [baliMsg, setBaliMsg] = useState(caseData.whatsapp_ambassador_bali_msg ?? '')
  const [doneMsg, setDoneMsg] = useState(caseData.whatsapp_ambassador_done_msg ?? '')

  async function patchCase(patch: Record<string, unknown>) {
    await fetch(`/api/cases/${caseData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    showToast()
  }

  async function handleMarkWelcomeKit() {
    setMarkingWelcome(true)
    try {
      const now = new Date().toISOString()
      await patchCase({ welcome_kit_sent_at: now })
      setWelcomeKitSentAt(now)
    } finally {
      setMarkingWelcome(false)
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text)
    showToast('Copié ✓')
  }

  // Compute J-X badge
  const dateBadge = (() => {
    if (!actualStart) return null
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const start = new Date(actualStart)
    const days = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days > 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-[#d97706]">J-{days}</span>
    if (days === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-[#0d9e75]">Aujourd&apos;hui</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">En stage depuis {Math.abs(days)}j</span>
  })()

  const automationsBlocked = !flightNumber

  return (
    <div className="space-y-4">
      {/* Automations blocked warning */}
      {automationsBlocked && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-[#dc2626] flex-shrink-0 text-base">⚠</span>
          <p className="text-sm text-red-900">
            Automations d&apos;arrivée bloquées — numéro de vol manquant.
          </p>
        </div>
      )}

      {/* Section 1: Dates de stage */}
      <SectionCard title="Dates de stage">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Date début</label>
            <input
              type="date"
              value={actualStart}
              onChange={(e) => setActualStart(e.target.value)}
              onBlur={() => { void patchCase({ actual_start_date: actualStart || null }) }}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Date fin</label>
            <input
              type="date"
              value={actualEnd}
              onChange={(e) => setActualEnd(e.target.value)}
              onBlur={() => { void patchCase({ actual_end_date: actualEnd || null }) }}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
        </div>
        {dateBadge && <div className="mt-3">{dateBadge}</div>}
      </SectionCard>

      {/* Section 2: Informations de vol */}
      <SectionCard title="Informations de vol">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Numéro de vol</label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              onBlur={() => { void patchCase({ flight_number: flightNumber || null }) }}
              placeholder="Ex: QR957"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Ville de départ</label>
            <input
              type="text"
              value={flightCity}
              onChange={(e) => setFlightCity(e.target.value)}
              onBlur={() => { void patchCase({ flight_departure_city: flightCity || null }) }}
              placeholder="Ex: Paris CDG"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Heure arrivée locale Bali</label>
            <input
              type="text"
              value={flightTime}
              onChange={(e) => setFlightTime(e.target.value)}
              onBlur={() => { void patchCase({ flight_arrival_time_local: flightTime || null }) }}
              placeholder="Ex: 14h35"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Billet retour</label>
            {caseData.interns?.return_plane_ticket_url ? (
              <a href={caseData.interns.return_plane_ticket_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[#c8a96e] hover:underline">
                Voir le billet ↗
              </a>
            ) : (
              <span className="text-sm text-zinc-300">Non uploadé</span>
            )}
          </div>
        </div>
        {flightNumber && (
          <div className="mt-3 flex gap-3 text-xs">
            <a href={`https://www.flightradar24.com/${flightNumber}`} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline">FlightRadar24 ↗</a>
            <a href={`https://www.flightaware.com/live/flight/${flightNumber}`} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline">FlightAware ↗</a>
          </div>
        )}
      </SectionCard>

      {/* Section 3: Logistique arrivée */}
      <SectionCard title="Logistique arrivée">
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={driverBooked}
            onChange={(e) => {
              setDriverBooked(e.target.checked)
              void patchCase({ driver_booked: e.target.checked })
            }}
            className="w-4 h-4 rounded accent-[#c8a96e]"
          />
          <div>
            <p className="text-sm font-medium text-[#1a1918]">Chauffeur réservé</p>
            <p className="text-xs text-zinc-400">Transfert aéroport confirmé</p>
          </div>
        </label>

        <div className="border-t border-zinc-50 pt-3">
          <p className="text-[11px] text-zinc-400 font-medium mb-1">Welcome kit</p>
          {welcomeKitSentAt ? (
            <p className="text-sm text-[#0d9e75] font-medium">
              Envoyé le {new Date(welcomeKitSentAt).toLocaleDateString('fr-FR')}
            </p>
          ) : (
            <button
              onClick={() => { void handleMarkWelcomeKit() }}
              disabled={markingWelcome}
              className="px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-[#1a1918] rounded-lg transition-colors disabled:opacity-50"
            >
              {markingWelcome ? 'Enregistrement…' : 'Marquer envoyé'}
            </button>
          )}
        </div>
      </SectionCard>

      {/* Section 4: Messages WhatsApp */}
      <SectionCard title="Messages WhatsApp">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-zinc-400 font-medium">Message ambassadeur Bali</label>
              {baliMsg && (
                <button onClick={() => copyToClipboard(baliMsg)} className="text-xs text-[#c8a96e] hover:underline">Copier</button>
              )}
            </div>
            <textarea
              value={baliMsg}
              onChange={(e) => setBaliMsg(e.target.value)}
              onBlur={() => { void patchCase({ whatsapp_ambassador_bali_msg: baliMsg || null }) }}
              rows={3}
              placeholder="Hello, ton stage à Bali est en cours !"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-zinc-400 font-medium">Message ambassadeur terminé</label>
              {doneMsg && (
                <button onClick={() => copyToClipboard(doneMsg)} className="text-xs text-[#c8a96e] hover:underline">Copier</button>
              )}
            </div>
            <textarea
              value={doneMsg}
              onChange={(e) => setDoneMsg(e.target.value)}
              onBlur={() => { void patchCase({ whatsapp_ambassador_done_msg: doneMsg || null }) }}
              rows={3}
              placeholder="Hello, ton stage à Bali est terminé !"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
        </div>
      </SectionCard>

      {/* WhatsApp chauffeur preview */}
      {flightNumber && (
        <SectionCard title="Message chauffeur (aperçu)">
          <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-mono bg-zinc-50 rounded-lg p-3 leading-relaxed">
{`Bonjour [chauffeur],
Stagiaire : ${firstName} ${lastName}
Vol : ${flightNumber} (→ Denpasar)
Arrivée locale : ${flightTime || '—'}
Tracking :
• https://www.flightradar24.com/${flightNumber}
• https://www.flightaware.com/live/flight/${flightNumber}`}
          </pre>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => copyToClipboard(`Bonjour [chauffeur],\nStagiaire : ${firstName} ${lastName}\nVol : ${flightNumber} (→ Denpasar)\nArrivée locale : ${flightTime || '—'}\nTracking :\n• https://www.flightradar24.com/${flightNumber}\n• https://www.flightaware.com/live/flight/${flightNumber}`)}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-[#1a1918] rounded-xl transition-colors text-center"
            >
              Copier le message
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Bonjour,\nStagiaire : ${firstName} ${lastName}\nVol : ${flightNumber} (→ Denpasar)\nArrivée locale : ${flightTime || '—'}\nTracking :\n• https://www.flightradar24.com/${flightNumber}\n• https://www.flightaware.com/live/flight/${flightNumber}`)}`, '_blank')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
