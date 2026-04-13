'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Types ──────────────────────────────────────────────────

interface Job {
  id: string
  title?: string | null
  public_title?: string | null
  department?: string | null
  wished_duration_months?: number | null
  wished_start_date?: string | null
  location?: string | null
  status?: string | null
  description?: string | null
  requirements?: string | null
  language_required?: string | null
  start_date?: string | null
  duration_months?: number | null
  companies?: { id: string; name: string; contact_name?: string | null; contact_whatsapp?: string | null; contact_email?: string | null; description?: string | null; industry?: string | null; location?: string | null; whatsapp_number?: string | null } | null
  contacts?: { id: string; first_name: string; last_name: string; email?: string | null } | null
}

interface JobSubmission {
  id: string
  job_id: string
  status: string
  submitted_at?: string | null
  created_at?: string | null
  intern_interested?: boolean | null
  intern_priority?: number | null
  cv_revision_requested?: boolean | null
  cv_revision_done?: boolean | null
  employer_response?: string | null
  notes_charly?: string | null
  jobs?: {
    id: string
    public_title?: string | null
    title?: string | null
    wished_duration_months?: number | null
    department?: string | null
    description?: string | null
    companies?: { id: string; name: string; contact_name?: string | null; contact_whatsapp?: string | null; contact_email?: string | null } | null
  } | null
}

interface TabStaffingProps {
  caseId: string
  firstName: string
  lastName: string
  intern: Record<string, unknown>
  caseData: Record<string, unknown>
  desiredStartDate?: string | null
  desiredEndDate?: string | null
  desiredDurationMonths?: number | null
  cvUrl?: string | null
  cvLocalUrl?: string | null
  cvFeedback?: string | null
  cvStatus?: string | null
  desiredSectors?: string[] | null
  qualificationNotes?: string | null
  stageIdeal?: string | null
  spokenLanguages?: string[] | null
  onRefresh?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '⏳ À envoyer', bg: '#f4f4f5', text: '#71717a' },
  proposed: { label: '💬 Proposé', bg: '#fef9ee', text: '#92400e' },
  submitted: { label: '📧 Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  cv_pending: { label: '📄 CV en attente', bg: '#eff6ff', text: '#1d4ed8' },
  cv_validated: { label: '✅ CV validé', bg: '#f0fdf4', text: '#15803d' },
  sent_to_employer: { label: '📧 Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  sent: { label: '📤 Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  interview: { label: '🗓️ Entretien', bg: '#ede9fe', text: '#6d28d9' },
  retained: { label: '✅ Retenu !', bg: '#d1fae5', text: '#059669' },
  rejected: { label: '❌ Non retenu', bg: '#fee2e2', text: '#dc2626' },
  cancelled: { label: 'Annulé', bg: '#f4f4f5', text: '#71717a' },
}

// ── Helpers ─────────────────────────────────────────────────

function showToastMsg(msg: string, ok = true) {
  const el = document.createElement('div')
  el.textContent = msg
  el.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${ok ? 'bg-[#059669]' : 'bg-[#dc2626]'}`
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) }, 2000)
}

const ALL_LANGS = ['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português', 'Nederlands', '中文', '日本語', '한국어', 'العربية', 'Bahasa Indonesia']
const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} mois` }))

// ── Sortable job submission card ────────────────────────────

