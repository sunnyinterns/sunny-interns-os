'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface TabArriveeProps {
  caseData: {
    id: string
    flight_number?: string | null
    flight_arrival_datetime?: string | null
    dropoff_address?: string | null
    last_stopover_city?: string | null
    intern_bali_phone?: string | null
    first_name?: string | null
    last_name?: string | null
    driver_notified_j2?: boolean | null
    driver_notified_j0?: boolean | null
    interns?: { phone?: string | null } | null
  }
}

interface ArrivalFields {
  flight_number: string
  last_stopover_city: string
  flight_arrival_datetime: string
  dropoff_address: string
  intern_bali_phone: string
  driver_notified_j2: boolean
  driver_notified_j0: boolean
}

function buildWhatsAppMessage(fields: ArrivalFields, firstName: string, lastName: string): string {
  return [
    `Bonjour [chauffeur],`,
    `Stagiaire : ${[firstName, lastName].filter(Boolean).join(' ')}`,
    `Tél : ${fields.intern_bali_phone || '—'}`,
    `Vol : ${fields.flight_number || '—'} (${fields.last_stopover_city || '?'} → Denpasar)`,
    `Arrivée : ${fields.flight_arrival_datetime ? new Date(fields.flight_arrival_datetime).toLocaleString('fr-FR') : '—'}`,
    `Déposer à : ${fields.dropoff_address || '—'}`,
    `Tracking :`,
    `• https://www.flightradar24.com/${fields.flight_number || ''}`,
    `• https://www.flightaware.com/live/flight/${fields.flight_number || ''}`,
  ].join('\n')
}

export function TabArrivee({ caseData }: TabArriveeProps) {
  const firstName = caseData.first_name ?? ''
  const lastName = caseData.last_name ?? ''

  const [fields, setFields] = useState<ArrivalFields>({
    flight_number: caseData.flight_number ?? '',
    last_stopover_city: caseData.last_stopover_city ?? '',
    flight_arrival_datetime: caseData.flight_arrival_datetime
      ? caseData.flight_arrival_datetime.slice(0, 16)
      : '',
    dropoff_address: caseData.dropoff_address ?? '',
    intern_bali_phone: caseData.intern_bali_phone ?? caseData.interns?.phone ?? '',
    driver_notified_j2: caseData.driver_notified_j2 ?? false,
    driver_notified_j0: caseData.driver_notified_j0 ?? false,
  })

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const automationsBlocked = !fields.flight_number || !fields.flight_arrival_datetime

  const message = buildWhatsAppMessage(fields, firstName, lastName)
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

  const save = useCallback(async (patch: Partial<ArrivalFields>) => {
    setSaving(true)
    try {
      await fetch(`/api/arrival/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setSavedAt(new Date().toLocaleTimeString('fr-FR'))
    } finally {
      setSaving(false)
    }
  }, [caseData.id])

  // Debounced auto-save for text fields
  useEffect(() => {
    const timer = setTimeout(() => {
      void save({
        flight_number: fields.flight_number || null as unknown as string,
        last_stopover_city: fields.last_stopover_city || null as unknown as string,
        flight_arrival_datetime: fields.flight_arrival_datetime || null as unknown as string,
        dropoff_address: fields.dropoff_address || null as unknown as string,
        intern_bali_phone: fields.intern_bali_phone || null as unknown as string,
      })
    }, 1000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fields.flight_number,
    fields.last_stopover_city,
    fields.flight_arrival_datetime,
    fields.dropoff_address,
    fields.intern_bali_phone,
  ])

  function handleCheckbox(key: 'driver_notified_j2' | 'driver_notified_j0', value: boolean) {
    setFields((f) => ({ ...f, [key]: value }))
    void save({ [key]: value })
  }

  function setField<K extends keyof ArrivalFields>(key: K, value: ArrivalFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Automations blocked warning */}
      {automationsBlocked && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-[#dc2626] flex-shrink-0 text-base">⚠</span>
          <p className="text-sm text-red-900">
            Automations d'arrivée bloquées — numéro de vol ou date d'arrivée manquant.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Numéro de vol</label>
            <input
              type="text"
              value={fields.flight_number}
              onChange={(e) => setField('flight_number', e.target.value)}
              placeholder="Ex: QR957"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Dernière escale</label>
            <input
              type="text"
              value={fields.last_stopover_city}
              onChange={(e) => setField('last_stopover_city', e.target.value)}
              placeholder="Ex: Singapour, Kuala Lumpur…"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Date / heure d'arrivée</label>
            <input
              type="datetime-local"
              value={fields.flight_arrival_datetime}
              onChange={(e) => setField('flight_arrival_datetime', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Tél Bali du stagiaire</label>
            <input
              type="text"
              value={fields.intern_bali_phone}
              onChange={(e) => setField('intern_bali_phone', e.target.value)}
              placeholder="+62 8xx xxx xxxx"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Adresse de dépôt</label>
          <input
            type="text"
            value={fields.dropoff_address}
            onChange={(e) => setField('dropoff_address', e.target.value)}
            placeholder="Ex: Villa Sunset, Jl. Raya Seminyak No. 12"
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
        </div>
        {saving && <p className="text-xs text-zinc-400">Sauvegarde…</p>}
        {!saving && savedAt && <p className="text-xs text-zinc-400">Sauvegardé à {savedAt}</p>}
      </div>

      {/* WhatsApp preview */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#1a1918]">Message chauffeur (aperçu)</h3>
        <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-mono bg-zinc-50 rounded-lg p-3 leading-relaxed">
          {message}
        </pre>
        <button
          onClick={() => window.open(whatsappUrl, '_blank')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Ouvrir WhatsApp
        </button>
      </div>

      {/* Driver checkboxes */}
      <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50">
          <input
            type="checkbox"
            checked={fields.driver_notified_j2}
            onChange={(e) => handleCheckbox('driver_notified_j2', e.target.checked)}
            className="w-4 h-4 rounded accent-[#c8a96e]"
          />
          <div>
            <p className="text-sm font-medium text-[#1a1918]">Chauffeur notifié (J-2)</p>
            <p className="text-xs text-zinc-400">Envoi du message 2 jours avant l'arrivée</p>
          </div>
        </label>
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50">
          <input
            type="checkbox"
            checked={fields.driver_notified_j0}
            onChange={(e) => handleCheckbox('driver_notified_j0', e.target.checked)}
            className="w-4 h-4 rounded accent-[#c8a96e]"
          />
          <div>
            <p className="text-sm font-medium text-[#1a1918]">Chauffeur rappelé (J-0)</p>
            <p className="text-xs text-zinc-400">Rappel le jour de l'arrivée</p>
          </div>
        </label>
      </div>
    </div>
  )
}
