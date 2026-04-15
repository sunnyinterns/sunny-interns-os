'use client'
import { useRef, useState } from 'react'

interface ChauffeurCardProps {
  internName: string
  arrivalDate: string
  arrivalTime: string
  flightNumber: string
  departureCity: string
  dropoffAddress: string
  photoUrl?: string | null
  logoUrl?: string | null
  onClose?: () => void
}

export function ChauffeurCard({ internName, arrivalDate, arrivalTime, flightNumber, departureCity, dropoffAddress, photoUrl, logoUrl, onClose }: ChauffeurCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const trackingUrl = `https://www.flightradar24.com/${flightNumber.replace(/\s/g, '').toUpperCase()}`

  async function downloadImage() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
      })
      const link = document.createElement('a')
      link.download = `chauffeur-${internName.replace(/\s+/g, '_')}-${flightNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('html2canvas error:', e)
    }
    setDownloading(false)
  }

  const rows: [string, string][] = [
    ['📅', arrivalDate],
    ['⏰', arrivalTime],
    ['✈️', `${flightNumber} · ${departureCity}`],
    ['📍', dropoffAddress],
  ]

  return (
    <div>
      {/* Carte */}
      <div
        ref={cardRef}
        style={{
          width: '400px',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header branding */}
        <div style={{ background: '#1a1918', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Bali Interns" style={{ height: '26px', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <span style={{ color: '#c8a96e', fontWeight: 700, fontSize: '15px' }}>🌴 Bali Interns</span>
          )}
          <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: 'auto' }}>Airport Pickup</span>
        </div>

        {/* Contenu */}
        <div style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {/* Photo */}
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={internName}
              style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #c8a96e', flexShrink: 0 }}
              crossOrigin="anonymous"
            />
          )}

          {/* Infos */}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '17px', color: '#1a1918', marginBottom: '2px', marginTop: 0 }}>{internName}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px', marginTop: 0 }}>Intern — Bali Interns</p>

            {rows.map(([icon, val], i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.4, margin: 0 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer tracking */}
        <div style={{ background: '#fafaf7', padding: '10px 18px', borderTop: '1px solid #f0ede8' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
            Track flight · <strong style={{ color: '#374151' }}>{flightNumber.toUpperCase()}</strong> · flightradar24.com
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={() => void downloadImage()}
          disabled={downloading}
          style={{ flex: 1, padding: '10px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1 }}
        >
          {downloading ? '⏳ Génération image…' : "📥 Télécharger l'image PNG"}
        </button>
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '10px 14px', background: '#f4f3f1', color: '#1a1918', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ✈️ Tracking
        </a>
        {onClose && (
          <button onClick={onClose} style={{ padding: '10px 12px', background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
