'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { tp, getPortalLang, type PortalLang } from '@/lib/i18n'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ── Status → step mapping ─────────────────────────────────────────────────────
const STATUS_TO_STEP: Record<string, number> = {
  lead: 1, rdv_booked: 2, qualification_done: 2,
  job_submitted: 3, job_retained: 4, convention_signed: 4,
  payment_pending: 5, payment_received: 5,
  visa_docs_sent: 6, visa_submitted: 6, visa_in_progress: 6,
  visa_received: 7, arrival_prep: 7,
  active: 8, alumni: 8,
}

const STEPS = [
  { num: 1, label: 'Application' },
  { num: 2, label: 'Interview' },
  { num: 3, label: 'Job Search' },
  { num: 4, label: 'Job Found' },
  { num: 5, label: 'Payment' },
  { num: 6, label: 'Visa' },
  { num: 7, label: 'Departure' },
  { num: 8, label: 'In Bali!' },
]

// ── Tab definitions ────────────────────────────────────────────────────────────
type TabKey = 'home' | 'internship' | 'tasks' | 'perks' | 'profile'

interface TabDef {
  key: TabKey
  icon: string
  label: string
  unlockedFrom: number // step from which this tab is accessible
  lockedMessage: string
}

const TABS: TabDef[] = [
  { key: 'home',        icon: '🏠', label: 'Home',        unlockedFrom: 1, lockedMessage: '' },
  { key: 'internship',  icon: '💼', label: 'Internship',  unlockedFrom: 3, lockedMessage: 'Available once qualified' },
  { key: 'tasks',       icon: '✅', label: 'My Tasks',    unlockedFrom: 5, lockedMessage: 'Available after payment' },
  { key: 'perks',       icon: '🎁', label: 'Perks',       unlockedFrom: 5, lockedMessage: 'Available after payment' },
  { key: 'profile',     icon: '👤', label: 'Profile',     unlockedFrom: 1, lockedMessage: '' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortalData {
  id: string; status: string; portal_token: string
  qualification_notes_for_intern?: string | null
  actual_start_date?: string | null; actual_end_date?: string | null
  billet_avion?: boolean | null; papiers_visas?: boolean | null
  engagement_letter_sent?: boolean | null; cv_revision_requested?: boolean | null
  housing_reserved?: boolean | null; assigned_manager_name?: string | null
  flight_number?: string | null; flight_departure_city?: string | null
  dropoff_address?: string | null
  flight_arrival_time_local?: string | null
  desired_start_date?: string | null; desired_duration_months?: number | null
  visa_submitted_to_agent_at?: string | null; visa_url?: string | null
  payment_amount?: number | null; discount_percentage?: number | null
  intern_first_meeting_date?: string | null; intern_first_meeting_link?: string | null
  billing_companies?: { bank_iban?: string | null; bank_bic?: string | null; bank_name?: string | null; name?: string | null } | null
  interns?: {
    first_name?: string | null; last_name?: string | null; email?: string | null
    whatsapp?: string | null; cv_url?: string | null; desired_sectors?: string[] | null
  } | null
  job_submissions?: Array<{
    id: string; status: string
    jobs?: { public_title?: string | null; title?: string | null; companies?: { name?: string | null } | null } | null
  }> | null
}

interface PortalJobItem {
  submission_id: string; job_id: string; title: string
  sector?: string | null; public_description?: string | null
  employer_first_name?: string | null; submission_status: string
  intern_interested?: boolean | null
}

interface PortalPartner {
  id: string; name: string; logo_url?: string | null
  partner_category?: string | null; partner_deal?: string | null
  partner_timing?: string | null; website?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── CSS vars (mirrors layout) ─────────────────────────────────────────────────
const C = {
  yellow: '#FFCC00', dark: '#1A1A1A', cream: '#FFFBF0',
  muted: '#9ca3af', border: '#e5e7eb', green: '#0d9e75',
  surface: '#ffffff', surfaceAlt: '#f9f7f2',
}

// ── Sub-components ────────────────────────────────────────────────────────────
function LockedTab({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔒</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.dark, margin: 0 }}>{message}</p>
      <p style={{ fontSize: 13, color: C.muted, margin: 0, textAlign: 'center' }}>Complete the previous steps to unlock this section.</p>
    </div>
  )
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px', marginBottom: 12, ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>{children}</p>
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{value}</span>
    </div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: bg, color, display: 'inline-block' }}>{label}</span>
}

