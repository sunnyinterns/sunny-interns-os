'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CandidatureEnvoyeePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf7] px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0d9e75]/10 mb-6">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#0d9e75" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1a1918] mb-3">Candidature envoyée !</h1>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          Ton dossier a bien été reçu. Notre équipe va l'examiner et te contactera dans les prochains jours.
        </p>
        <Link
          href={`/${locale}/login`}
          className="inline-block px-6 py-2.5 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
