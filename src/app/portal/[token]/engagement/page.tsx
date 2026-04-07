'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PortalCase {
  interns?: { first_name?: string; last_name?: string } | null
  companies?: { name?: string } | null
}

export default function EngagementPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [caseData, setCaseData] = useState<PortalCase | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalCase> : Promise.reject(r.status))
      .then(setCaseData)
      .catch(() => null)
  }, [token])

  const prenom = caseData?.interns?.first_name ?? ''
  const nom = caseData?.interns?.last_name ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Tu dois cocher la case pour confirmer.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/engagement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true }),
      })
      if (!res.ok) throw new Error('Erreur lors de la signature')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', marginBottom: '8px' }}>Lettre signée !</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Merci. Nous traitons ton dossier dans les meilleurs délais.</p>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontWeight: 600, textDecoration: 'none' }}>← Retour au tableau de bord</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '13px', textDecoration: 'none' }}>← Retour</Link>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: '16px 0 4px' }}>Lettre d&apos;engagement</h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Lis attentivement et confirme ton engagement.</p>

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
          En cochant la case ci-dessous, je confirme avoir lu, compris et accepté les termes de cette lettre d&apos;engagement.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>
            Je, <strong>{prenom} {nom}</strong>, confirme avoir lu et j&apos;accepte les termes de la lettre d&apos;engagement Bali Interns.
          </span>
        </label>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        <button type="submit" disabled={loading || !agreed} style={{ width: '100%', padding: '12px', background: '#c8a96e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: loading || !agreed ? 'not-allowed' : 'pointer', opacity: loading || !agreed ? 0.6 : 1 }}>
          {loading ? 'Signature…' : 'Signer la lettre d\'engagement'}
        </button>
      </form>
    </div>
  )
}
