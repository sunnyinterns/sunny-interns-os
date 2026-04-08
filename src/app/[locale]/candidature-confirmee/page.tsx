'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CandidatureConfirmeePage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  return (
    <div className="min-h-screen bg-[#111110] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#c8a96e]/20 border border-[#c8a96e]/40 mb-6">
          <span className="text-4xl">🌴</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          C'est confirmé !
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-8">
          Ton rendez-vous est planifié. Tu vas recevoir un email de confirmation avec le lien Google Meet.
        </p>

        {/* Info box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <div>
              <p className="text-white font-medium text-sm">Email de confirmation</p>
              <p className="text-white/50 text-xs">Vérifie tes spams si tu ne le reçois pas dans 5 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-white font-medium text-sm">Appel de 45 minutes</p>
              <p className="text-white/50 text-xs">Via Google Meet — lien dans l'email</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-white font-medium text-sm">On est là si tu as des questions</p>
              <p className="text-white/50 text-xs">
                <a href="mailto:team@bali-interns.com" className="text-[#c8a96e]">team@bali-interns.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {token && (
          <Link
            href={`/portal/${token}`}
            className="block w-full py-4 bg-[#c8a96e] hover:bg-[#b8994e] text-[#111110] font-bold text-base rounded-xl transition-all mb-4"
          >
            Accéder à mon espace →
          </Link>
        )}
        <p className="text-white/30 text-sm">
          Un lien de connexion a été envoyé à ton adresse email.
        </p>
      </div>
    </div>
  )
}
