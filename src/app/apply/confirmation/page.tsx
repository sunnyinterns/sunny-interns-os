'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const name = params.get('name') ?? ''

  return (
    <div className="min-h-screen bg-[#1a1410] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated check */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-[#0d9e75]/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-[#0d9e75] flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#f5f0e6] mb-2">
          Félicitations {name} !
        </h1>
        <h2 className="text-xl text-[#c8a96e] mb-2">
          Congratulations {name}!
        </h2>

        <p className="text-lg text-[#c8a96e] mb-1">
          Ta candidature a bien été reçue !
        </p>
        <p className="text-sm text-[#8a7d6d] mb-2">
          Your application has been received!
        </p>

        <p className="text-sm text-[#8a7d6d] mb-8">
          Tu vas recevoir un email de confirmation dans quelques minutes.
          <br />
          You will receive a confirmation email shortly.
        </p>

        <a
          href="/portal"
          className="inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold bg-[#c8a96e] text-[#1a1410] hover:bg-[#b8945a] transition-all"
        >
          Accéder à ton espace / Access your space
        </a>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1410] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