function ActionLink({ href, icon, label, done, urgent }: { href: string; icon: string; label: string; done: boolean; urgent?: boolean }) {
  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f0fdf4', borderRadius: 12, border: `1px solid #bbf7d0`, marginBottom: 8 }}>
      <span style={{ fontSize: 20 }}>✅</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#065f46', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.green }}>Done</span>
    </div>
  )
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: urgent ? '#fffbeb' : C.surfaceAlt, borderRadius: 12, border: `1.5px solid ${urgent ? '#fcd34d' : C.border}`, marginBottom: 8, textDecoration: 'none' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {urgent && <p style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', margin: '0 0 1px', letterSpacing: '0.05em' }}>Required</p>}
        <span style={{ fontSize: 14, fontWeight: 500, color: C.dark }}>{label}</span>
      </div>
      <span style={{ fontSize: 16, color: urgent ? '#d97706' : C.yellow }}>→</span>
    </Link>
  )
}

function JobCard({ sub, token }: { sub: PortalJobItem; token: string }) {
  const [interested, setInterested] = useState<boolean | null>(sub.intern_interested ?? null)
  const [saving, setSaving] = useState(false)

  async function sendInterest(val: boolean) {
    setInterested(val); setSaving(true)
    try {
      await fetch(`/api/portal/${token}/jobs/${sub.submission_id}/interest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interested: val }),
      })
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: '⏳ Not sent yet',     bg: '#f3f4f6', color: C.muted },
    sent:      { label: '📧 Application sent', bg: '#dbeafe', color: '#1d4ed8' },
    interview: { label: '🗓️ Interview',        bg: '#ede9fe', color: '#6d28d9' },
    retained:  { label: '✅ Retained!',        bg: '#d1fae5', color: '#059669' },
    rejected:  { label: '❌ Not retained',     bg: '#fee2e2', color: '#dc2626' },
    cancelled: { label: '🚫 Cancelled',        bg: '#f3f4f6', color: C.muted },
  }
  const st = statusLabels[sub.submission_status] ?? statusLabels.pending

  return (
    <SectionCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: '0 0 4px' }}>{sub.title}</p>
          {sub.sector && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{sub.sector}</p>}
          {sub.employer_first_name && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Contact: {sub.employer_first_name}</p>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0, marginLeft: 8 }}>{st.label}</span>
      </div>
      {sub.public_description && (
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '8px 0' }}>{sub.public_description}</p>
      )}
      {sub.submission_status === 'interview' && interested === null && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, margin: '12px 0 8px' }}>Had your interview? What do you think?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void sendInterest(true)} disabled={saving}
              style={{ flex: 1, padding: '11px', border: `2px solid ${C.border}`, borderRadius: 10, background: C.surface, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              🙋 I want to join
            </button>
            <button onClick={() => void sendInterest(false)} disabled={saving}
              style={{ flex: 1, padding: '11px', border: `2px solid ${C.border}`, borderRadius: 10, background: C.surface, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              👋 Not for me
            </button>
          </div>
        </>
      )}
      {interested === true && <p style={{ fontSize: 13, color: C.green, fontWeight: 600, margin: '12px 0 0' }}>✅ You expressed interest — we&apos;ll be in touch!</p>}
      {interested === false && <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: '12px 0 0' }}>👋 Got it — we&apos;ll keep looking.</p>}
    </SectionCard>
  )
}

// ── Tab contents ──────────────────────────────────────────────────────────────
function TabHome({ data, lang, currentStep }: { data: PortalData; lang: PortalLang; currentStep: number }) {
  const prenom = data.interns?.first_name ?? ''
  const isPreQual = currentStep < 3
  const retainedSub = (data.job_submissions ?? []).find(s => s.status === 'retained')

  return (
    <div>
      {/* Greeting + status */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, margin: '0 0 6px', lineHeight: 1.2 }}>
          {prenom ? `Hi ${prenom}! 👋` : 'Welcome! 👋'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge
            label={STEPS[currentStep - 1]?.label ?? 'In progress'}
            bg={currentStep >= 8 ? '#d1fae5' : currentStep >= 5 ? '#fef3c7' : '#ede9e3'}
            color={currentStep >= 8 ? '#065f46' : currentStep >= 5 ? '#92400e' : C.dark}
          />
          {data.assigned_manager_name && (
            <span style={{ fontSize: 12, color: C.muted }}>with {data.assigned_manager_name}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <SectionCard style={{ padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {STEPS.map(s => {
            const done = s.num < currentStep
            const active = s.num === currentStep
            return (
              <div key={s.num} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', margin: '0 auto 3px',
                  background: done ? C.yellow : active ? C.yellow : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: done || active ? 'white' : C.muted,
                  outline: active ? `3px solid rgba(255,204,0,0.3)` : 'none',
                  outlineOffset: 1,
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 8, display: 'block', color: done || active ? C.yellow : C.muted, fontWeight: active ? 700 : 400, lineHeight: 1.2 }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.max(4, ((currentStep - 1) / 7) * 100)}%`, background: `linear-gradient(90deg, ${C.yellow}, #d4b87a)`, transition: 'width 0.6s ease', borderRadius: 3 }} />
        </div>
      </SectionCard>

      {/* Pre-qual state */}
      {isPreQual && (
        <SectionCard style={{ background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>{data.status === 'rdv_booked' ? '📅' : '⏳'}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>
            {data.status === 'rdv_booked' ? 'Interview booked!' : tp(lang, 'dossierEnCours')}
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            {data.status === 'rdv_booked' ? tp(lang, 'rdvBookedMsg') : tp(lang, 'rdvPendingMsg')}
          </p>
        </SectionCard>
      )}

      {/* Interview */}
      {data.intern_first_meeting_date && (
        <SectionCard>
          <SectionTitle>Your interview</SectionTitle>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: '0 0 4px' }}>
            {new Date(data.intern_first_meeting_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>
            {new Date(data.intern_first_meeting_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — via Google Meet
          </p>
          {data.intern_first_meeting_link && (
            <a href={data.intern_first_meeting_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: '#1a73e8', color: 'white', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Join Google Meet
            </a>
          )}
        </SectionCard>
      )}

      {/* Qualification notes */}
      {data.qualification_notes_for_intern && (
        <SectionCard style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <SectionTitle>Interview debrief</SectionTitle>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {data.qualification_notes_for_intern}
          </p>
        </SectionCard>
      )}

      {/* Retained job info */}
      {retainedSub && currentStep >= 4 && (
        <SectionCard style={{ background: `linear-gradient(135deg, ${C.dark} 0%, #2a2927 100%)` }}>
          <SectionTitle>Your internship 🎉</SectionTitle>
          <p style={{ fontSize: 18, fontWeight: 800, color: C.yellow, margin: '0 0 4px' }}>
            {retainedSub.jobs?.public_title ?? retainedSub.jobs?.title ?? 'Internship confirmed!'}
          </p>
          {retainedSub.jobs?.companies?.name && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>{retainedSub.jobs.companies.name}</p>
          )}
          {data.actual_start_date && data.actual_end_date && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {formatDate(data.actual_start_date)} → {formatDate(data.actual_end_date)}
            </p>
          )}
        </SectionCard>
      )}

      {/* Visa status */}
      {currentStep >= 6 && (
        <SectionCard>
          <SectionTitle>Visa status</SectionTitle>
          {data.visa_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🛂</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.green, margin: 0 }}>Visa received! ✅</p>
                <a href={data.visa_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: C.yellow, fontWeight: 600, textDecoration: 'none' }}>📥 Download my visa</a>
              </div>
            </div>
          ) : data.visa_submitted_to_agent_at ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8', margin: 0 }}>Processing</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Submitted {formatDate(data.visa_submitted_to_agent_at)} · ~1 month</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Waiting for your documents</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* Flight */}
      {data.flight_number && currentStep >= 7 && (
        <SectionCard>
          <SectionTitle>Your flight</SectionTitle>
          <Row label="Flight" value={data.flight_number} />
          <Row label="From" value={data.flight_departure_city} />
          <Row label="Arrival Bali" value={data.flight_arrival_time_local} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { label: 'FlightRadar24', url: `https://www.flightradar24.com/${data.flight_number}` },
              { label: 'FlightAware', url: `https://www.flightaware.com/live/flight/${data.flight_number}` },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, textAlign: 'center', padding: '8px', background: C.surfaceAlt, borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', border: `1px solid ${C.border}` }}>
                {l.label}
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Help */}
      <div style={{ background: 'linear-gradient(135deg, #075e54, #128c7e)', borderRadius: 16, padding: 20, marginBottom: 4 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Need help?</p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 14px' }}>Our team is available on WhatsApp.</p>
        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: '#075e54', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          💬 WhatsApp us
        </a>
      </div>
    </div>
  )
}

function TabInternship({ data, portalJobs, token, currentStep }: {
  data: PortalData; portalJobs: PortalJobItem[]; token: string; currentStep: number
}) {
  const retainedSub = (data.job_submissions ?? []).find(s => s.status === 'retained')

  return (
    <div>
      {/* CV revision */}
      {data.cv_revision_requested && (
        <SectionCard style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
          <SectionTitle>⚠️ Action required</SectionTitle>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: '0 0 4px' }}>Your advisor requested a new CV</p>
          <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 12px' }}>Please upload an updated version before we can send your profile to employers.</p>
          <Link href={`/portal/${token}/cv`}
            style={{ display: 'inline-block', padding: '10px 18px', background: C.yellow, color: C.dark, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Upload new CV →
          </Link>
        </SectionCard>
      )}

      {/* Retained job */}
      {retainedSub && (
        <SectionCard style={{ background: `linear-gradient(135deg, ${C.dark}, #2a2927)`, marginBottom: 20 }}>
          <SectionTitle>Your internship 🎉</SectionTitle>
          <p style={{ fontSize: 20, fontWeight: 800, color: C.yellow, margin: '0 0 4px' }}>
            {retainedSub.jobs?.public_title ?? retainedSub.jobs?.title ?? 'Internship confirmed!'}
          </p>
          {retainedSub.jobs?.companies?.name && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{retainedSub.jobs.companies.name}</p>
          )}
        </SectionCard>
      )}

      {/* Job offers */}
      {portalJobs.length > 0 ? (
        <>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>
            {portalJobs.length} offer{portalJobs.length > 1 ? 's' : ''} proposed — let us know what you think!
          </p>
          {portalJobs.map(j => <JobCard key={j.submission_id} sub={j} token={token} />)}
        </>
      ) : (
        <SectionCard style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: 24, margin: '0 0 8px' }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark, margin: '0 0 4px' }}>Job search in progress</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Your advisor is matching your profile with the best opportunities. We&apos;ll notify you when offers are ready.</p>
        </SectionCard>
      )}
    </div>
  )
}

function TabTasks({ data, token, currentStep }: { data: PortalData; token: string; currentStep: number }) {
  const tasks = [
    { icon: '🛂', label: 'Visa documents', href: `/portal/${token}/visa`, done: !!data.papiers_visas, urgent: !data.papiers_visas && currentStep >= 6 },
    { icon: '✈️', label: 'Flight & pickup details', href: `/portal/${token}/billet`, done: !!data.billet_avion, urgent: !data.billet_avion && currentStep >= 7 },
    { icon: '📝', label: 'Commitment letter', href: `/portal/${token}/engagement`, done: !!data.engagement_letter_sent },
    { icon: '🏠', label: 'Accommodation & scooter', href: `/portal/${token}/logement`, done: !!data.housing_reserved },
  ]
  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div>
      {pending.length === 0 && (
        <SectionCard style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>🎉</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#065f46', margin: 0 }}>All tasks completed!</p>
        </SectionCard>
      )}

      {pending.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>To do</p>
          {pending.map(t => <ActionLink key={t.href} {...t} />)}
        </>
      )}

      {done.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 10px' }}>Completed</p>
          {done.map(t => <ActionLink key={t.href} {...t} />)}
        </>
      )}

      {/* Payment info */}
      {['payment_pending', 'convention_signed', 'job_retained'].includes(data.status) && (
        <SectionCard style={{ marginTop: 16 }}>
          <SectionTitle>Payment</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px' }}>
            <span style={{ fontSize: 13, color: C.muted }}>Amount due</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: C.dark }}>{(data.payment_amount ?? 990).toFixed(0)} €</span>
          </div>
          <Link href={`/portal/${token}/facture`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: C.yellow, color: C.dark, borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            View invoice & bank details →
          </Link>
        </SectionCard>
      )}
    </div>
  )
}

