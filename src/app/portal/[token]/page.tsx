'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const STATUS_TO_STEP: Record<string, number> = {
  lead: 1, rdv_booked: 2, qualification_done: 2,
  job_submitted: 3, job_retained: 4, convention_signed: 4,
  payment_pending: 5, payment_received: 5,
  visa_docs_sent: 6, visa_submitted: 6,
  visa_received: 7, arrival_prep: 7,
  active: 8, alumni: 8,
}

const STEPS = [
  { num: 1, label: 'Candidature' },
  { num: 2, label: 'Entretien' },
  { num: 3, label: 'Recherche' },
  { num: 4, label: 'Stage trouvé' },
  { num: 5, label: 'Paiement' },
  { num: 6, label: 'Visa' },
  { num: 7, label: 'Départ' },
  { num: 8, label: 'À Bali !' },
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
  assigned_manager_name?: string | null
  flight_number?: string | null
  flight_departure_city?: string | null
  flight_arrival_time_local?: string | null
  flight_last_stopover?: string | null
  desired_start_date?: string | null
  visa_submitted_to_agent_at?: string | null
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

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
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

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 48 }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: 48 }}>Lien invalide ou expiré.</p>

  const prenom = data.interns?.first_name ?? 'Stagiaire'
  const currentStep = STATUS_TO_STEP[data.status] ?? 1
  const retainedSub = (data.job_submissions ?? []).find(s => s.status === 'retained')

  // Pending actions
  const actions: { label: string; href: string; done: boolean; urgent?: boolean }[] = []

  if (currentStep >= 5) {
    actions.push({ label: 'Documents visa', href: `/portal/${token}/visa`, done: !!data.papiers_visas, urgent: currentStep >= 5 && !data.papiers_visas })
  }
  actions.push({ label: 'Billet d\'avion', href: `/portal/${token}/billet`, done: !!data.billet_avion })
  actions.push({ label: 'Lettre d\'engagement', href: `/portal/${token}/engagement`, done: !!data.engagement_letter_sent })
  actions.push({ label: 'Logement & scooter', href: `/portal/${token}/logement`, done: !!data.housing_reserved })
  if (data.cv_revision_requested) {
    actions.push({ label: 'Nouvelle version de CV demandée', href: `/portal/${token}/cv`, done: false, urgent: true })
  }

  const pendingActions = actions.filter(a => !a.done)
  const doneActions = actions.filter(a => a.done)

  const docs = [
    { label: 'Billet', done: !!data.billet_avion },
    { label: 'Docs visa', done: !!data.papiers_visas },
    { label: 'Logement', done: !!data.housing_reserved },
    { label: 'Convention', done: !!data.engagement_letter_sent },
  ]

  return (
    <div>
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1918', marginBottom: 4 }}>
        Bonjour {prenom} !
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12,
          fontWeight: 600,
          background: currentStep >= 8 ? '#d1fae5' : currentStep >= 5 ? '#fef3c7' : '#ede9e3',
          color: currentStep >= 8 ? '#065f46' : currentStep >= 5 ? '#92400e' : '#1a1918',
        }}>
          {STEPS[currentStep - 1]?.label ?? 'En cours'}
        </span>
        {data.assigned_manager_name && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Manager : {data.assigned_manager_name}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 2 }}>
          {STEPS.map((s) => {
            const done = s.num <= currentStep
            const active = s.num === currentStep
            return (
              <div key={s.num} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  background: done ? '#c8a96e' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: done ? 'white' : '#9ca3af',
                  boxShadow: active ? '0 0 0 3px rgba(200,169,110,0.3)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {done && s.num < currentStep ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 9, lineHeight: 1.2, display: 'block', color: done ? '#c8a96e' : '#9ca3af', fontWeight: active ? 700 : 400 }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentStep - 1) / 7) * 100}%`, background: 'linear-gradient(90deg, #c8a96e, #d4b87a)', transition: 'width 0.6s ease', borderRadius: 3 }} />
        </div>
      </div>

      {/* Actions requises */}
      {pendingActions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 10 }}>Actions requises</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingActions.map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'white', borderRadius: 12,
                border: `1.5px solid ${a.urgent ? '#d97706' : '#e5e7eb'}`,
                textDecoration: 'none', color: '#1a1918',
              }}>
                <div>
                  {a.urgent && (
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#d97706', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      URGENT
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{a.label}</span>
                </div>
                <span style={{ fontSize: 13, color: a.urgent ? '#d97706' : '#c8a96e', fontWeight: 600 }}>
                  Compléter →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions faites */}
      {doneActions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 10 }}>Complété</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {doneActions.map(a => (
              <div key={a.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{a.label}</span>
                <span style={{ fontSize: 13, color: '#0d9e75', fontWeight: 600 }}>✓ Fait</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ton stage */}
      {retainedSub && currentStep >= 4 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Ton stage</h2>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#c8a96e', marginBottom: 6 }}>
            {retainedSub.jobs?.public_title ?? retainedSub.jobs?.title ?? 'Stage trouvé !'}
          </p>
          {data.actual_start_date && data.actual_end_date && (
            <>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Du {formatDate(data.actual_start_date)} au {formatDate(data.actual_end_date)}</p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Durée : {monthsDiff(data.actual_start_date, data.actual_end_date)} mois</p>
            </>
          )}
        </div>
      )}

      {/* Documents */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Mes documents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {docs.map(d => (
            <div key={d.label} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
              background: d.done ? '#f0fdf4' : '#fafaf7', border: `1px solid ${d.done ? '#bbf7d0' : '#e5e7eb'}`,
            }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{d.done ? '✅' : '❌'}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: d.done ? '#065f46' : '#6b7280' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Carte stagiaire */}
      {data.status === 'active' && (
        <div style={{ background: 'linear-gradient(135deg, #111110, #2a2927)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#c8a96e', fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Ta carte Sunny Interns</p>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>Affiche ta carte digitale pour te présenter en stage.</p>
          <Link href={`/portal/${token}/carte`} style={{ display: 'inline-block', padding: '8px 16px', background: '#c8a96e', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Voir ma carte →
          </Link>
        </div>
      )}

      {/* Parrainage */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 6 }}>Programme parrainage</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Gagne 100€ pour chaque ami placé à Bali !</p>
        <Link href={`/portal/${token}/affiliation`} style={{ display: 'inline-block', padding: '8px 16px', background: '#c8a96e', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Voir mon code →
        </Link>
      </div>

      {/* Flight info */}
      {currentStep >= 7 && data.flight_number && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Infos vol</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>N° de vol</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>{data.flight_number}</span>
            </div>
            {data.flight_departure_city && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Départ</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>{data.flight_departure_city}</span>
              </div>
            )}
            {data.flight_last_stopover && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Escale</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>{data.flight_last_stopover}</span>
              </div>
            )}
            {data.flight_arrival_time_local && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Arrivée Bali</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>{data.flight_arrival_time_local}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href={`https://www.flightradar24.com/${data.flight_number}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '8px 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>
                FlightRadar24
              </a>
              <a href={`https://www.flightaware.com/live/flight/${data.flight_number}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '8px 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>
                FlightAware
              </a>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp */}
      <div style={{ background: 'linear-gradient(135deg, #075e54, #128c7e)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Besoin d&apos;aide ?</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 }}>Notre equipe est disponible sur WhatsApp.</p>
        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'white', color: '#075e54', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          WhatsApp Sunny Interns
        </a>
      </div>

      {/* Contact */}
      <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
