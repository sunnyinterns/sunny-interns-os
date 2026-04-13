'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const name = params.get('name') ?? ''
  const email = params.get('email') ?? ''
  const rdv = params.get('rdv')
  const langParam = params.get('lang')
  const isFr = langParam !== 'en'

  // Clear form data on mount
  useEffect(() => {
    try { localStorage.removeItem('apply_form_v1') } catch {}
    try { localStorage.removeItem('apply_mobile_step_v1') } catch {}
  }, [])

  const STEPS_FR = [
    { emoji: '✅', label: 'Candidature reçue', done: true },
    { emoji: '📅', label: 'Entretien de qualification', done: !!rdv, active: !rdv },
    { emoji: '💼', label: 'Matching avec nos partenaires', done: false },
    { emoji: '🌴', label: 'Stage à Bali !', done: false },
  ]

  const STEPS_EN = [
    { emoji: '✅', label: 'Application received', done: true },
    { emoji: '📅', label: 'Qualification interview', done: !!rdv, active: !rdv },
    { emoji: '💼', label: 'Matching with our partners', done: false },
    { emoji: '🌴', label: 'Internship in Bali!', done: false },
  ]

  const steps = isFr ? STEPS_FR : STEPS_EN

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
            ? <>Candidature envoy&eacute;e !</>
            : <>Application sent!</>}
        </h1>

        {name && (
          <p className="text-lg text-[#c8a96e] font-semibold mb-1">
            {isFr ? `Félicitations ${name} !` : `Congratulations ${name}!`}
          </p>
        )}

        <p className="text-base text-zinc-700 mb-2 font-medium">
            {isFr
              ? "Ta candidature pour un stage à Bali a bien été reçue."
              : "Your internship application for Bali has been received."}
          </p>
          {email && (
            <p className="text-sm text-zinc-500 mb-2">
              {isFr
                ? `Tu recevras très bientôt un email de confirmation à ${email} avec les informations de connexion à ton entretien de qualification qui aura lieu sur Google Meet.`
                : `You will shortly receive a confirmation email at ${email} with your Google Meet qualification interview details.`}
            </p>
          )}

        {rdv && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium flex items-center gap-2">
            <span>✅</span>
            <span>{isFr ? 'Ton entretien Google Meet est confirmé !' : 'Your Google Meet interview is confirmed!'}</span>
          </div>
        )}

        {/* Timeline des prochaines étapes */}
        <div className="mt-6 mb-8 text-left">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 text-center">
            {isFr ? 'Prochaines étapes' : 'Next steps'}
          </p>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                {/* Vertical line */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-[18px] top-[36px] w-0.5 h-[calc(100%)] rounded-full"
                    style={{ backgroundColor: step.done ? '#0d9e75' : '#e5e7eb' }}
                  />
                )}
                {/* Icon circle */}
                <div
                  className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{
                    backgroundColor: step.done ? '#0d9e75' : step.active ? '#c8a96e' : '#f4f4f5',
                    color: step.done || step.active ? 'white' : '#9ca3af',
                  }}
                >
                  {step.emoji}
                </div>
                {/* Text */}
                <div className="flex-1 pb-5 pt-1.5">
                  <p className={`text-sm font-medium ${step.done ? 'text-[#0d9e75]' : step.active ? 'text-[#c8a96e]' : 'text-zinc-400'}`}>
                    {step.label}
                  </p>
                  {step.done && i === 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isFr ? 'Terminé' : 'Completed'}
                    </p>
                  )}
                  {step.active && (
                    <p className="text-xs text-[#c8a96e] mt-0.5">
                      {isFr ? 'Bient\u00f4t' : 'Coming soon'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl p-4">
            <span className="text-xl flex-shrink-0">{'\uD83D\uDCE7'}</span>
            <div>
              <p className="text-sm font-medium text-[#1a1918]">
                {isFr ? 'Vérifie tes emails' : 'Check your emails'}
              </p>
              <p className="text-xs text-zinc-500">
                {isFr
                  ? 'Tu recevras le lien Google Meet de ton entretien de qualification par email dans quelques minutes. Pense à vérifier tes spams.'
                  : 'You will receive your Google Meet qualification interview link by email in a few minutes. Check your spam folder.'}
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

        {/* Signature */}
        <div className="mb-6 text-center text-sm text-zinc-500">
          <p>Questions ? <a href="mailto:team@bali-interns.com" className="text-[#c8a96e] underline font-medium">team@bali-interns.com</a></p>
          <p className="mt-1 font-medium text-zinc-600">{isFr ? 'À très vite,' : 'See you soon,'} <br /><span className="text-[#c8a96e]">{isFr ? "L'équipe Bali Interns" : "The Bali Interns Team"}</span></p>
        </div>

        {/* WhatsApp */}
        <a
          href="https://wa.me/33643487736?text=Bonjour%2C%20j%27ai%20soumis%20ma%20candidature%20Bali%20Interns%20%F0%9F%8C%B4"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-[#25d366] text-white hover:bg-[#1da851] transition-all mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          {isFr ? 'Des questions ? \u00c9cris-nous sur WhatsApp' : 'Questions? Message us on WhatsApp'}
        </a>

        {/* Retour au site */}
        <a
          href="https://www.bali-interns.com"
          className="inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-all"
        >
          {isFr ? "Retour au site" : 'Back to website'}
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
