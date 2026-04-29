'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Guesthouse {
  id: string
  name: string
  city?: string | null
  price_per_month?: number | null
  amenities?: string[] | null
}

export default function LogementPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [guesthouses, setGuesthouses] = useState<Guesthouse[]>([])
  const [selectedHousing, setSelectedHousing] = useState('')
  const [wantsScooter, setWantsScooter] = useState<'yes' | 'no' | ''>('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/guesthouses')
      .then((r) => r.ok ? r.json() as Promise<Guesthouse[]> : Promise.resolve([]))
      .then(setGuesthouses)
      .catch(() => [])
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wantsScooter) { setError('Please indicate if you want a scooter'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/logement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ housingId: selectedHousing, wantsScooter: wantsScooter === 'yes' }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Préférences enregistrées !</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>We will confirm your accommodation and scooter shortly.</p>
        <Link href={`/portal/${token}`} style={{ color: '#FFCC00', fontWeight: 600, textDecoration: 'none' }}>← Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ color: '#FFCC00', fontSize: '13px', textDecoration: 'none' }}>← Back</Link>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A1A', margin: '16px 0 4px' }}>Logement &amp; Scooter</h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Choose your accommodation and let us know if you want a scooter.</p>

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        {guesthouses.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Logements disponibles</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {guesthouses.map((g) => (
                <label key={g.id} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="housing" value={g.id} checked={selectedHousing === g.id} onChange={() => setSelectedHousing(g.id)} style={{ display: 'none' }} />
                  <div style={{
                    padding: '14px 16px', background: 'white', borderRadius: '10px',
                    border: `1.5px solid ${selectedHousing === g.id ? '#FFCC00' : '#e5e7eb'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>{g.name}</span>
                      {g.price_per_month && (
                        <span style={{ fontSize: '13px', color: '#FFCC00', fontWeight: 600 }}>{g.price_per_month}€/mois</span>
                      )}
                    </div>
                    {g.city && <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>{g.city}</p>}
                    {g.amenities && g.amenities.length > 0 && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>{g.amenities.join(' · ')}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Scooter inclus ?</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['yes', 'no'] as const).map((v) => (
              <label key={v} style={{ flex: 1, cursor: 'pointer' }}>
                <input type="radio" name="scooter" value={v} checked={wantsScooter === v} onChange={() => setWantsScooter(v)} style={{ display: 'none' }} />
                <div style={{
                  padding: '12px', textAlign: 'center', background: 'white', borderRadius: '10px',
                  border: `1.5px solid ${wantsScooter === v ? '#FFCC00' : '#e5e7eb'}`,
                  color: wantsScooter === v ? '#FFCC00' : '#374151',
                  fontWeight: wantsScooter === v ? 600 : 400,
                  fontSize: '14px',
                }}>
                  {v === 'yes' ? '🛵 Yes' : '🚶 No'}
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#FFCC00', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving…' : 'Confirm my preferences'}
        </button>
      </form>
    </div>
  )
}
