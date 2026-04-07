'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmeContent() {
  const params = useSearchParams()
  const prenom = params.get('prenom') ?? ''
  const meet = params.get('meet') ?? ''

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1918', margin: '0 0 8px' }}>
        RDV confirmé {prenom ? `, ${prenom}` : ''} !
      </h1>
      <p style={{ color: '#6b7280', fontSize: '16px', margin: '0 0 32px' }}>
        Tu vas recevoir une invitation par email. On a hâte de te parler !
      </p>

      {meet ? (
        <a
          href={meet}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 32px',
            background: '#1a73e8',
            color: 'white',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '24px',
          }}
        >
          🎥 Rejoindre le Google Meet
        </a>
      ) : (
        <div style={{ padding: '16px 24px', background: '#f3f4f6', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ color: '#374151', fontSize: '14px', margin: 0 }}>
            Le lien de visioconférence te sera envoyé par email.
          </p>
        </div>
      )}

      <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 8px' }}>
        Ton chauffeur t&apos;attendera à l&apos;arrivée à l&apos;aéroport de Denpasar.
      </p>
      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}

export default function ConfirmePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>}>
      <ConfirmeContent />
    </Suspense>
  )
}
