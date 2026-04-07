'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function BilletPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [billetUrl, setBilletUrl] = useState('')
  const [dateArrivee, setDateArrivee] = useState('')
  const [escale, setEscale] = useState('')
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
        body: JSON.stringify({ billetUrl, dateArrivee, escale }),
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
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', marginBottom: '8px' }}>Billet enregistré !</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Nous allons maintenant lancer la procédure visa.</p>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontWeight: 600, textDecoration: 'none' }}>← Retour au tableau de bord</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '13px', textDecoration: 'none' }}>← Retour</Link>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: '16px 0 4px' }}>Billet d&apos;avion</h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Renseigne les informations de ton vol.</p>

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            URL du billet (lien de réservation)
          </label>
          <input
            type="url"
            value={billetUrl}
            onChange={(e) => setBilletUrl(e.target.value)}
            required
            placeholder="https://..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Date d&apos;arrivée à Bali
          </label>
          <input
            type="date"
            value={dateArrivee}
            onChange={(e) => setDateArrivee(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Dernière escale (ville de départ)
          </label>
          <input
            type="text"
            value={escale}
            onChange={(e) => setEscale(e.target.value)}
            placeholder="ex: Singapour, Kuala Lumpur..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Enregistrement…' : 'Confirmer mon billet'}
        </button>
      </form>
    </div>
  )
}