function TabPerks({ data, token, partners }: { data: PortalData; token: string; partners: PortalPartner[] }) {
  const isActive = ['active', 'alumni'].includes(data.status)
  const isPaid = !['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed', 'payment_pending'].includes(data.status)

  return (
    <div>
      {/* Intern card */}
      {isPaid && (
        <SectionCard style={{ background: `linear-gradient(135deg, ${C.dark}, #2a2927)`, padding: 20 }}>
          <SectionTitle>Your Bali Interns card</SectionTitle>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px' }}>Your digital ID — show it to unlock exclusive perks.</p>
          <Link href={`/portal/${token}/carte`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: C.yellow, color: C.dark, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            View my card →
          </Link>
        </SectionCard>
      )}

      {/* Partners */}
      {partners.length > 0 ? (
        <>
          {/* Pre-arrival partners */}
          {partners.filter(p => p.partner_timing === 'pre_arrival' || p.partner_timing === 'both').length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 10px' }}>✈️ Before departure</p>
              {partners.filter(p => p.partner_timing === 'pre_arrival' || p.partner_timing === 'both').map(p => (
                <PartnerRow key={p.id} partner={p} />
              ))}
            </>
          )}

          {/* On-site partners */}
          {isActive && partners.filter(p => p.partner_timing === 'on_site' || p.partner_timing === 'both').length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 10px' }}>🌴 On the island</p>
              {partners.filter(p => p.partner_timing === 'on_site' || p.partner_timing === 'both').map(p => (
                <PartnerRow key={p.id} partner={p} />
              ))}
            </>
          )}
        </>
      ) : (
        <SectionCard style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 24, margin: '0 0 8px' }}>🎁</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: '0 0 4px' }}>Partner perks coming soon</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Exclusive deals for Bali Interns members — eSIM, accommodation, and more.</p>
        </SectionCard>
      )}

      {/* ── ACCOMMODATION ── */}
      <div style={{ marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
          🏠 Accommodation
        </p>
        <SectionCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFFBF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: '0 0 2px' }}>33 partner guesthouses</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Canggu · Seminyak · Ubud — pre-negotiated intern rates</p>
            </div>
            <Link href={`/portal/${token}/logement`}
              style={{ flexShrink: 0, padding: '8px 14px', background: data.housing_reserved ? '#f0fdf4' : C.yellow, color: data.housing_reserved ? C.green : C.dark, borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              {data.housing_reserved ? '✓ Chosen' : 'Browse →'}
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* ── SCOOTER RENTALS ── */}
      <div style={{ marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
          🛵 Scooter rentals
        </p>
        <SectionCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFFBF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🛵</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: '0 0 2px' }}>7 partner rental companies</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Pre-negotiated rates · WhatsApp booking</p>
            </div>
            <Link href={`/portal/${token}/logement`}
              style={{ flexShrink: 0, padding: '8px 14px', background: C.yellow, color: C.dark, borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Browse →
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* Referral */}
      <SectionCard style={{ background: `linear-gradient(135deg, #fef9ee, #fffbf0)`, border: `1px solid #fde68a`, marginTop: 8 }}>
        <SectionTitle>Refer a friend</SectionTitle>
        <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 12px' }}>Earn €100 for every friend you refer who completes their internship!</p>
        <Link href={`/portal/${token}/affiliation`}
          style={{ display: 'inline-block', padding: '10px 18px', background: C.yellow, color: C.dark, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          My referral code →
        </Link>
      </SectionCard>
    </div>
  )
}

function PartnerRow({ partner }: { partner: PortalPartner }) {
  return (
    <SectionCard style={{ padding: '14px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {partner.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={partner.logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            : <span style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>{partner.name[0]}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{partner.name}</span>
            {partner.partner_category && (
              <span style={{ fontSize: 10, background: '#f3f4f6', color: C.muted, padding: '1px 6px', borderRadius: 8 }}>{partner.partner_category}</span>
            )}
          </div>
          {partner.partner_deal && (
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0, lineHeight: 1.4 }}>{partner.partner_deal}</p>
          )}
        </div>
        {partner.website && (
          <a href={partner.website} target="_blank" rel="noopener noreferrer"
            style={{ flexShrink: 0, padding: '8px 14px', background: C.yellow, color: C.dark, borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Visit →
          </a>
        )}
      </div>
    </SectionCard>
  )
}

function TabProfile({ data, token }: { data: PortalData; token: string }) {
  const intern = data.interns

  return (
    <div>
      <SectionCard>
        <SectionTitle>Contact</SectionTitle>
        <Row label="Email" value={intern?.email} />
        <Row label="WhatsApp" value={intern?.whatsapp} />
        {intern?.cv_url && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: 13, color: C.muted }}>CV</span>
            <a href={intern.cv_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: C.yellow, fontWeight: 600, textDecoration: 'none' }}>View →</a>
          </div>
        )}
      </SectionCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link href={`/portal/${token}/cv`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>Update my CV</span>
          <span style={{ fontSize: 16, color: C.yellow }}>→</span>
        </Link>
        <Link href={`/portal/${token}/visa`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🛂</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>Visa documents</span>
          <span style={{ fontSize: 16, color: C.yellow }}>→</span>
        </Link>
        <Link href={`/portal/${token}/affiliation`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>Referral program</span>
          <span style={{ fontSize: 16, color: C.yellow }}>→</span>
        </Link>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, margin: '24px 0 0' }}>
        Questions? <a href="mailto:team@bali-interns.com" style={{ color: C.yellow }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortalPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [portalJobs, setPortalJobs] = useState<PortalJobItem[]>([])
  const [partners, setPartners] = useState<PortalPartner[]>([])
  const [lang, setLang] = useState<PortalLang>('en')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('home')

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

  useEffect(() => { loadData(); setLang(getPortalLang()) }, [loadData])

  const currentStep = useMemo(() => data ? (STATUS_TO_STEP[data.status] ?? 1) : 1, [data])

  // Urgency badge on tasks tab
  const urgentTasks = useMemo(() => {
    if (!data) return 0
    let n = 0
    if (!data.papiers_visas && currentStep >= 5) n++
    if (!data.billet_avion && currentStep >= 5) n++
    if (!data.engagement_letter_sent && currentStep >= 5) n++
    if (data.cv_revision_requested) n++
    // Dropoff address manquante si départ proche
    if (!data.dropoff_address && data.billet_avion && currentStep >= 7) n++
    return n
  }, [data, currentStep])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌴</div>
        <p style={{ fontSize: 14, color: C.muted }}>Loading your portal…</p>
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>Invalid or expired link</p>
        <p style={{ fontSize: 13, color: C.muted }}>Contact team@bali-interns.com</p>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: C.cream }}>

      {/* ── Content area — padded to avoid bottom nav overlap ── */}
      <div style={{ paddingBottom: 80 }}>

        {activeTab === 'home' && <TabHome data={data} lang={lang} currentStep={currentStep} />}
        {activeTab === 'internship' && (
          currentStep >= TABS.find(t => t.key === 'internship')!.unlockedFrom
            ? <TabInternship data={data} portalJobs={portalJobs} token={token} currentStep={currentStep} />
            : <LockedTab message={TABS.find(t => t.key === 'internship')!.lockedMessage} />
        )}
        {activeTab === 'tasks' && (
          currentStep >= TABS.find(t => t.key === 'tasks')!.unlockedFrom
            ? <TabTasks data={data} token={token} currentStep={currentStep} />
            : <LockedTab message={TABS.find(t => t.key === 'tasks')!.lockedMessage} />
        )}
        {activeTab === 'perks' && (
          currentStep >= TABS.find(t => t.key === 'perks')!.unlockedFrom
            ? <TabPerks data={data} token={token} partners={partners} />
            : <LockedTab message={TABS.find(t => t.key === 'perks')!.lockedMessage} />
        )}
        {activeTab === 'profile' && <TabProfile data={data} token={token} />}
      </div>

      {/* ── Bottom navigation bar ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        maxWidth: 640,
        margin: '0 auto',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map(tab => {
          const isLocked = currentStep < tab.unlockedFrom
          const isActive = activeTab === tab.key
          const badge = tab.key === 'tasks' && urgentTasks > 0 && !isLocked ? urgentTasks : 0

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px',
                cursor: isLocked ? 'default' : 'pointer',
                position: 'relative',
                transition: 'opacity 0.15s',
              }}
            >
              <span style={{ fontSize: 20, opacity: isLocked ? 0.35 : 1, lineHeight: 1.1 }}>
                {isLocked ? '🔒' : tab.icon}
              </span>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400, marginTop: 3, lineHeight: 1,
                color: isActive ? C.yellow : isLocked ? '#d1d5db' : C.muted,
                transition: 'color 0.15s',
              }}>
                {tab.label}
              </span>
              {/* Active indicator */}
              {isActive && !isLocked && (
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 28, height: 3, background: C.yellow, borderRadius: '0 0 3px 3px' }} />
              )}
              {/* Urgent badge */}
              {badge > 0 && (
                <div style={{
                  position: 'absolute', top: 6, right: '50%', transform: 'translateX(60%)',
                  width: 16, height: 16, borderRadius: '50%', background: '#dc2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'white',
                }}>
                  {badge}
                </div>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
