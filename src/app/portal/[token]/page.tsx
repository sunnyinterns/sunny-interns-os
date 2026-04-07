'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const STATUS_TO_STEP: Record<string, number> = {
  lead: 1,
  rdv_booked: 2,
  qualification_done: 2,
  job_submitted: 3,
  job_retained: 3,
  convention_signed: 3,
  payment_pending: 4,
  payment_received: 4,
  visa_docs_sent: 5,
  visa_submitted: 5,
  visa_received: 6,
  arrival_prep: 7,
  active: 8,
  alumni: 8,
}

const STEPS = [
  'Candidature',
  'Entretien',
  'Stage trouvé',
  'Paiement',
  'Docs visa',
  'Visa en cours',
  'Prépa départ',
  'Stage en cours',
]

interface PortalCase {
  id: string
  status: string
  portal_token: string
  billet_avion?: boolean
  papiers_visas?: boolean
  engagement_letter_sent?: boolean
  interns?: {
    first_name?: string
    last_name?: string
    email?: string
    passport_page4_url?: string
    photo_id_url?: string
    bank_statement_url?: string
    return_plane_ticket_url?: string
  } | null
}

export default function PortalPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalCase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalCase> : Promise.reject(r.status))
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '48px' }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '48px' }}>Lien invalide ou expiré.</p>

  const prenom = data.interns?.first_name ?? ''
  const currentStep = STATUS_TO_STEP[data.status] ?? 1

  const actions: { label: string; href: string; done: boolean }[] = [
    { label: 'Billet avion', href: `/portal/${token}/billet`, done: !!data.billet_avion },
    { label: 'Lettre d\'engagement', href: `/portal/${token}/engagement`, done: !!data.engagement_letter_sent },
    { label: 'Logement & scooter', href: `/portal/${token}/logement`, done: false },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1918', marginBottom: '4px' }}>
        Bonjour {prenom} ! 👋
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>
        Voici l&apos;état de ton dossier Bali Interns.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
                background: i + 1 <= currentStep ? '#c8a96e' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600,
                color: i + 1 <= currentStep ? 'white' : '#9ca3af',
              }}>
                {i + 1 <= currentStep ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '9px', color: i + 1 <= currentStep ? '#c8a96e' : '#9ca3af', lineHeight: 1.2, display: 'block' }}>
                {s}
              </span>
            </div>
          ))}
        </div>
        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(currentStep / 8) * 100}%`, background: '#c8a96e', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Actions requises */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1918', marginBottom: '12px' }}>Actions requises</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {actions.map((a) => (
          <Link key={a.href} href={a.href} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'white', borderRadius: '10px',
            border: `1.5px solid ${a.done ? '#0d9e75' : '#e5e7eb'}`,
            textDecoration: 'none', color: '#1a1918',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{a.label}</span>
            <span style={{ fontSize: '13px', color: a.done ? '#0d9e75' : '#c8a96e', fontWeight: 600 }}>
              {a.done ? '✓ Fait' : 'À compléter →'}
            </span>
          </Link>
        ))}
      </div>

      <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
