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
        sessionStorage.setItem('portal_token', token)
        sessionStorage.setItem('portal_email', email)
        router.push(`/portal/${token}`)
      } else {
        setError('Incorrect email or password')
      }
    } catch {
      setError('Connection error — please try again')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#111110] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#c8a96e]/20 border border-[#c8a96e]/40 mb-4">
            <span className="text-3xl">🌴</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Intern Portal</h1>
          <p className="text-white/40 text-sm mt-1">Sunny Interns · Sign in to your account</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={(e) => { void handleLogin(e) }} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#c8a96e] hover:bg-[#b8994e] disabled:opacity-60 text-[#111110] font-bold rounded-xl transition-all text-sm cursor-pointer">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-white/30 text-xs mt-4">
            Lost your access?{' '}
            <a href="/portal" className="text-[#c8a96e] hover:underline">Request a new link</a>
          </p>
        </div>
      </div>
    </div>
  )
}
