'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/fr/feed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf7] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#c8a96e] mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1a1918]">Bali Interns OS</h1>
          <p className="text-sm text-zinc-500 mt-1">Connexion à l&apos;espace équipe</p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={() => { void handleGoogleLogin() }}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 rounded-xl bg-white text-[#1a1918] text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 transition-colors shadow-sm"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        <p className="text-center text-xs text-zinc-400 mt-2">
          Accès agenda Google Calendar inclus ✓
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-xs text-zinc-400">ou email</span>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>

        {/* Email / Password */}
        <form onSubmit={(e) => { void handleEmailLogin(e) }} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-500 mb-1.5">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="vous@bali-interns.com"
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl bg-white text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1.5">Mot de passe</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl bg-white text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all" />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#1a1918] hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

      </div>
    </div>
  )
}
