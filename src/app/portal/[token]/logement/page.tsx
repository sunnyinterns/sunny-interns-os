'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Guesthouse {
  id: string
  name: string
  city?: string | null
  price_range?: string | null
  price_per_month?: number | null
  amenities?: string[] | null
  google_map_url?: string | null
  booking_url?: string | null
  whatsapp?: string | null
  climatisation?: boolean | null
  piscine?: boolean | null
  cuisine?: boolean | null
}

interface Scooter {
  id: string
  name: string
  price_range?: string | null
  whatsapp?: string | null
}

export default function LogementPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [guesthouses, setGuesthouses] = useState<Guesthouse[]>([])
  const [scooters, setScooters] = useState<Scooter[]>([])
  const [selectedHousing, setSelectedHousing] = useState('')
  const [selectedScooter, setSelectedScooter] = useState('')
  const [wantsScooter, setWantsScooter] = useState<'yes' | 'no' | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'accommodation' | 'scooter'>('accommodation')

  useEffect(() => {
    Promise.all([
      fetch('/api/guesthouses').then(r => r.ok ? r.json() as Promise<Guesthouse[]> : []),
      fetch('/api/scooters').then(r => r.ok ? r.json() as Promise<Scooter[]> : []).catch(() => []),
    ]).then(([gh, sc]) => {
      setGuesthouses(gh)
      setScooters(sc)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wantsScooter) { setError('Please indicate if you want a scooter'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/logement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          housingId: selectedHousing,
          wantsScooter: wantsScooter === 'yes',
          scooterId: selectedScooter || undefined,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  const C = { yellow: '#FFCC00', dark: '#1A1A1A', muted: '#9ca3af', border: '#e5e7eb', green: '#0d9e75' }
  const card = (selected: boolean): React.CSSProperties => ({
    padding: '14px 16px', background: 'white', borderRadius: 12,
    border: `1.5px solid ${selected ? C.yellow : C.border}`,
    cursor: 'pointer', transition: 'border-color 0.15s',
  })

  if (loading) return <p style={{ color: C.muted, textAlign: 'center', marginTop: 48 }}>Loading…</p>

  if (done) return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Preferences saved!</h2>
      <p style={{ color: C.muted, marginBottom: 24 }}>Our team will confirm your accommodation and scooter shortly.</p>
      <Link href={`/portal/${token}`} style={{ color: C.yellow, fontWeight: 600, textDecoration: 'none' }}>← Back to portal</Link>
    </div>
  )

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ fontSize: 13, color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← Back
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.dark, margin: '0 0 4px' }}>Accommodation & Scooter</h1>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Choose your accommodation and let us know about your scooter preferences.</p>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {(['accommodation', 'scooter'] as const).map(section => (
          <button key={section} onClick={() => setActiveSection(section)}
            style={{ flex: 1, padding: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontSize: 13, fontWeight: 600,
              background: activeSection === section ? C.dark : 'white',
              color: activeSection === section ? C.yellow : C.muted }}>
            {section === 'accommodation' ? '🏠 Accommodation' : '🛵 Scooter'}
          </button>
        ))}
      </div>

      <form onSubmit={e => void handleSubmit(e)}>

        {/* ── ACCOMMODATION SECTION ── */}
        {activeSection === 'accommodation' && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {guesthouses.length} partner guesthouses — Canggu · Seminyak · Ubud
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {guesthouses.map(g => (
                <label key={g.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedHousing(g.id)}>
                  <div style={card(selectedHousing === g.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: 0 }}>{g.name}</p>
                        {g.city && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>📍 {g.city}</p>}
                        {/* Amenities badges */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {g.climatisation && <span style={{ fontSize: 10, padding: '1px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6 }}>❄️ AC</span>}
                          {g.piscine && <span style={{ fontSize: 10, padding: '1px 6px', background: '#f0fdf4', color: '#15803d', borderRadius: 6 }}>🏊 Pool</span>}
                          {g.cuisine && <span style={{ fontSize: 10, padding: '1px 6px', background: '#fffbeb', color: '#92400e', borderRadius: 6 }}>🍳 Kitchen</span>}
                          {g.amenities?.map((a, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '1px 6px', background: '#f3f4f6', color: C.muted, borderRadius: 6 }}>{a}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {g.price_range && <p style={{ fontSize: 13, fontWeight: 700, color: C.yellow, margin: 0 }}>{g.price_range}</p>}
                        {g.price_per_month && !g.price_range && <p style={{ fontSize: 13, fontWeight: 700, color: C.yellow, margin: 0 }}>{g.price_per_month}€/mo</p>}
                        {selectedHousing === g.id && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ Selected</span>}
                      </div>
                    </div>
                    {/* Action links */}
                    {selectedHousing === g.id && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {g.google_map_url && (
                          <a href={g.google_map_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, padding: '4px 10px', background: '#f3f4f6', color: '#374151', borderRadius: 6, textDecoration: 'none' }}>
                            📍 Map
                          </a>
                        )}
                        {g.booking_url && (
                          <a href={g.booking_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, padding: '4px 10px', background: '#f3f4f6', color: '#374151', borderRadius: 6, textDecoration: 'none' }}>
                            🔗 Booking.com
                          </a>
                        )}
                        {g.whatsapp && (
                          <a href={`https://wa.me/${g.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, padding: '4px 10px', background: '#dcfce7', color: '#065f46', borderRadius: 6, textDecoration: 'none' }}>
                            💬 Contact
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              ))}
              {guesthouses.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, background: 'white', borderRadius: 12, border: `1px dashed ${C.border}` }}>
                  <p style={{ fontSize: 14, color: C.muted }}>No guesthouses available yet — contact us on WhatsApp.</p>
                </div>
              )}
            </div>
            {/* Continue to scooter */}
            <button type="button" onClick={() => setActiveSection('scooter')}
              style={{ width: '100%', padding: 14, background: C.yellow, color: C.dark, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Continue → Scooter
            </button>
          </div>
        )}

        {/* ── SCOOTER SECTION ── */}
        {activeSection === 'scooter' && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Do you want to rent a scooter?
            </p>
            {/* Yes / No toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {(['yes', 'no'] as const).map(v => (
                <button key={v} type="button" onClick={() => setWantsScooter(v)}
                  style={{ flex: 1, padding: 14, background: wantsScooter === v ? (v === 'yes' ? C.dark : 'white') : 'white',
                    border: `1.5px solid ${wantsScooter === v ? (v === 'yes' ? C.dark : '#dc2626') : C.border}`,
                    color: wantsScooter === v ? (v === 'yes' ? C.yellow : '#dc2626') : C.muted,
                    borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {v === 'yes' ? '🛵 Yes, I want one' : '🚶 No thanks'}
                </button>
              ))}
            </div>

            {/* Scooter options if yes */}
            {wantsScooter === 'yes' && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  {scooters.length} partner rental companies
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {scooters.map(s => (
                    <label key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedScooter(s.id)}>
                      <div style={card(selectedScooter === s.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: 0 }}>{s.name}</p>
                            {s.price_range && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{s.price_range}</p>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {s.whatsapp && (
                              <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ fontSize: 11, padding: '4px 10px', background: '#dcfce7', color: '#065f46', borderRadius: 6, textDecoration: 'none' }}>
                                💬 WA
                              </a>
                            )}
                            {selectedScooter === s.id && <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓</span>}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                  {scooters.length === 0 && (
                    <div style={{ padding: 16, background: '#f9f7f2', borderRadius: 10 }}>
                      <p style={{ fontSize: 13, color: C.muted }}>No specific preference — our team will recommend one based on your location.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setActiveSection('accommodation')}
                style={{ flex: 0.4, padding: 14, background: 'white', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
              <button type="submit" disabled={saving || !wantsScooter}
                style={{ flex: 1, padding: 14, background: C.yellow, color: C.dark, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || !wantsScooter ? 0.6 : 1 }}>
                {saving ? 'Saving…' : '✅ Confirm preferences'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
