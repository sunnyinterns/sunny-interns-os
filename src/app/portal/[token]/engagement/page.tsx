'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SignaturePad } from '@/components/portal/SignaturePad'

interface PortalCase {
  interns?: { first_name?: string; last_name?: string } | null
  companies?: { name?: string } | null
  engagement_letter_signed_at?: string | null
}

export default function EngagementPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [caseData, setCaseData] = useState<PortalCase | null>(null)
  const [signed, setSigned] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedAt, setSignedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalCase> : Promise.reject(r.status))
      .then((d) => {
        setCaseData(d)
        if (d.engagement_letter_signed_at) {
          setSigned(true)
          setSignedAt(new Date(d.engagement_letter_signed_at))
        }
      })
      .catch(() => null)
  }, [token])

  const prenom = caseData?.interns?.first_name ?? ''
  const nom = caseData?.interns?.last_name ?? ''

  async function handleSign(data: string) {
    setSignatureData(data)
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/engagement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true, signature_data: data }),
      })
      if (!res.ok) throw new Error('Erreur lors de la signature')
      const now = new Date()
      setSigned(true)
      setSignedAt(now)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (signed && signedAt) {
    return (
      <div>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '13px', textDecoration: 'none' }}>← Retour</Link>
        <div style={{ marginTop: '24px', background: 'white', border: '1px solid #d1fae5', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', marginBottom: '8px' }}>Lettre d&apos;engagement signée</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Merci. Votre engagement a été enregistré.</p>
        </div>

        {/* Acte de signature */}
        <div style={{ marginTop: '16px', background: '#fafaf9', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>Acte de signature</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#374151' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#9ca3af', minWidth: '100px' }}>Signataire</span>
              <strong>{prenom} {nom}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#9ca3af', minWidth: '100px' }}>Date</span>
              <span>{formatDate(signedAt)}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#9ca3af', minWidth: '100px' }}>Document</span>
              <span>Lettre d&apos;engagement Bali Interns</span>
            </div>
          </div>
          {signatureData && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>Signature :</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureData} alt="signature" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px', background: 'white' }} />
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontWeight: 600, textDecoration: 'none' }}>← Retour au tableau de bord</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '13px', textDecoration: 'none' }}>← Retour</Link>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: '16px 0 4px' }}>Lettre d&apos;engagement</h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Lis attentivement et signe ta lettre d&apos;engagement.</p>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px', fontSize: '14px', lineHeight: 1.7, color: '#374151' }}>
        <p><strong>Lettre d&apos;Engagement Bali Interns</strong></p>
        <p>
          Je soussigné(e), <strong>{prenom} {nom}</strong>, m&apos;engage à :
        </p>
        <ul style={{ paddingLeft: '20px', margin: '12px 0' }}>
          <li>Respecter les règles et valeurs de l&apos;entreprise d&apos;accueil tout au long de mon stage.</li>
          <li>Maintenir un comportement professionnel et respectueux envers mes collègues et responsables.</li>
          <li>Informer Bali Interns de toute difficulté rencontrée dans les plus brefs délais.</li>
          <li>Ne pas annuler mon stage après confirmation du placement, sauf cas de force majeure.</li>
          <li>Respecter les politiques de confidentialité de l&apos;entreprise d&apos;accueil.</li>
        </ul>
        <p>
          Je comprends que le non-respect de ces engagements peut entraîner la résiliation du contrat de stage
          et pourrait avoir des conséquences sur ma prise en charge par Bali Interns.
        </p>
        <p style={{ marginBottom: 0 }}>
          En signant ci-dessous, je confirme avoir lu, compris et accepté les termes de cette lettre d&apos;engagement.
        </p>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
      {submitting ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Enregistrement de la signature…</div>
      ) : (
        <SignaturePad
          onSign={(data) => { void handleSign(data) }}
          label={`Signature de ${prenom} ${nom}`}
          disabled={submitting}
        />
      )}
    </div>
  )
}
