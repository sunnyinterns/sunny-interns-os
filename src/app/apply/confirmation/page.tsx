'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const name = params.get('name') ?? ''
  const rdv = params.get('rdv')
  const langParam = params.get('lang')
  const isFr = langParam !== 'en'

  // Clear form data on mount
  useEffect(() => {
    try { localStorage.removeItem('apply_form_v1') } catch {}
    try { localStorage.removeItem('apply_mobile_step_v1') } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Animated check */}
        <div className="relative w-24 h-24 mx-auto mb-8 animate-[scaleIn_0.5s_ease-out]">
          <div className="absolute inset-0 rounded-full bg-[#0d9e75]/15 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-[#0d9e75] flex items-center justify-center animate-[fadeScale_0.6s_ease-out]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#1a1918] mb-2">
          {isFr
            ? <>F&eacute;licitations {name} ! {'\uD83C\uDF89'}</>
            : <>Congratulations {name}! {'\uD83C\uDF89'}</>}
        </h1>

        <p className="text-lg text-[#c8a96e] mb-1">
          {isFr ? 'Ta candidature a bien \u00e9t\u00e9 re\u00e7ue !' : 'Your application has been received!'}
        </p>

        {rdv && (
          <p className="text-sm text-[#0d9e75] font-medium mb-4">
            {isFr
              ? 'Ton RDV est confirm\u00e9. Tu recevras un email de confirmation.'
              : 'Your call is confirmed. You will receive a confirmation email.'}
          </p>
        )}

        {/* Info cards */}
        <div className="space-y-3 mt-6 mb-8 text-left">
          <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl p-4">
            <span className="text-xl flex-shrink-0">{'\uD83D\uDCE7'}</span>
            <div>
              <p className="text-sm font-medium text-[#1a1918]">
                {isFr ? 'Email de confirmation' : 'Confirmation email'}
              </p>
              <p className="text-xs text-zinc-500">
                {isFr
                  ? 'Tu recevras un email dans quelques minutes.'
                  : 'You will receive an email in a few minutes.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl p-4">
            <span className="text-xl flex-shrink-0">{'ℹ️'}</span>
            <div>
              <p className="text-sm font-medium text-[#1a1918]">
                {isFr ? "Pas d'email reçu ?" : "No confirmation email?"}
              </p>
              <p className="text-xs text-zinc-500">
                {isFr
                  ? <span>Contacte-nous à <a href="mailto:team@bali-interns.com" className="text-[#c8a96e] underline">team@bali-interns.com</a></span>
                  : <span>Contact us at <a href="mailto:team@bali-interns.com" className="text-[#c8a96e] underline">team@bali-interns.com</a></span>
                }
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://bali-interns.com"
          className="inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-all"
        >
          {isFr ? "Retour \u00e0 l'accueil" : 'Back to homepage'}
        </a>
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeScale {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
