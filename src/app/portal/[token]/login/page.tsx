'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PortalTokenLoginPage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleForgotPassword() {
    if (!token) return
    setResetting(true)
    try {
      const res = await fetch(`/api/portal/${token}/reset-password`, { method: 'POST' })
      if (res.ok) setResetSent(true)
      else setError("Could not reset password — contact team@bali-interns.com")
    } catch {
      setError("Network error — contact team@bali-interns.com")
    } finally { setResetting(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        localStorage.setItem('portal_token', token)
        localStorage.setItem('portal_email', email)
        router.push(`/portal/${token}`)
      } else {
        setError('Incorrect email or password')
      }
    } catch {
      setError('Connection error — please try again')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFCC00]/20 border border-[#FFCC00]/40 mb-4">
            <span className="text-3xl">🌴</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Intern Portal</h1>
          <p className="text-white/40 text-sm mt-1">Bali Interns · Sign in to your account</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={(e) => { void handleLogin(e) }} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] text-sm"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#FFCC00] hover:bg-[#E6B800] disabled:opacity-60 text-[#1A1A1A] font-bold rounded-xl transition-all text-sm cursor-pointer">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {resetSent ? (
            <div className="text-center mt-4 p-3 bg-green-900/30 rounded-xl">
              <p className="text-green-400 text-xs">✅ A new password has been sent to your email.</p>
            </div>
          ) : (
            <p className="text-center text-white/30 text-xs mt-4">
              Forgot your password?{' '}
              <button onClick={() => void handleForgotPassword()} disabled={resetting}
                className="text-[#FFCC00] hover:underline disabled:opacity-50 bg-transparent border-none cursor-pointer text-xs">
                {resetting ? 'Sending…' : 'Send me a new one'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
