'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export default function SubmitContentPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''

  const [testimonial, setTestimonial] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!testimonial.trim() && !photoUrl.trim()) {
      setErrorMsg('Ajoute un témoignage ou une photo pour continuer.')
      return
    }
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/submit-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          testimonial: testimonial.trim() || null,
          photo_url: photoUrl.trim() || null,
          rating: rating || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur')
      }
      setState('success')
    } catch (e) {
      setState('error')
      setErrorMsg(e instanceof Error ? e.message : 'Erreur réseau')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#c8a96e' }}>
            SUNNY INTERNS
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Partage ton expérience</p>
        </div>

        {state === 'success' ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0d9e75" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[#1a1918]">Merci pour ton témoignage !</p>
            <p className="text-sm text-zinc-500 mt-2">
              Ton contenu a été envoyé et sera relu par l&apos;équipe Sunny Interns.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100" style={{ backgroundColor: '#c8a96e' }}>
              <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Témoignage UGC</p>
              <p className="text-white font-medium mt-0.5">Raconte ton aventure !</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Note globale</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-2xl transition-transform hover:scale-110"
                    >
                      <span className={star <= rating ? 'text-[#c8a96e]' : 'text-zinc-200'}>★</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Ton témoignage</label>
                <textarea
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
                  placeholder="Raconte ton expérience à Bali/Bangkok : le stage, la vie là-bas, les rencontres, ce que tu en retiens..."
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                />
              </div>

              {/* Photo URL */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Lien photo / vidéo</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  placeholder="https://drive.google.com/... ou Instagram, TikTok..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
                <p className="text-xs text-zinc-400 mt-1">Partage un lien Google Drive, Dropbox, ou réseau social.</p>
              </div>

              {errorMsg && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-100">
              <button
                type="submit"
                disabled={state === 'submitting'}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
              >
                {state === 'submitting' ? 'Envoi…' : 'Envoyer mon témoignage'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
