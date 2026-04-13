'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PortalLoginPage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        sessionStorage.setItem('portal_token', token)
        sessionStorage.setItem('portal_email', email)
        router.push(`/portal/${token}`)
      } else {
        setError('Email ou mot de passe incorrect')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>🌴</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1918', margin: '12px 0 4px' }}>
            Espace Candidat
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Bali Interns</p>
        </div>

        <form onSubmit={(e) => { void handleLogin(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="ton@email.com"
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 10,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Mot de passe temporaire"
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 10,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 500, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
              background: loading ? '#d1d5db' : '#c8a96e', color: 'white',
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
            Premiere connexion ? Utilise le mot de passe recu par email.
          </p>
        </form>
      </div>
    </div>
  )
}
