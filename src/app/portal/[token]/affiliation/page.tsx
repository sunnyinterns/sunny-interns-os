'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface AffiliateData {
  code: string
  total_referred: number
  total_paid: number
  pending_payout: number
  paid_out: number
  commission_eur: number
}

export default function PortalAffiliationPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<AffiliateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}/affiliation`)
      .then((r) => r.ok ? r.json() as Promise<AffiliateData> : Promise.reject())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  function copyLink() {
    if (!data) return
    const url = `${window.location.origin}/fr/candidater?ref=${data.code}`
    void navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareUrl = data ? `${typeof window !== 'undefined' ? window.location.origin : 'https://app.bali-interns.com'}/fr/candidater?ref=${data.code}` : ''

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Programme parrainage</h1>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1918 0%, #2a2522 100%)', borderRadius: '20px', padding: '28px', marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>🌴</p>
        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0 }}>Gagne 100€ par ami placé !</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '8px' }}>
          Partage ton lien de parrainage. Pour chaque ami qui signe sa convention, tu reçois {data?.commission_eur ?? 100}€.
        </p>
      </div>

      {loading ? (
        <div style={{ height: '100px', background: '#f3f4f6', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
      ) : !data ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Code de parrainage non disponible.</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Ton code sera activé après signature de la convention.</p>
        </div>
      ) : (
        <>
          {/* Code + lien */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <p style={{ color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Ton code
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#c8a96e', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                {data.code}
              </span>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
              <p style={{ color: '#6b7280', fontSize: '11px', wordBreak: 'break-all' }}>{shareUrl}</p>
            </div>
            <button
              onClick={copyLink}
              style={{
                width: '100%', padding: '12px',
                background: copied ? '#0d9e75' : '#c8a96e',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {copied ? '✓ Lien copié !' : 'Copier le lien de parrainage'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hey ! Je fais un stage à Bali avec Sunny Interns et c'est incroyable 🌴 Utilise mon code ${data.code} pour candidater : ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', width: '100%', padding: '12px', textAlign: 'center',
                background: '#25D366', color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none', marginTop: '8px',
              }}
            >
              Partager sur WhatsApp
            </a>
          </div>

          {/* IBAN section */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
              Compte bancaire pour virement
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              Nous effectuons les virements manuellement dès que ton ami a payé.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Amis parrainés', value: data.total_referred, color: '#1a1918' },
              { label: 'Ont payé', value: data.total_paid, color: '#1a1918' },
              { label: 'En attente', value: `${data.pending_payout}€`, color: '#d97706' },
              { label: 'Versé', value: `${data.paid_out}€`, color: '#0d9e75' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1a1918', marginBottom: '14px' }}>Comment ça marche ?</h3>
            {[
              { step: '1', text: 'Partage ton lien ou ton code à un ami intéressé par un stage à Bali' },
              { step: '2', text: 'Ton ami candidature via ton lien' },
              { step: '3', text: `Lorsqu'il signe sa convention de stage et paie, tu reçois ${String(data.commission_eur)}€` },
              { step: '4', text: 'Bali Interns te vire la commission sur ton compte bancaire' },
            ].map((s) => (
              <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c8a96e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {s.step}
                </div>
                <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
