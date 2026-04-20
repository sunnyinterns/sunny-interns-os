'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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

const PORTAL_STEPS = [
  { key: 'apply', label: 'Candidature', icon: '📋', statuses: ['lead', 'rdv_booked'] },
  { key: 'interview', label: 'Entretien', icon: '🎤', statuses: ['rdv_booked', 'qualification_done'] },
  { key: 'jobs', label: 'Offres de stage', icon: '💼', statuses: ['job_submitted', 'job_retained'] },
  { key: 'convention', label: 'Convention', icon: '📝', statuses: ['convention_signed', 'payment_pending', 'payment_received'] },
  { key: 'visa', label: 'Visa', icon: '🛂', statuses: ['visa_docs_sent', 'visa_in_progress', 'visa_received'] },
  { key: 'bali', label: 'Départ Bali', icon: '🌴', statuses: ['arrival_prep', 'active', 'alumni'] },
]

interface PortalData {
  id: string
  status: string
  portal_token: string
  qualification_notes_for_intern?: string | null
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
  desired_duration_months?: number | null
  visa_submitted_to_agent_at?: string | null
  payment_amount?: number | null
  billing_companies?: {
    name: string | null
    legal_form: string | null
    currency: string | null
    bank_iban: string | null
    bank_bic: string | null
    bank_name: string | null
    stripe_link: string | null
  } | null
  invoice_number?: string | null
  discount_percentage?: number | null
  intern_first_meeting_date?: string | null
  intern_first_meeting_link?: string | null
  intern_first_meeting_reschedule_link?: string | null
  interns?: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    whatsapp?: string | null
    passport_page4_url?: string | null
    photo_id_url?: string | null
    bank_statement_url?: string | null
    return_plane_ticket_url?: string | null
    cv_url?: string | null
    desired_sectors?: string[] | null
  } | null
  job_submissions?: Array<{
    id: string
    status: string
    intern_priority?: number | null
    intern_comment?: string | null
    intern_interested?: boolean | null
    jobs?: {
      public_title?: string | null
      title?: string | null
      department?: string | null
      companies?: {
        id?: string | null
        name?: string | null
        website?: string | null
        registration_number?: string | null
        address?: string | null
      } | null
    } | null
  }> | null
}

interface PortalPartner {
  id: string
  name: string
  logo_url: string | null
  partner_category: string | null
  partner_deal: string | null
  partner_timing: string | null
  partner_visible_from: string | null
  website: string | null
}

interface PortalJobItem {
  submission_id: string
  job_id: string
  title: string
  sector: string | null
  public_description: string | null
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  seo_slug: string | null
  intern_interested: boolean | null
  status: string
}

const PAYMENT_STATUSES = new Set(['payment_pending', 'convention_signed', 'job_retained'])
const PAYMENT_INFO_FALLBACK = {
  company: 'SIDLYS INTERNATIONAL LLC',
  iban: 'GB76REVO00996903517949',
  bic: 'REVOGB21',
  bank: 'Revolut Ltd',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthsDiff(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.5))
}

