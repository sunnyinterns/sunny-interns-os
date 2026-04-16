'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PortalData {
  id: string
  payment_date?: string | null
  payment_amount?: number | null
  discount_percentage?: number | null
  payment_notified_by_intern_at?: string | null
}

export default function PortalFacturePage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [note, setNote] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalData> : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => {
        setData(d)
        if (d.payment_notified_by_intern_at) setNotified(true)
      })
      .catch((err: unknown) => {
        console.error('[PORTAL_FACTURE]', err instanceof Error ? err.message : String(err))
        setFetchError(true)
      })
      .finally(() => setLoading(false))
  }, [token])

  function openInvoice() {
    if (!data) return
    window.open(`/api/billing/${data.id}/invoice?portal_token=${token}`, '_blank')
  }

  async function handleNotifyPayment() {
    setNotifying(true)
    try {
      const res = await fetch(`/api/portal/${token}/notify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      if (res.ok) setNotified(true)
    } finally {
      setNotifying(false)
    }
  }

  const discountedAmount = data?.payment_amount && data?.discount_percentage
    ? Math.round(data.payment_amount * (1 - data.discount_percentage / 100))
    : data?.payment_amount

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Ma facture</h1>
      </div>

      {loading ? (
        <div style={{ height: '120px', background: '#f3f4f6', borderRadius: '16px' }} />
      ) : fetchError ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', background: '#fef2f2', borderRadius: '16px', border: '1px solid #fecaca' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</p>
          <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: 600 }}>Impossible de charger les données.</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>Réessaie dans quelques instants ou contacte notre équipe.</p>
          <button
            onClick={() => { setFetchError(false); setLoading(true); window.location.reload() }}
            style={{ marginTop: '16px', padding: '10px 20px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      ) : data?.payment_date ? (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>🧾</p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1918', marginBottom: '8px' }}>Facture disponible</h2>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
            Paiement confirmé le {new Date(data.payment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={openInvoice}
            style={{ padding: '12px 28px', background: '#1a1918', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Télécharger ma facture (PDF)
          </button>
          <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '12px' }}>
            La page s&apos;ouvre dans votre navigateur — utilisez Ctrl+P / Cmd+P pour l&apos;enregistrer en PDF.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Montant */}
          {discountedAmount && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Montant à régler</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: '#1a1918' }}>{discountedAmount}€</span>
                {data?.discount_percentage && data.discount_percentage > 0 && data.payment_amount && (
                  <span style={{ fontSize: '14px', color: '#9ca3af', textDecoration: 'line-through' }}>{data.payment_amount}€</span>
                )}
              </div>
              {data?.discount_percentage && data.discount_percentage > 0 && (
                <span style={{ display: 'inline-block', marginTop: '6px', background: '#d1fae5', color: '#059669', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>
                  -{data.discount_percentage}% appliqué
                </span>
              )}
            </div>
          )}

          {/* Bouton J'ai payé */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
            {notified ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>📨</p>
                <p style={{ fontWeight: 600, color: '#059669', marginBottom: '4px' }}>Nous avons été notifiés !</p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Votre paiement sera validé sous 24-48h.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
                  Tu as effectué ton virement ? Notifie-nous pour accélérer la validation.
                </p>
                {!showNoteInput ? (
                  <button
                    onClick={() => setShowNoteInput(true)}
                    style={{ width: '100%', padding: '14px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    💰 J&apos;ai effectué mon paiement
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                        Référence de virement ou note (optionnel)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ex: virement du 15/04, référence SUNXX..."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'vertical', minHeight: '72px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setShowNoteInput(false)}
                        style={{ padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => { void handleNotifyPayment() }}
                        disabled={notifying}
                        style={{ flex: 1, padding: '10px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: notifying ? 'not-allowed' : 'pointer', opacity: notifying ? 0.7 : 1 }}
                      >
                        {notifying ? 'Envoi…' : 'Confirmer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!discountedAmount && (
            <div style={{ padding: '32px 24px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>La facture sera disponible après confirmation du paiement.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