function SortableJobCard({
  sub, caseId, firstName, onUpdate, onSendToEmployer, actionLoading, cvIsValidated,
}: {
  sub: JobSubmission
  caseId: string
  firstName: string
  onUpdate: (id: string, fields: Record<string, unknown>) => void
  onSendToEmployer: (sub: JobSubmission) => void
  actionLoading: string | null
  cvIsValidated: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const [showWAPopup, setShowWAPopup] = useState(false)
  const [waMessage, setWAMessage] = useState('')

  const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.proposed
  const title = sub.jobs?.public_title ?? sub.jobs?.title ?? 'Offre'
  const company = sub.jobs?.companies?.name ?? '—'
  const contactName = sub.jobs?.companies?.contact_name ?? ''
  const contactWA = sub.jobs?.companies?.contact_whatsapp ?? ''
  const isLoading = actionLoading === sub.id

  function openWAPopup() {
    setWAMessage(
      `Bonjour ${contactName} ! 🌴\n\nJe vous ai envoyé par email la candidature de ${firstName} pour le poste de ${title}.\n\nPouvez-vous me confirmer la réception et donner une réponse sous 7 jours maximum ?\n\nMerci ! 🙏`
    )
    setShowWAPopup(true)
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-xl bg-white overflow-hidden" {...attributes}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: cfg.bg }}>
        {/* Drag handle */}
        <div {...listeners} className="cursor-grab text-zinc-400 hover:text-zinc-600 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: cfg.text }}>{title}</p>
          <p className="text-xs opacity-70">{company}{sub.jobs?.wished_duration_months ? ` · ${sub.jobs.wished_duration_months} mois` : ''}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0"
          style={{ background: 'white', color: cfg.text, border: `1px solid ${cfg.text}33` }}>
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-100 flex flex-wrap gap-2 items-center">
        {(sub.status === 'pending' || sub.status === 'proposed' || sub.status === 'submitted' || sub.status === 'cv_pending') && (
          <>
            <button disabled={isLoading}
              onClick={() => onUpdate(sub.id, { status: 'cv_pending', cv_revision_requested: true })}
              className="text-xs px-2.5 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50">
              📄 Demander MAJ CV
            </button>
            <button disabled={isLoading}
              onClick={() => onUpdate(sub.id, { status: 'cv_validated', cv_revision_done: true })}
              className="text-xs px-2.5 py-1.5 border border-green-300 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50">
              ✅ Valider CV
            </button>
            <button disabled={isLoading}
              onClick={() => cvIsValidated ? onSendToEmployer(sub) : showToastMsg('Valide le CV d\'abord', false)}
              title={!cvIsValidated ? 'CV non validé — valide le CV d\'abord' : undefined}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                cvIsValidated
                  ? 'bg-[#1a1918] text-white hover:bg-zinc-700 disabled:opacity-50'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}>
              {cvIsValidated ? '📧 Envoyer à l\u0027employeur' : '🔒 Envoyer'}
            </button>
          </>
        )}

        {sub.status === 'cv_validated' && (
          <button disabled={isLoading}
            onClick={() => cvIsValidated ? onSendToEmployer(sub) : showToastMsg('Valide le CV d\'abord', false)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
              cvIsValidated
                ? 'bg-[#1a1918] text-white hover:bg-zinc-700 disabled:opacity-50'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}>
            {cvIsValidated ? '📧 Envoyer à l\u0027employeur' : '🔒 Envoyer à l\u0027employeur'}
          </button>
        )}

        {(sub.status === 'sent_to_employer' || sub.status === 'sent') && (
          <>
            <button onClick={openWAPopup}
              className="text-xs px-2.5 py-1.5 bg-[#25d366]/10 text-[#128c5e] hover:bg-[#25d366]/20 border border-[#25d366]/30 rounded-lg font-medium">
              💬 WA employeur
            </button>
            <select value={sub.employer_response ?? ''}
              onChange={e => onUpdate(sub.id, {
                employer_response: e.target.value,
                status: e.target.value === 'interested' ? 'interview' : e.target.value === 'not_interested' ? 'rejected' : sub.status,
              })}
              className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5">
              <option value="">Retour employeur…</option>
              <option value="interested">✅ Intéressé</option>
              <option value="not_interested">❌ Pas intéressé</option>
              <option value="pending">⏳ En attente</option>
            </select>
          </>
        )}

        {sub.status === 'interview' && (
          <>
            <button disabled={isLoading}
              onClick={() => onUpdate(sub.id, { status: 'retained' })}
              className="text-xs px-2.5 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
              ✅ Retenu
            </button>
            <button disabled={isLoading}
              onClick={() => onUpdate(sub.id, { status: 'rejected' })}
              className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50">
              ❌ Rejeter
            </button>
          </>
        )}

        {/* WhatsApp employeur — visible si pas encore envoyé */}
        {!['sent_to_employer', 'sent', 'interview', 'retained', 'rejected', 'cancelled'].includes(sub.status) && (
          <button
            disabled
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-zinc-100 text-zinc-400 cursor-not-allowed">
            💬 WhatsApp employeur
          </button>
        )}

        {sub.status !== 'rejected' && sub.status !== 'cancelled' && sub.status !== 'retained' && sub.status !== 'interview' && (
          <button disabled={isLoading}
            onClick={() => onUpdate(sub.id, { status: 'rejected' })}
            className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">
            ❌
          </button>
        )}

        <input
          defaultValue={sub.notes_charly ?? ''}
          placeholder="Note interne…"
          onBlur={e => {
            if (e.target.value !== (sub.notes_charly ?? '')) {
              onUpdate(sub.id, { notes_charly: e.target.value })
            }
          }}
          className="text-xs flex-1 min-w-32 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c8a96e]"
        />
      </div>

      {/* WhatsApp popup */}
      {showWAPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowWAPopup(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[#1a1918]">💬 WhatsApp employeur</h3>
            {contactName && <p className="text-xs text-zinc-500">Contact: {contactName}</p>}
            {contactWA && <p className="text-xs text-zinc-500">Numéro: {contactWA}</p>}
            <textarea
              value={waMessage}
              onChange={e => setWAMessage(e.target.value)}
              rows={6}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#c8a96e]"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowWAPopup(false)}
                className="text-xs px-3 py-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
                Annuler
              </button>
              <a
                href={contactWA ? `https://wa.me/${contactWA.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}` : '#'}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setShowWAPopup(false)}
                className={`text-xs px-4 py-2 rounded-lg font-semibold transition-colors ${
                  contactWA ? 'bg-[#25d366] text-white hover:bg-[#1da851]' : 'bg-zinc-200 text-zinc-400 pointer-events-none'
                }`}>
                Envoyer sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Job detail popup ────────────────────────────────────────

function JobDetailPopup({ job, onClose, onSelect, isSubmitted }: { job: Job; onClose: () => void; onSelect: () => void; isSubmitted: boolean }) {
  const title = job.public_title ?? job.title ?? 'Offre sans titre'
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-[#1a1918]">{title}</h2>
            <p className="text-sm text-zinc-500">{job.companies?.name ?? ''}{job.department ? ` · ${job.department}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!isSubmitted) { onSelect(); onClose() } }}
              disabled={isSubmitted}
              className="px-4 py-2 bg-[#c8a96e] text-[#1a1918] text-sm font-bold rounded-xl hover:bg-[#b8945a] disabled:opacity-40">
              {isSubmitted ? '✓ Sélectionné' : '+ Sélectionner'}
            </button>
            <button onClick={onClose} className="px-3 py-2 text-sm bg-zinc-100 rounded-xl hover:bg-zinc-200">✕</button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          {job.description && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Prérequis</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(job.start_date ?? job.wished_start_date) && (
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Démarrage</p>
                <p className="text-sm font-medium">{new Date((job.start_date ?? job.wished_start_date)!).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
              </div>
            )}
            {(job.duration_months ?? job.wished_duration_months) && (
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Durée</p>
                <p className="text-sm font-medium">{job.duration_months ?? job.wished_duration_months} mois</p>
              </div>
            )}
            {job.location && (
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Localisation</p>
                <p className="text-sm font-medium">{job.location}</p>
              </div>
            )}
            {job.language_required && (
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">Langue requise</p>
                <p className="text-sm font-medium">{job.language_required}</p>
              </div>
            )}
          </div>
          {job.companies?.description && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">À propos de l&apos;entreprise</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{job.companies.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CV popup ────────────────────────────────────────────────

function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return lower.includes('.pdf') ||
         lower.includes('application%2fpdf') ||
         lower.includes('application/pdf') ||
         lower.split('?')[0].endsWith('.pdf')
}

function CVPopup({ url, onClose, name }: { url: string; onClose: () => void; name?: string }) {
  const isPdf = isPdfUrl(url)
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 flex-shrink-0">
          <p className="font-bold text-sm text-[#1a1918]">📄 CV{name ? ` — ${name}` : ''}</p>
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium">
              ↗ Ouvrir dans un nouvel onglet
            </a>
            <button onClick={onClose}
              className="px-3 py-1.5 text-xs bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium">
              ✕ Fermer
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-zinc-50">
          {isPdf ? (
            <iframe src={url} className="w-full h-full min-h-[80vh]" title="CV PDF" />
          ) : (
            <div className="flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="CV" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main TabStaffing ────────────────────────────────────────

export function TabStaffing({
  caseId, firstName, lastName, intern, desiredStartDate, desiredEndDate, desiredDurationMonths,
  cvUrl, cvLocalUrl, cvFeedback, cvStatus, desiredSectors, qualificationNotes, stageIdeal, spokenLanguages, onRefresh,
}: TabStaffingProps) {
  const internId = intern?.id as string | undefined
  const cvIsValidated = cvStatus === 'validated'

  // State
  const [submissions, setSubmissions] = useState<JobSubmission[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [proposingId, setProposingId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showCVPopup, setShowCVPopup] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)
  const cvFileRef = useRef<HTMLInputElement>(null)

  // Editable fields
  const [stageIdealVal, setStageIdealVal] = useState(stageIdeal ?? '')
  const [cvFeedbackVal, setCvFeedbackVal] = useState(cvFeedback ?? '')
  const [qualNotes, setQualNotes] = useState(qualificationNotes ?? '')
  const [langValues, setLangValues] = useState<string[]>(spokenLanguages ?? [])
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [durationVal, setDurationVal] = useState(desiredDurationMonths ? String(desiredDurationMonths) : '')
  const [cvHistory, setCvHistory] = useState<{ id: string; feedback: string; created_at: string }[]>([])

  const cvDisplayUrl = cvLocalUrl ?? cvUrl ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/job-submissions`)
      if (res.ok) setSubmissions(await res.json() as JobSubmission[])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [caseId])

  // Fetch jobs
  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => { console.log('[TabStaffing] jobs fetch status:', r.status); return r.ok ? r.json() as Promise<Job[]> : Promise.resolve([]) })
      .then(data => { console.log('[TabStaffing] jobs loaded:', data.length); setAllJobs(data) })
      .catch(e => { console.error('[TabStaffing] jobs error:', e); setAllJobs([]); setJobsError('Erreur chargement des offres') })
      .finally(() => setJobsLoading(false))
  }, [])

  // Fetch CV feedback history
  useEffect(() => {
    fetch(`/api/cases/${caseId}/cv-feedback-history`)
      .then(r => r.ok ? r.json() as Promise<{ id: string; feedback: string; created_at: string }[]> : Promise.resolve([]))
      .then(data => setCvHistory(data))
      .catch(() => null)
  }, [caseId])

  useEffect(() => { void fetchSubmissions() }, [fetchSubmissions])

  const submittedJobIds = new Set(submissions.map(s => s.job_id))

  const filteredJobs = allJobs.filter(j => {
    if (submittedJobIds.has(j.id)) return false
    const q = search.toLowerCase()
    const title = (j.public_title ?? j.title ?? '').toLowerCase()
    const company = (j.companies?.name ?? '').toLowerCase()
    const dept = (j.department ?? '').toLowerCase()
    return !q || title.includes(q) || company.includes(q) || dept.includes(q)
  })

  // Actions
  async function proposeJob(jobId: string) {
    setProposingId(jobId)
    try {
      const res = await fetch('/api/job-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, job_id: jobId }),
      })
      if (!res.ok) throw new Error()
      showToastMsg('Job sélectionné ✅')
      void fetchSubmissions()
    } catch { showToastMsg('Erreur', false) }
    finally { setProposingId(null) }
  }

  async function updateSubmission(submissionId: string, fields: Record<string, unknown>) {
    setActionLoading(submissionId)
    try {
      const res = await fetch(`/api/job-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
      showToastMsg(fields.status === 'retained' ? 'Job retenu 🎉' : 'Mis à jour')
      void fetchSubmissions()
      if (fields.status === 'retained') onRefresh?.()
    } catch { showToastMsg('Erreur', false) }
    finally { setActionLoading(null) }
  }

  async function sendToEmployer(sub: JobSubmission) {
    setActionLoading(sub.id)
    try {
      const res = await fetch(`/api/cases/${caseId}/job-submissions/${sub.id}/send-to-employer`, { method: 'POST' })
      if (!res.ok) throw new Error()
      showToastMsg('Envoyé à l\'employeur ✅')
      void fetchSubmissions()
    } catch { showToastMsg('Erreur', false) }
    finally { setActionLoading(null) }
  }

  async function saveInternField(field: string, value: unknown) {
    if (!internId) return
    try {
      await fetch(`/api/interns/${internId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      showToastMsg('Sauvegardé ✓')
    } catch { /* ignore */ }
  }

  async function saveCaseField(field: string, value: unknown) {
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      showToastMsg('Sauvegardé ✓')
    } catch { /* ignore */ }
  }

  async function saveCvFeedback() {
    await saveCaseField('cv_feedback', cvFeedbackVal || null)
    // Save to history
    try {
      await fetch(`/api/cases/${caseId}/cv-feedback-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: cvFeedbackVal }),
      })
      // Refresh history
      const res = await fetch(`/api/cases/${caseId}/cv-feedback-history`)
      if (res.ok) setCvHistory(await res.json() as typeof cvHistory)
    } catch { /* non-blocking */ }
  }

  async function saveCvStatus(status: string) {
    await fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv_status: status }),
    })
    if (onRefresh) onRefresh()
  }

  async function handleCvReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'intern-cvs')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const { url } = await res.json() as { url: string }
      await fetch(`/api/interns/${internId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_url: url }),
      })
      if (onRefresh) onRefresh()
      showToastMsg('CV mis à jour ✅')
    } catch { showToastMsg('Erreur upload', false) }
    finally { setCvUploading(false) }
  }

  async function toggleLang(lang: string) {
    const next = langValues.includes(lang) ? langValues.filter(l => l !== lang) : [...langValues, lang]
    setLangValues(next)
    await saveInternField('spoken_languages', next)
  }

  // DnD handler
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = submissions.findIndex(s => s.id === active.id)
    const newIndex = submissions.findIndex(s => s.id === over.id)
    const reordered = arrayMove(submissions, oldIndex, newIndex)
    setSubmissions(reordered)
    // Persist sort order via reorder API
    const order = reordered.map((s, i) => ({ id: s.id, sort_order: i }))
    void fetch(`/api/cases/${caseId}/job-submissions/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    }).then(() => {
      // Also update intern_priority for display
      reordered.forEach((sub, i) => {
        if (sub.intern_priority !== i + 1) {
          void updateSubmission(sub.id, { intern_priority: i + 1 })
        }
      })
    })
  }

  const sortedSubmissions = [...submissions].sort((a, b) => (a.intern_priority ?? 99) - (b.intern_priority ?? 99))

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: STAGE IDÉAL ── */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">🎯 Stage idéal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Colonne gauche: Infos stage */}
          <div className="px-4 py-4 space-y-3 border-r border-zinc-100">
            {/* Secteurs */}
            {desiredSectors && desiredSectors.length > 0 && (
              <div>
                <span className="text-[11px] text-zinc-400 font-medium">Métiers souhaités</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {desiredSectors.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs font-medium bg-[#c8a96e]/10 text-[#8a6a2a] rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Durée */}
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Durée souhaitée</span>
              <select
                value={durationVal}
                onChange={e => { setDurationVal(e.target.value); void saveCaseField('desired_duration_months', e.target.value ? Number(e.target.value) : null) }}
                className="block mt-1 text-sm text-[#1a1918] bg-transparent border-b border-zinc-200 focus:border-[#c8a96e] focus:outline-none py-1 w-full appearance-none">
                <option value="">—</option>
                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 font-medium">Début souhaité</span>
                <p className="text-sm mt-0.5">{desiredStartDate ? new Date(desiredStartDate).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 font-medium">Date max de fin de stage</span>
                <p className="text-sm mt-0.5">{desiredEndDate ? new Date(desiredEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-zinc-300 text-xs">Non renseignée dans le formulaire</span>}</p>
              </div>
            </div>

            {/* Stage idéal textarea */}
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Stage idéal</span>
              <textarea
                value={stageIdealVal}
                onChange={e => setStageIdealVal(e.target.value)}
                onBlur={() => void saveInternField('stage_ideal', stageIdealVal || null)}
                placeholder="Description du stage idéal…"
                rows={3}
                className="w-full mt-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#c8a96e]"
              />
            </div>

            {/* Langues */}
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Langues</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {langValues.length > 0 ? langValues.map(v => (
                  <button key={v} onClick={() => void toggleLang(v)}
                    className="px-2 py-0.5 text-xs font-medium bg-[#c8a96e]/10 text-[#c8a96e] rounded-full hover:bg-[#c8a96e]/20">
                    {v} ×
                  </button>
                )) : <span className="text-sm text-zinc-300">—</span>}
                <button onClick={() => setShowLangPicker(!showLangPicker)}
                  className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500 rounded-full hover:bg-zinc-200">+</button>
              </div>
              {showLangPicker && (
                <div className="flex flex-wrap gap-1.5 mt-1 p-2 bg-zinc-50 rounded-lg">
                  {ALL_LANGS.filter(l => !langValues.includes(l)).map(lang => (
                    <button key={lang} onClick={() => void toggleLang(lang)}
                      className="px-2 py-0.5 text-xs font-medium bg-white border border-zinc-200 text-zinc-600 rounded-full hover:border-[#c8a96e]">
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Qualification notes */}
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Notes de qualification</span>
              <textarea
                value={qualNotes}
                onChange={e => setQualNotes(e.target.value)}
                onBlur={() => void saveCaseField('qualification_notes', qualNotes || null)}
                placeholder="Notes de qualification…"
                rows={3}
                className="w-full mt-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#c8a96e]"
              />
            </div>
          </div>

          {/* Colonne droite: CV */}
          <div className="px-4 py-4 space-y-3">
            <span className="text-[11px] text-zinc-400 font-medium">📄 CV</span>

            {/* Badge statut CV */}
            {(() => {
              const cvBadge: Record<string, { label: string; color: string }> = {
                pending: { label: '⏳ En attente de validation', color: 'bg-amber-100 text-amber-700' },
                validated: { label: '✅ CV validé', color: 'bg-emerald-100 text-emerald-700' },
                to_redo: { label: '🔄 À refaire', color: 'bg-red-100 text-red-700' },
              }
              const badge = cvBadge[cvStatus ?? 'pending'] ?? cvBadge.pending
              return (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.color}`}>
                    {badge.label}
                  </span>
                  <select
                    value={cvStatus ?? 'pending'}
                    onChange={e => void saveCvStatus(e.target.value)}
                    className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:border-[#c8a96e] cursor-pointer"
                  >
                    <option value="pending">⏳ En attente</option>
                    <option value="validated">✅ Valider le CV</option>
                    <option value="to_redo">🔄 Demander refonte</option>
                  </select>
                </div>
              )
            })()}

            {cvDisplayUrl ? (
              <div className="space-y-2">
                <div
                  className="relative border border-zinc-200 rounded-lg overflow-hidden cursor-pointer hover:border-[#c8a96e] transition-colors h-48"
                  onClick={() => setShowCVPopup(true)}>
                  {isPdfUrl(cvDisplayUrl) ? (
                    <iframe src={cvDisplayUrl} className="w-full h-full pointer-events-none" title="CV preview" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cvDisplayUrl} alt="CV" className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement?.querySelector('.cv-fallback')?.classList.remove('hidden')
                        }} />
                      <div className="cv-fallback hidden flex items-center justify-center h-full text-zinc-400 text-sm">
                        📄 Cliquer pour voir le CV
                      </div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center">
                    <span className="text-xs bg-white/90 px-3 py-1.5 rounded-lg font-medium text-zinc-700 shadow-sm opacity-0 hover:opacity-100 transition-opacity">
                      Cliquer pour agrandir
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {cvLocalUrl && (
                    <a href={cvLocalUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-lg font-semibold hover:bg-[#b8945a]">
                      📄 CV mis à jour
                    </a>
                  )}
                  {cvUrl && cvUrl !== cvLocalUrl && (
                    <a href={cvUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg font-medium hover:bg-zinc-200">
                      📄 CV original
                    </a>
                  )}
                  <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => void handleCvReplace(e)} />
                  <button onClick={() => cvFileRef.current?.click()} disabled={cvUploading}
                    className="text-xs px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium text-zinc-600 flex items-center gap-1">
                    {cvUploading ? '⏳...' : '📎 Remplacer le CV'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-48 border border-dashed border-zinc-200 rounded-lg flex items-center justify-center">
                  <p className="text-sm text-zinc-400">Aucun CV déposé</p>
                </div>
                <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => void handleCvReplace(e)} />
                <button onClick={() => cvFileRef.current?.click()} disabled={cvUploading}
                  className="text-xs px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium text-zinc-600 flex items-center gap-1">
                  {cvUploading ? '⏳...' : '📎 Ajouter un CV'}
                </button>
              </div>
            )}

            {/* Commentaire CV */}
            <div>
              <span className="text-[11px] text-zinc-400 font-medium">Commentaire CV</span>
              <textarea
                value={cvFeedbackVal}
                onChange={e => setCvFeedbackVal(e.target.value)}
                onBlur={() => void saveCvFeedback()}
                placeholder="Commentaires, retours, demandes de modifications…"
                rows={3}
                className="w-full mt-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#c8a96e]"
              />
            </div>

            {/* Historique commentaires CV */}
            {cvHistory.length > 0 && (
              <div>
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Historique ({cvHistory.length})</span>
                <div className="mt-1 space-y-1.5 max-h-32 overflow-y-auto">
                  {cvHistory.slice(0, 3).map(h => (
                    <div key={h.id} className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-zinc-400">{new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <p className="mt-0.5 line-clamp-2">{h.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: JOBS DISPONIBLES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Jobs disponibles ({filteredJobs.length})
          </h3>
        </div>
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par titre, entreprise, secteur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {jobsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl" />)}
          </div>
        ) : jobsError ? (
          <div className="py-8 text-center text-sm text-red-500 bg-red-50 rounded-xl border border-red-200">
            {jobsError}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400 bg-white rounded-xl border border-dashed border-zinc-200">
            {search ? `Aucun job pour "${search}"` : 'Aucun job ouvert disponible'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map(job => {
              const isSubmitted = submittedJobIds.has(job.id)
              const isProposing = proposingId === job.id
              const title = job.public_title ?? job.title ?? 'Offre sans titre'
              const company = job.companies?.name
              return (
                <div key={job.id}
                  className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border transition-all ${
                    isSubmitted ? 'border-[#c8a96e] bg-amber-50/30' : 'border-zinc-100 hover:border-zinc-200 hover:shadow-sm'
                  }`}>
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-zinc-500">
                    {(company ?? title)[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918] truncate">{title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {company && <span className="text-xs text-zinc-500 font-medium">{company}</span>}
                      {job.wished_duration_months && (
                        <><span className="text-zinc-300 text-xs">·</span><span className="text-xs text-zinc-400">{job.wished_duration_months} mois</span></>
                      )}
                      {job.department && (
                        <><span className="text-zinc-300 text-xs">·</span><span className="text-xs text-zinc-400">{job.department}</span></>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-xs px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100 rounded-lg font-medium flex-shrink-0">
                    Voir
                  </button>
                  {isSubmitted ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                      Déjà sélectionné
                    </span>
                  ) : (
                    <button disabled={isProposing} onClick={() => void proposeJob(job.id)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
                      {isProposing ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : '+ Sélectionner'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 3: JOBS SÉLECTIONNÉS ── */}
      {sortedSubmissions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Jobs sélectionnés ({sortedSubmissions.length})
          </h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedSubmissions.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sortedSubmissions.map(sub => (
                  <SortableJobCard
                    key={sub.id}
                    sub={sub}
                    caseId={caseId}
                    firstName={firstName}
                    onUpdate={updateSubmission}
                    onSendToEmployer={sendToEmployer}
                    actionLoading={actionLoading}
                    cvIsValidated={cvIsValidated}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl" />)}
        </div>
      )}

      {/* Popups */}
      {selectedJob && (
        <JobDetailPopup
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSelect={() => void proposeJob(selectedJob.id)}
          isSubmitted={submittedJobIds.has(selectedJob.id)}
        />
      )}
      {showCVPopup && cvDisplayUrl && (
        <CVPopup url={cvDisplayUrl} onClose={() => setShowCVPopup(false)} name={`${firstName} ${lastName}`} />
      )}
    </div>
  )
}