function CVUploadSection({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/portal/${token}/upload-cv`, { method: 'POST', body: fd })
      if (res.ok) setDone(true)
    } catch { /* ignore */ }
    finally { setUploading(false) }
  }

  return (
    <div style={{ background: '#fef9ee', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 4 }}>
        Mise à jour CV demandée
      </h2>
      <p style={{ fontSize: 12, color: '#92400e', marginBottom: 12 }}>
        Notre équipe a besoin d&apos;une nouvelle version de ton CV.
      </p>
      {done ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: 14 }}>✅</span>
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>CV envoyé avec succès !</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 13 }}
          />
          <button
            onClick={() => void handleUpload()}
            disabled={!file || uploading}
            style={{
              padding: '10px 16px', background: file && !uploading ? '#c8a96e' : '#d1d5db',
              color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: file && !uploading ? 'pointer' : 'not-allowed',
            }}>
            {uploading ? 'Envoi en cours…' : 'Envoyer mon CV'}
          </button>
        </div>
      )}
    </div>
  )
}

function JobCommentCard({ sub, token }: { sub: PortalJobItem; token: string }) {
  const [comment, setComment] = useState('')
  const [interested, setInterested] = useState<boolean | null>(sub.intern_interested)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function sendComment() {
    if (!comment.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/${token}/jobs/${sub.submission_id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      if (res.ok) { setSaved(true); setComment('') }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function sendInterest(value: boolean) {
    setInterested(value)
    try {
      await fetch(`/api/portal/${token}/jobs/${sub.submission_id}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interested: value }),
      })
    } catch { /* ignore */ }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    proposed: { label: 'En cours de traitement', color: '#d97706' },
    cv_pending: { label: 'CV en attente', color: '#d97706' },
    cv_validated: { label: 'Profil validé', color: '#2563eb' },
    sent: { label: 'Candidature envoyée', color: '#1d4ed8' },
    interview: { label: 'Entretien employeur', color: '#7c3aed' },
    retained: { label: 'Stage retenu !', color: '#059669' },
    rejected: { label: 'Non retenu', color: '#dc2626' },
    cancelled: { label: 'Annulé', color: '#9ca3af' },
  }
  const st = statusMap[sub.status] ?? statusMap.proposed

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', margin: 0 }}>{sub.title}</p>
        {sub.sector && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{sub.sector}</p>}
        <p style={{ fontSize: 12, fontWeight: 500, color: st.color, margin: '4px 0 0' }}>{st.label}</p>
      </div>

      {sub.public_description && (
        <p style={{ fontSize: 13, color: '#374151', margin: '8px 0', lineHeight: 1.5 }}>{sub.public_description}</p>
      )}

      {/* Hook accroche */}
      {sub.public_hook && !sub.public_description && (
        <p style={{ fontSize: 13, color: '#c8a96e', fontStyle: 'italic', margin: '8px 0' }}>&ldquo;{sub.public_hook}&rdquo;</p>
      )}

      {/* Ambiance */}
      {sub.public_vibe && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0', lineHeight: 1.4 }}>🌴 {sub.public_vibe}</p>
      )}

      {/* Avantages */}
      {sub.public_perks && sub.public_perks.filter(Boolean).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
          {sub.public_perks.filter(Boolean).map((p: string, i: number) => (
            <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>✨ {p}</span>
          ))}
        </div>
      )}

      {/* Lien page publique */}
      {sub.seo_slug && (
        <a href={`/jobs/${sub.seo_slug}`} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-block', fontSize: 11, color: '#c8a96e', textDecoration: 'none', margin: '4px 0 8px' }}>
          🔗 Voir la fiche complète ↗
        </a>
      )}

      {/* Interest buttons */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <button
          onClick={() => void sendInterest(true)}
          style={{
            flex: 1, padding: '10px', border: `2px solid ${interested === true ? '#0d9e75' : '#e5e7eb'}`,
            borderRadius: 10, background: interested === true ? '#f0fdf4' : 'white',
            color: interested === true ? '#0d9e75' : '#6b7280', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {interested === true ? '✅ Intéressé' : 'Ce job m\'intéresse'}
        </button>
        <button
          onClick={() => void sendInterest(false)}
          style={{
            flex: 1, padding: '10px', border: `2px solid ${interested === false ? '#dc2626' : '#e5e7eb'}`,
            borderRadius: 10, background: interested === false ? '#fef2f2' : 'white',
            color: interested === false ? '#dc2626' : '#6b7280', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {interested === false ? '❌ Pas intéressé' : 'Pas intéressé'}
        </button>
      </div>

      {/* Comment zone */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Que penses-tu de cette offre ?</p>
        {saved ? (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>Commentaire envoyé !</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Ex: J'adore ce poste, le secteur correspond bien a mes etudes..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb',
                borderRadius: 8, resize: 'none', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => void sendComment()}
              disabled={saving || !comment.trim()}
              style={{
                alignSelf: 'flex-end', padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: comment.trim() && !saving ? '#c8a96e' : '#d1d5db', color: 'white',
                border: 'none', borderRadius: 8, cursor: comment.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PartnerCard({ partner }: { partner: PortalPartner }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {partner.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: '#9ca3af' }}>{partner.name[0]}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1918', margin: 0 }}>{partner.name}</p>
          {partner.partner_category && (
            <span style={{ fontSize: 10, background: '#f4f4f5', color: '#6b7280', padding: '1px 6px', borderRadius: 10 }}>{partner.partner_category}</span>
          )}
        </div>
        {partner.partner_deal && (
          <p style={{ fontSize: 12, color: '#4b5563', marginTop: 2, margin: 0 }}>{partner.partner_deal}</p>
        )}
      </div>
      {partner.website && (
        <a href={partner.website} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, padding: '6px 12px', background: '#c8a96e', color: 'white', borderRadius: 8, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          Voir →
        </a>
      )}
    </div>
  )
}

export default function PortalPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [portalJobs, setPortalJobs] = useState<PortalJobItem[]>([])
  const [partners, setPartners] = useState<PortalPartner[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    if (!token) return
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.ok ? r.json() as Promise<PortalData> : null),
      fetch(`/api/portal/${token}/jobs`).then(r => r.ok ? r.json() as Promise<PortalJobItem[]> : []),
    ]).then(([portalData, jobs]) => {
      setData(portalData)
      setPortalJobs(jobs ?? [])
      setLoading(false)
      if (portalData?.status) {
        fetch(`/api/portal/partners?status=${portalData.status}`)
          .then(r => r.ok ? r.json() as Promise<PortalPartner[]> : [])
          .then(p => setPartners(p ?? []))
          .catch(() => null)
      }
    }).catch(() => setLoading(false))
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 48 }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: 48 }}>Lien invalide ou expiré.</p>

  const prenom = data.interns?.first_name ?? 'Stagiaire'
  const currentStep = STATUS_TO_STEP[data.status] ?? 1
  const retainedSub = (data.job_submissions ?? []).find(s => s.status === 'retained')
  const retainedCompany = retainedSub?.jobs?.companies ?? null
  const showPayment = PAYMENT_STATUSES.has(data.status)
  const paymentAmount = data.payment_amount ?? 990
  const paymentTotal = data.discount_percentage && data.discount_percentage > 0
    ? paymentAmount * (1 - data.discount_percentage / 100)
    : paymentAmount
  const isPaid = ['payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_received', 'arrival_prep', 'active', 'alumni'].includes(data.status)

  // Determine which portal step is current
  const allStepStatuses = PORTAL_STEPS.flatMap(s => s.statuses)
  const currentStepIdx = PORTAL_STEPS.findIndex(s => s.statuses.includes(data.status))
  const qualificationDone = currentStep >= 2 && data.status !== 'lead' && data.status !== 'rdv_booked'

  // Actions requises urgentes (useMemo)
  const requiredActions = useMemo(() => {
    if (!data) return []
    const acts: { href: string; icon: string; label: string }[] = []
    if (!data.engagement_letter_sent) {
      acts.push({ href: `/portal/${token}/engagement`, icon: '📄', label: "Signer la lettre d'engagement" })
    }
    if (['convention_signed', 'payment_pending'].includes(data.status) && !data.payment_amount) {
      acts.push({ href: `/portal/${token}/facture`, icon: '💳', label: 'Voir la facture et notifier le paiement' })
    }
    if (['payment_received', 'visa_in_progress', 'visa_docs_sent'].includes(data.status) && !data.interns?.photo_id_url) {
      acts.push({ href: `/portal/${token}/visa`, icon: '🛂', label: 'Uploader vos documents visa' })
    }
    if (['payment_received', 'visa_in_progress', 'visa_docs_sent'].includes(data.status) && !data.flight_number) {
      acts.push({ href: `/portal/${token}/billet`, icon: '✈️', label: 'Renseigner votre billet d\'avion' })
    }
    return acts
  }, [data, token])

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

      {/* Chronologie portal steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {PORTAL_STEPS.map((step, i) => {
          const isReached = currentStepIdx >= i
          const isCurrent = currentStepIdx === i
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                opacity: isReached ? 1 : 0.3, flexShrink: 0,
              }}>
                <span style={{
                  fontSize: 22,
                  filter: isReached ? 'none' : 'grayscale(100%)',
                }}>{step.icon}</span>
                <span style={{
                  fontSize: 9, color: isCurrent ? '#c8a96e' : '#6b7280',
                  fontWeight: isCurrent ? 700 : 400,
                  textAlign: 'center', maxWidth: 60, lineHeight: 1.2,
                }}>{step.label}</span>
              </div>
              {i < PORTAL_STEPS.length - 1 && (
                <div style={{
                  width: 20, height: 2, flexShrink: 0, marginTop: -8,
                  background: currentStepIdx > i ? '#c8a96e' : '#e5e7eb',
                }} />
              )}
            </div>
          )
        })}
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

      {/* ── ACTIONS REQUISES URGENTES ── */}
      {requiredActions.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>⚡ Action requise</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requiredActions.map(action => (
              <Link key={action.href} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#78350f' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{action.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{action.label}</span>
                <span style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes de qualification */}
      {qualificationDone && data.qualification_notes_for_intern && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#15803d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Compte-rendu de ton entretien
          </h2>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {data.qualification_notes_for_intern}
          </p>
        </div>
      )}

      {/* Status < qualification_done: message d'attente */}
      {!qualificationDone && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 18, margin: '0 0 8px' }}>⏳</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d4ed8', margin: '0 0 4px' }}>
            Ton dossier est en cours d&apos;évaluation
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Notre équipe examine ta candidature. Tu seras notifié dès que ton entretien sera validé.
          </p>
        </div>
      )}

      {/* Ton RDV */}
      {data.intern_first_meeting_date && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Ton entretien</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Date et heure</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>
                {new Date(data.intern_first_meeting_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' '}
                {new Date(data.intern_first_meeting_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WITA
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {data.intern_first_meeting_link && (
                <a href={data.intern_first_meeting_link} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: '#1a73e8', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Rejoindre Google Meet
                </a>
              )}
              {data.intern_first_meeting_reschedule_link && (
                <a href={data.intern_first_meeting_reschedule_link} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: '10px 16px', background: '#f3f4f6', color: '#6b7280', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  Reprogrammer
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload CV demandé */}
      {data.cv_revision_requested && (
        <CVUploadSection token={token} />
      )}

      {/* JOBS PROPOSÉS — avec commentaire + intérêt */}
      {qualificationDone && portalJobs.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1918', marginBottom: 4 }}>Offres de stage proposées</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Indique ton intérêt et laisse un commentaire pour chaque offre.
          </p>
          {portalJobs.map(sub => (
            <JobCommentCard key={sub.submission_id} sub={sub} token={token} />
          ))}
        </section>
      )}

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
          {retainedCompany?.name && (
            <p style={{ fontSize: 13, color: '#1a1918', fontWeight: 600 }}>{retainedCompany.name}</p>
          )}
          {data.actual_start_date && data.actual_end_date && (
            <>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Du {formatDate(data.actual_start_date)} au {formatDate(data.actual_end_date)}</p>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Durée : {monthsDiff(data.actual_start_date, data.actual_end_date)} mois</p>
            </>
          )}
        </div>
      )}

      {/* Infos entreprise pour convention */}
      {retainedCompany && (data.status === 'job_retained' || data.status === 'convention_signed' || data.status === 'payment_pending') && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 4 }}>Informations pour ta convention</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Utilise ces informations pour faire rédiger ta convention de stage par ton école.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#9ca3af', width: 120, flexShrink: 0 }}>Entreprise</span>
              <span style={{ fontSize: 13, color: '#1a1918', fontWeight: 500 }}>{retainedCompany.name ?? '—'}</span>
            </div>
            {retainedCompany.address && (
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#9ca3af', width: 120, flexShrink: 0 }}>Adresse</span>
                <span style={{ fontSize: 13, color: '#1a1918' }}>{retainedCompany.address}</span>
              </div>
            )}
            {retainedCompany.registration_number && (
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#9ca3af', width: 120, flexShrink: 0 }}>N° registre</span>
                <span style={{ fontSize: 13, color: '#1a1918', fontFamily: 'monospace' }}>{retainedCompany.registration_number}</span>
              </div>
            )}
            {retainedCompany.website && (
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#9ca3af', width: 120, flexShrink: 0 }}>Site web</span>
                <a href={retainedCompany.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#c8a96e' }}>{retainedCompany.website}</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paiement */}
      {showPayment && !isPaid && (
        <div style={{ background: '#fef9ee', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Paiement</h2>
          <div style={{ background: 'white', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Montant à régler</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1a1918' }}>{paymentTotal.toFixed(0)} €</span>
            </div>
            {data.invoice_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Référence</span>
                <span style={{ fontSize: 13, color: '#1a1918', fontWeight: 600, fontFamily: 'monospace' }}>{data.invoice_number}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>Coordonnées bancaires</p>
          <div style={{ background: 'white', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Société</span>
              <span style={{ fontSize: 12, color: '#1a1918' }}>{data.billing_companies?.name ?? 'SIDLYS INTERNATIONAL LLC'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>IBAN</span>
              <span style={{ fontSize: 12, color: '#1a1918', fontFamily: 'monospace' }}>{data.billing_companies?.bank_iban ?? 'GB76REVO00996903517949'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>BIC</span>
              <span style={{ fontSize: 12, color: '#1a1918', fontFamily: 'monospace' }}>{PAYMENT_INFO_FALLBACK.bic ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Banque</span>
              <span style={{ fontSize: 12, color: '#1a1918' }}>{PAYMENT_INFO_FALLBACK.bank ?? '—'}</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#a16207', marginTop: 10, fontStyle: 'italic' }}>Paiement par carte (Stripe) disponible prochainement.</p>
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

      {/* Infos profil */}
      {data.interns && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Mon profil</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.interns.email && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Email</span>
                <span style={{ fontSize: 13, color: '#1a1918' }}>{data.interns.email}</span>
              </div>
            )}
            {data.interns.phone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Téléphone</span>
                <span style={{ fontSize: 13, color: '#1a1918' }}>{data.interns.phone}</span>
              </div>
            )}
            {data.interns.whatsapp && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>WhatsApp</span>
                <span style={{ fontSize: 13, color: '#1a1918' }}>{data.interns.whatsapp}</span>
              </div>
            )}
            {data.interns.cv_url && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>CV</span>
                <a href={data.interns.cv_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#c8a96e', fontWeight: 600 }}>
                  Voir mon CV
                </a>
              </div>
            )}
          </div>
          <Link href={`/portal/${token}/cv`} style={{
            display: 'inline-block', marginTop: 12, padding: '8px 16px',
            background: '#f3f4f6', color: '#374151', borderRadius: 8,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            Mettre à jour mon CV
          </Link>
        </div>
      )}

      {/* Carte stagiaire */}
      {data.status === 'active' && (
        <div style={{ background: 'linear-gradient(135deg, #111110, #2a2927)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p style={{ color: '#c8a96e', fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Ta carte Bali Interns</p>
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

      {/* Logement & Scooters — unlock after payment */}
      {isPaid && (
        <div style={{ background: 'white', border: '1.5px solid #c8a96e', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>🏠 Avant le décollage</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href={`/portal/${token}/logement`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fafaf7', borderRadius: 10, border: '1px solid #e5e7eb', textDecoration: 'none', color: '#1a1918' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>🏠 Choisir mon logement</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>33 guesthouses partenaires Bali Interns — Canggu, Seminyak, Ubud</p>
              </div>
              <span style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700, flexShrink: 0 }}>{data.housing_reserved ? '✅' : '→'}</span>
            </a>
            <a href={`/portal/${token}/logement`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fafaf7', borderRadius: 10, border: '1px solid #e5e7eb', textDecoration: 'none', color: '#1a1918' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>🛵 Louer un scooter</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>7 prestataires partenaires — tarifs négociés stagiaires</p>
              </div>
              <span style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700, flexShrink: 0 }}>→</span>
            </a>
          </div>
        </div>
      )}

      {/* Partenaires */}
      {partners.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1918', marginBottom: 4 }}>Nos partenaires</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Des deals exclusifs pour les stagiaires Bali Interns.</p>

          {partners.filter(p => p.partner_timing === 'pre_arrival' || p.partner_timing === 'both').length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✈️ Avant le départ</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partners.filter(p => p.partner_timing === 'pre_arrival' || p.partner_timing === 'both').map(p => (
                  <PartnerCard key={p.id} partner={p} />
                ))}
              </div>
            </div>
          )}

          {['active','alumni','completed'].includes(data.status) && partners.filter(p => p.partner_timing === 'on_site' || p.partner_timing === 'both').length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>🌴 Sur l&apos;île</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partners.filter(p => p.partner_timing === 'on_site' || p.partner_timing === 'both').map(p => (
                  <PartnerCard key={p.id} partner={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp */}
      <div style={{ background: 'linear-gradient(135deg, #075e54, #128c7e)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Besoin d&apos;aide ?</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 }}>Notre equipe est disponible sur WhatsApp.</p>
        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'white', color: '#075e54', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          WhatsApp Bali Interns
        </a>
      </div>

      {/* Contact */}
      <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
