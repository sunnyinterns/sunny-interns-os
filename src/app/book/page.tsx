'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SlotDay {
  date: string
  dayLabel: string
  slots: { start: string; end: string; label: string }[]
}

type Step = 1 | 2

export default function BookPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [message, setMessage] = useState('')

  // Step 2
  const [slotDays, setSlotDays] = useState<SlotDay[]>([])
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/slots')
      if (!res.ok) throw new Error('Impossible de charger les créneaux')
      const data = await res.json() as { slots: SlotDay[] }
      setSlotDays(data.slots)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStart || !selectedEnd) { setError('Sélectionnez un créneau'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internEmail: email,
          internName: prenom + ' ' + nom,
          startDateTime: selectedStart,
          endDateTime: selectedEnd,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la réservation')
      const result = await res.json() as { meetLink?: string }
      router.push(`/book/confirme?prenom=${encodeURIComponent(prenom)}&meet=${encodeURIComponent(result.meetLink ?? '')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf7', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: '#c8a96e', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <span style={{ color: 'white', fontSize: '24px' }}>🌴</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1918', margin: '0 0 4px' }}>Bali Interns</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Prendre un RDV de qualification</p>
      </div>

      <div style={{ width: '100%', maxWidth: '520px', background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? '#c8a96e' : '#e5e7eb', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={(e) => { void handleStep1(e) }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1918', marginTop: 0, marginBottom: '20px' }}>Tes coordonnées</h2>
            {([
              { label: 'Prénom', value: prenom, set: setPrenom, type: 'text', required: true },
              { label: 'Nom', value: nom, set: setNom, type: 'text', required: true },
              { label: 'Email', value: email, set: setEmail, type: 'email', required: true },
              { label: 'WhatsApp (avec indicatif)', value: whatsapp, set: setWhatsapp, type: 'tel', required: false },
            ] as const).map(({ label, value, set, type, required }) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required={required}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Message (optionnel)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Secteur souhaité, questions..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Chargement…' : 'Voir les créneaux →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { void handleSubmit(e) }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1918', marginTop: 0, marginBottom: '4px' }}>Choisis ton créneau</h2>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>Horaires Bali (UTC+8) — 45 minutes</p>
            <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
              {slotDays.map((day) => (
                <div key={day.date} style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', textTransform: 'capitalize', margin: '0 0 8px' }}>{day.dayLabel}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {day.slots.map((slot) => (
                      <label key={slot.start} style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="slot"
                          value={slot.start}
                          checked={selectedStart === slot.start}
                          onChange={() => { setSelectedStart(slot.start); setSelectedEnd(slot.end) }}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          border: '1.5px solid',
                          borderColor: selectedStart === slot.start ? '#c8a96e' : '#e5e7eb',
                          background: selectedStart === slot.start ? '#fdf6ec' : 'white',
                          color: selectedStart === slot.start ? '#c8a96e' : '#374151',
                          transition: 'all 0.15s',
                        }}>
                          {slot.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                ← Retour
              </button>
              <button type="submit" disabled={loading || !selectedStart} style={{ flex: 2, padding: '12px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading || !selectedStart ? 'not-allowed' : 'pointer', opacity: loading || !selectedStart ? 0.6 : 1 }}>
                {loading ? 'Réservation…' : 'Confirmer le RDV'}
              </button>
            </div>
          </form>
        )}
      </div>

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#9ca3af' }}>Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a></p>
    </div>
  )
}
