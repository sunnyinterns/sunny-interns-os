'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function BilletPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [billetUrl, setBilletUrl] = useState('')
  const [dateArrivee, setDateArrivee] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [escale, setEscale] = useState('')
  const [heureArrivee, setHeureArrivee] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/billet`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billetUrl, dateArrivee, escale, flightNumber, heureArrivee,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'enregistrement')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', marginTop: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1918', marginBottom: 8 }}>Billet enregistré !</h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Nous allons maintenant lancer la procédure visa.</p>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontWeight: 600, textDecoration: 'none' }}>← Retour au tableau de bord</Link>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: 13, textDecoration: 'none' }}>← Retour</Link>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1918', margin: '16px 0 4px' }}>Billet d&apos;avion</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Renseigne les informations de ton vol vers Bali.</p>

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            URL du billet ou lien de réservation
          </label>
          <input type="url" value={billetUrl} onChange={(e) => setBilletUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Date d&apos;arrivée à Bali *
          </label>
          <input type="date" value={dateArrivee} onChange={(e) => setDateArrivee(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Numéro de vol arrivant à Bali *
          </label>
          <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} required placeholder="ex: SQ321" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Ville de départ du dernier vol
          </label>
          <input type="text" value={escale} onChange={(e) => setEscale(e.target.value)} placeholder="ex: Singapore" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Heure d&apos;arrivée locale
          </label>
          <input type="text" value={heureArrivee} onChange={(e) => setHeureArrivee(e.target.value)} placeholder="ex: 14h35" style={inputStyle} />
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#c8a96e', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Enregistrement…' : 'Confirmer mon billet'}
        </button>
      </form>
    </div>
  )
}
