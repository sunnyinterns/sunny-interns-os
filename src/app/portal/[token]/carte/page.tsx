'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CardData {
  intern: {
    first_name: string
    last_name: string
    photo_url?: string | null
  }
  actual_start_date?: string | null
  actual_end_date?: string | null
  arrival_date?: string | null
  partners: {
    id: string
    name: string
    offer_details?: string | null
    discount_percentage?: number | null
    category?: string | null
  }[]
}

function Initials({ name }: { name: string }) {
  const parts = name.split(' ')
  return <>{parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2)}</>
}

export default function InternCartePage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}/carte`)
      .then((r) => r.ok ? r.json() as Promise<CardData> : Promise.reject())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  function handlePrint() {
    window.print()
  }

  const fullName = data ? `${data.intern.first_name} ${data.intern.last_name}` : ''
  const startDate = data?.actual_start_date ?? data?.arrival_date
  const endDate = data?.actual_end_date

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }} className="no-print">
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Ma carte stagiaire</h1>
      </div>

      {loading ? (
        <div style={{ height: '300px', background: '#1a1918', borderRadius: '20px', animation: 'pulse 1.5s infinite' }} />
      ) : !data ? (
        <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280' }}>Carte non disponible — sera générée à ton arrivée.</p>
        </div>
      ) : (
        <>
          {/* CARD */}
          <div
            ref={cardRef}
            style={{
              background: 'linear-gradient(135deg, #111110 0%, #1a1611 50%, #111110 100%)',
              borderRadius: '20px',
              padding: '28px',
              marginBottom: '20px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(200,169,110,0.3)',
            }}
          >
            {/* Gold accent circles */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(200,169,110,0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(200,169,110,0.05)' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <p style={{ color: '#c8a96e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                  SUNNY INTERNS
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', marginTop: '2px' }}>Formerly Bali Interns</p>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '16px' }}>🌴</span>
              </div>
            </div>

            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              {data.intern.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.intern.photo_url}
                  alt={fullName}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,169,110,0.4)' }}
                />
              ) : (
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(200,169,110,0.3), rgba(200,169,110,0.1))',
                  border: '2px solid rgba(200,169,110,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: 700, color: '#c8a96e',
                }}>
                  <Initials name={fullName} />
                </div>
              )}
              <div>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{fullName}</p>
                <p style={{ color: '#c8a96e', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>Stagiaire Officiel Bali Interns</p>
              </div>
            </div>

            {/* Dates */}
            {(startDate || endDate) && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '24px' }}>
                {startDate && (
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Arrivée</p>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>
                      {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {endDate && (
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Départ</p>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>
                      {new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', margin: 0, lineHeight: 1.5 }}>
              Présentez cette carte pour bénéficier de vos avantages partenaires
            </p>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="no-print"
            style={{
              width: '100%', padding: '12px',
              background: '#1a1918', color: 'white',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            Imprimer / Sauvegarder en PDF
          </button>

          {/* Partenaires */}
          {data.partners.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '14px' }}>
                Avantages partenaires 🎁
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.partners.map((p) => (
                  <div key={p.id} style={{ padding: '12px 14px', background: '#fafaf7', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1918' }}>{p.name}</span>
                      {p.discount_percentage && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#c8a96e', background: 'rgba(200,169,110,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                          -{p.discount_percentage}%
                        </span>
                      )}
                    </div>
                    {p.offer_details && (
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{p.offer_details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
