'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email required'); return }
    setLoading(true); setError(null)
    try {
      const { error: err } = await getClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/portal/dashboard` },
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
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

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {sent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-white font-semibold text-lg mb-2">Check your inbox</h2>
              <p className="text-white/50 text-sm">
                A sign-in link has been sent to{' '}
                <span className="text-white font-medium">{email}</span>.
              </p>
              <p className="text-white/30 text-xs mt-3">Check your spam folder if needed.</p>
            </div>
          ) : (
            <>
              <button
                onClick={() => getClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/portal/dashboard` } })}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white font-medium text-sm transition-all cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={(e) => { void handleMagicLink(e) }} className="space-y-3">
                <div>
                  <label className="block text-sm text-white/50 mb-1.5">Your email address</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm"
                  />
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#c8a96e] hover:bg-[#b8994e] disabled:opacity-60 text-[#111110] font-bold rounded-xl transition-all text-sm cursor-pointer">
                  {loading ? 'Sending…' : 'Send me a sign-in link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          New applicant?{' '}
          <Link href={`${process.env.NEXT_PUBLIC_VITRINE_URL ?? "https://bali-interns.com"}/fr/apply`} className="text-[#c8a96e] hover:underline">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  )
}
