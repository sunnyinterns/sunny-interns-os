'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PortalData {
  id: string
  payment_date?: string | null
}

export default function PortalFacturePage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalData> : Promise.reject())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  function openInvoice() {
    if (!data) return
    window.open(`/api/billing/${data.id}/invoice?portal_token=${token}`, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Ma facture</h1>
      </div>

      {loading ? (
        <div style={{ height: '120px', background: '#f3f4f6', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
      ) : !data?.payment_date ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>La facture sera disponible après confirmation du paiement.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🧾</p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1918', marginBottom: '8px' }}>Facture disponible</h2>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            Paiement confirmé le {new Date(data.payment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={openInvoice}
            style={{
              padding: '12px 28px', background: '#1a1918', color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Télécharger ma facture (PDF)
          </button>
          <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '12px' }}>
            La page s'ouvre dans votre navigateur — utilisez Ctrl+P / Cmd+P pour l'enregistrer en PDF.
          </p>
        </div>
      )}
    </div>
  )
}
