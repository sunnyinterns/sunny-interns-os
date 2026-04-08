'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const STATUS_TO_STEP: Record<string, number> = {
  lead: 1,
  rdv_booked: 2,
  qualification_done: 2,
  job_submitted: 3,
  job_retained: 4,
  convention_signed: 4,
  payment_pending: 5,
  payment_received: 5,
  visa_docs_sent: 6,
  visa_submitted: 6,
  visa_received: 7,
  arrival_prep: 7,
  active: 8,
  alumni: 8,
}

const STEPS = [
  { num: 1, label: 'Candidature reçue' },
  { num: 2, label: 'Entretien qualif.' },
  { num: 3, label: 'Recherche stage' },
  { num: 4, label: 'Stage trouvé !' },
  { num: 5, label: 'Paiement' },
  { num: 6, label: 'Dossier visa' },
  { num: 7, label: 'Prépa départ' },
  { num: 8, label: 'En stage à Bali !' },
]

interface PortalData {
  id: string
  status: string
  portal_token: string
  actual_start_date?: string | null
  actual_end_date?: string | null
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  engagement_letter_sent?: boolean | null
  cv_revision_requested?: boolean | null
  housing_reserved?: boolean | null
  interns?: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    passport_page4_url?: string | null
    photo_id_url?: string | null
    bank_statement_url?: string | null
    return_plane_ticket_url?: string | null
    cv_url?: string | null
  } | null
  job_submissions?: Array<{
    id: string
    status: string
    jobs?: { public_title?: string | null; title?: string | null } | null
  }> | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthsDiff(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.5))
}

export default function PortalPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then(r => r.ok ? r.json() as Promise<PortalData> : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) {
    return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '48px' }}>Chargement…</p>
  }
  if (!data) {
    return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '48px' }}>Lien invalide ou expiré.</p>
  }

  const prenom = data.interns?.first_name ?? 'Stagiaire'
  const currentStep = STATUS_TO_STEP[data.status] ?? 1

  // Actions pendantes
  const actions: { label: string; href: string; done: boolean; urgent?: boolean }[] = [
    { label: 'Billet d\'avion', href: `/portal/${token}/billet`, done: !!data.billet_avion },
    { label: 'Lettre d\'engagement', href: `/portal/${token}/engagement`, done: !!data.engagement_letter_sent },
    { label: 'Logement & scooter', href: `/portal/${token}/logement`, done: !!data.housing_reserved },
    ...(data.cv_revision_requested ? [{ label: 'Nouvelle version de CV demandée', href: `/portal/${token}/cv`, done: false, urgent: true }] : []),
    ...(currentStep >= 5 && !(data.interns?.passport_page4_url && data.interns?.photo_id_url && data.interns?.bank_statement_url && data.interns?.return_plane_ticket_url)
      ? [{ label: 'Documents visa à compléter', href: `/portal/${token}/visa`, done: !!data.papiers_visas }]
      : []),
  ]

  const pendingActions = actions.filter(a => !a.done)
  const doneActions = actions.filter(a => a.done)

  // Job retenu
  const retainedSub = (data.job_submissions ?? []).find(s => s.status === 'retained')

  // Doc pastilles
  const docs = [
    { label: 'Billet', done: !!data.billet_avion },
    { label: 'Docs visa', done: !!data.papiers_visas },
    { label: 'Logement', done: !!data.housing_reserved },
    { label: 'Convention', done: !!data.engagement_letter_sent },
  ]

  return (
    <div>
      {/* Greeting */}
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1918', marginBottom: '4px' }}>
        Bonjour {prenom} ! 🌴
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
        Voici l&apos;état de ton dossier Bali Interns.
      </p>

      {/* Status badge */}
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
        fontWeight: 600, marginBottom: '28px',
        background: currentStep >= 8 ? '#d1fae5' : currentStep >= 5 ? '#fef3c7' : '#ede9e3',
        color: currentStep >= 8 ? '#065f46' : currentStep >= 5 ? '#92400e' : '#1a1918',
      }}>
        {STEPS[currentStep - 1]?.label ?? 'En cours'}
      </span>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '2px' }}>
          {STEPS.map((s) => {
            const done = s.num <= currentStep
            const active = s.num === currentStep
            return (
              <div key={s.num} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 4px',
                  background: done ? '#c8a96e' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  color: done ? 'white' : '#9ca3af',
                  boxShadow: active ? '0 0 0 3px rgba(200,169,110,0.3)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {done && s.num < currentStep ? '✓' : s.num}
                </div>
                <span style={{
                  fontSize: '9px', lineHeight: 1.2, display: 'block',
                  color: done ? '#c8a96e' : '#9ca3af',
                  fontWeight: active ? 700 : 400,
                }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((currentStep - 1) / 7) * 100}%`,
            background: 'linear-gradient(90deg, #c8a96e, #d4b87a)',
            transition: 'width 0.6s ease',
            borderRadius: '3px',
          }} />
        </div>
      </div>

      {/* Actions requises */}
      {pendingActions.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '10px' }}>Actions requises</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingActions.map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'white', borderRadius: '12px',
                border: `1.5px solid ${a.urgent ? '#d97706' : '#e5e7eb'}`,
                textDecoration: 'none', color: '#1a1918',
              }}>
                <div>
                  {a.urgent && (
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#d97706', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      URGENT
                    </span>
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{a.label}</span>
                </div>
                <span style={{ fontSize: '13px', color: a.urgent ? '#d97706' : '#c8a96e', fontWeight: 600 }}>
                  {a.urgent ? '⚠ Compléter →' : 'À compléter →'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions faites */}
      {doneActions.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '10px' }}>Complété</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {doneActions.map(a => (
              <div key={a.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px',
                border: '1px solid #bbf7d0',
              }}>
                <span style={{ fontSize: '14px', color: '#374151' }}>{a.label}</span>
                <span style={{ fontSize: '13px', color: '#0d9e75', fontWeight: 600 }}>✓ Fait</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ton stage */}
      {retainedSub && currentStep >= 4 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '12px' }}>🎉 Ton stage</h2>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#c8a96e', marginBottom: '6px' }}>
            {retainedSub.jobs?.public_title ?? retainedSub.jobs?.title ?? 'Stage trouvé !'}
          </p>
          {data.actual_start_date && data.actual_end_date && (
            <>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                Du {formatDate(data.actual_start_date)} au {formatDate(data.actual_end_date)}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                Durée : {monthsDiff(data.actual_start_date, data.actual_end_date)} mois
              </p>
            </>
          )}
        </div>
      )}

      {/* Mes documents */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '12px' }}>Mes documents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {docs.map(d => (
            <div key={d.label} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', borderRadius: '8px',
              background: d.done ? '#f0fdf4' : '#fafaf7',
              border: `1px solid ${d.done ? '#bbf7d0' : '#e5e7eb'}`,
            }}>
              <span style={{ fontSize: '16px' }}>{d.done ? '✅' : '❌'}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: d.done ? '#065f46' : '#6b7280' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Carte stagiaire */}
      {data.status === 'active' && (
        <div style={{ background: 'linear-gradient(135deg, #111110, #2a2927)', border: 'none', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
          <p style={{ color: '#c8a96e', fontWeight: 700, marginBottom: '6px', fontSize: '15px' }}>🪪 Ta carte Bali Interns</p>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>Affiche ta carte digitale pour te présenter en stage.</p>
          <Link href={`/portal/${token}/carte`} style={{
            display: 'inline-block', padding: '8px 16px', background: '#c8a96e', color: 'white',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}>
            Voir ma carte →
          </Link>
        </div>
      )}

      {/* Contact */}
      <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
        Une question ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
