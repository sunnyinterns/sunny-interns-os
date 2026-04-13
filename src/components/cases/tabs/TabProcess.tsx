'use client'

import React, { useState, useEffect } from 'react'
import { ProcessTimeline } from '@/components/cases/ProcessTimeline'
import StatusActionPanel from '@/components/cases/StatusActionPanel'
import type { CaseStatus } from '@/lib/types'

interface ActivityEntry {
  id: string
  type?: string
  action_type?: string
  description: string
  title?: string | null
  created_at: string
  created_by?: string | null
  author_name?: string | null
  assigned_to?: string | null
  source?: string | null
}

interface CaseLogEntry {
  id: string
  author_name: string
  action: string
  field_label?: string | null
  old_value?: string | null
  new_value?: string | null
  description: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

interface ChecklistData {
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
}

interface TabProcessProps {
  caseId: string
  status: CaseStatus
  activityFeed: ActivityEntry[]
  isVisaOnly?: boolean
  checklist?: ChecklistData
  internEmail?: string | null
  paymentAmount?: number | null
  filloutBillFormUrl?: string | null
  caseData?: Record<string, unknown>
  onRefresh?: () => void
  onTabChange?: (tab: string) => void
}

const ACTIVITY_ICONS: Record<string, string> = {
  status_changed: '🔄',
  status_change: '🔄',
  field_edited: '✏️',
  email_sent: '📧',
  note_added: '💬',
  doc_uploaded: '📎',
  job_submitted: '📋',
  job_proposed: '📋',
  job_retained: '🎉',
  cv_revision: '📝',
  cv_uploaded: '📎',
  visa_docs_ready: '📁',
  payment_received: '💳',
  visa_received: '🛂',
  note: '💬',
  default: '•',
}

const LOG_ICONS: Record<string, string> = {
  status_changed: '🔄',
  field_edited: '✏️',
  email_sent: '📧',
  note_added: '💬',
  doc_uploaded: '📎',
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const ALL_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: 'lead', label: 'Demande entrante' },
  { value: 'rdv_booked', label: 'RDV booké' },
  { value: 'qualification_done', label: 'Qualif faite' },
  { value: 'job_submitted', label: 'Jobs proposés' },
  { value: 'job_retained', label: 'Job retenu' },
  { value: 'convention_signed', label: 'Convention signée' },
  { value: 'payment_pending', label: 'Paiement en attente' },
  { value: 'payment_received', label: 'Paiement reçu' },
  { value: 'visa_docs_sent', label: 'Docs visa envoyés' },
  { value: 'visa_submitted', label: 'Visa soumis agent' },
  { value: 'visa_received', label: 'Visa reçu' },
  { value: 'arrival_prep', label: 'Préparation départ' },
  { value: 'active', label: 'En stage' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'not_interested', label: 'Pas intéressé' },
  { value: 'not_qualified', label: 'Non qualifié' },
  { value: 'on_hold', label: 'En attente' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'visa_refused', label: 'Visa refusé' },
  { value: 'archived', label: 'Archivé' },
]

const CHECKLIST_ITEMS: { key: keyof ChecklistData; label: string; sub: string }[] = [
  { key: 'billet_avion', label: 'Billet avion aller-retour', sub: 'Vol confirmé' },
  { key: 'papiers_visas', label: 'Documents visa complets', sub: 'Dossier complet à agent' },
  { key: 'visa_recu', label: 'Visa reçu de l\'agent', sub: 'B211A validé' },
  { key: 'convention_signee_check', label: 'Convention de stage signée', sub: 'Par les 3 parties' },
  { key: 'chauffeur_reserve', label: 'Chauffeur réservé', sub: 'Transfert aéroport' },
]

export function TabProcess({
  caseId,
  status: initialStatus,
  activityFeed,
  isVisaOnly,
  checklist: initialChecklist,
  caseData,
  onRefresh,
  onTabChange,
}: TabProcessProps) {
  const [status, setStatus] = useState<CaseStatus>(initialStatus)
  const [checklist, setChecklist] = useState<ChecklistData>(initialChecklist ?? {})
  const [statusChanging, setStatusChanging] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [feed, setFeed] = useState<ActivityEntry[]>(activityFeed)
  const [caseLogs, setCaseLogs] = useState<CaseLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  async function changeStatus(newStatus: string) {
    try {
      await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onRefresh?.()
    } catch { /* silent */ }
  }

  const NEXT_ACTION_MAP: Record<string, {
    bg: string; border: string; color: string
    title: string; desc: string
    cta?: string; ctaColor?: string
    action?: () => void
  }> = {
    lead: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-800',
      title: 'Candidature reçue — RDV à confirmer',
      desc: "Le candidat a complété sa candidature. Vérifier si un RDV a été pris dans le calendrier.",
      cta: '📅 Voir le calendrier',
      ctaColor: 'bg-emerald-600 hover:bg-emerald-700',
      action: () => { if (typeof window !== 'undefined') window.open('/fr/calendar', '_blank') },
    },
    rdv_booked: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-800',
      title: "Mener l'entretien de qualification",
      desc: "Ouvrir l'onglet Profil → prendre des notes → proposer des jobs",
      cta: '✅ Qualifier le candidat',
      ctaColor: 'bg-emerald-600 hover:bg-emerald-700',
      action: () => { void changeStatus('qualification_done') },
    },
    qualification_done: {
      bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-800',
      title: 'Valider le CV et envoyer aux employeurs',
      desc: 'Vérifier le CV dans Jobs → valider ou demander une mise à jour → envoyer',
      cta: '→ Aller aux Jobs',
      ctaColor: 'bg-blue-600 hover:bg-blue-700',
      action: () => onTabChange?.('jobs'),
    },
    job_submitted: {
      bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-800',
      title: 'En attente de retour employeur',
      desc: "Enregistrer le retour de l'employeur dans l'onglet Jobs",
      cta: '→ Voir les offres',
      ctaColor: 'bg-amber-600 hover:bg-amber-700',
      action: () => onTabChange?.('jobs'),
    },
    job_retained: {
      bg: 'bg-violet-50', border: 'border-violet-200', color: 'text-violet-800',
      title: 'Établir la convention de stage',
      desc: "Le candidat a choisi son stage — initier la convention avec l'employeur",
      cta: '📝 Convention signée → Paiement',
      ctaColor: 'bg-violet-600 hover:bg-violet-700',
      action: () => { void changeStatus('payment_pending') },
    },
    convention_signed: {
      bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-800',
      title: 'Envoyer les informations de paiement',
      desc: 'La convention est signée — envoyer les coordonnées bancaires au candidat',
      cta: '→ Aller à Facturation',
      ctaColor: 'bg-amber-600 hover:bg-amber-700',
      action: () => onTabChange?.('facturation'),
    },
    payment_pending: {
      bg: 'bg-orange-50', border: 'border-orange-200', color: 'text-orange-800',
      title: 'En attente du paiement',
      desc: 'Le candidat doit effectuer son virement — relancer si nécessaire',
      cta: '→ Voir Facturation',
      ctaColor: 'bg-orange-600 hover:bg-orange-700',
      action: () => onTabChange?.('facturation'),
    },
    payment_received: {
      bg: 'bg-sky-50', border: 'border-sky-200', color: 'text-sky-800',
      title: 'Lancer le dossier visa',
      desc: "Paiement reçu ✓ — débloquer le formulaire visa pour le candidat",
      cta: '📁 Démarrer le dossier visa',
      ctaColor: 'bg-sky-600 hover:bg-sky-700',
      action: () => { void changeStatus('visa_docs_sent') },
    },
    visa_docs_sent: {
      bg: 'bg-sky-50', border: 'border-sky-200', color: 'text-sky-800',
      title: 'Valider les documents visa',
      desc: 'Le candidat a envoyé ses documents — vérifier et envoyer au sous-traitant',
      cta: '→ Voir Visa',
      ctaColor: 'bg-sky-600 hover:bg-sky-700',
      action: () => onTabChange?.('visa'),
    },
    visa_submitted: {
      bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-800',
      title: 'Dossier visa en cours de traitement',
      desc: "Le dossier est chez le sous-traitant — attendre la réponse",
    },
    visa_received: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-800',
      title: "Visa reçu — préparer l'arrivée",
      desc: "Réserver le chauffeur et préparer l'arrivée du stagiaire",
      cta: "→ Préparer l'arrivée",
      ctaColor: 'bg-emerald-600 hover:bg-emerald-700',
      action: () => onTabChange?.('arrivee'),
    },
    arrival_prep: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-800',
      title: 'Réserver le chauffeur',
      desc: "Confirmer les détails de vol et envoyer le message WhatsApp au chauffeur",
      cta: '→ Aller à Arrivée',
      ctaColor: 'bg-emerald-600 hover:bg-emerald-700',
      action: () => onTabChange?.('arrivee'),
    },
    visa_in_progress: {
      bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-800',
      title: 'Visa en cours de traitement',
      desc: "Le dossier est chez l'agent visa — attendre la réponse",
    },
    active: {
      bg: 'bg-teal-50', border: 'border-teal-200', color: 'text-teal-800',
      title: '🌴 Stagiaire en cours à Bali',
      desc: "Suivre le déroulement du stage et anticiper la fin",
      cta: '🎓 Stage terminé',
      ctaColor: 'bg-teal-600 hover:bg-teal-700',
      action: () => { void changeStatus('alumni') },
    },
    alumni: {
      bg: 'bg-zinc-50', border: 'border-zinc-200', color: 'text-zinc-700',
      title: '🎓 Stage terminé — demander un avis',
      desc: "Envoyer un email de remerciement et demander un avis Google / témoignage",
    },
    completed: {
      bg: 'bg-zinc-50', border: 'border-zinc-200', color: 'text-zinc-600',
      title: 'Dossier clôturé',
      desc: "Ce dossier est terminé et archivé",
    },
  }

  const nextAction = NEXT_ACTION_MAP[status]

  useEffect(() => {
    fetch(`/api/cases/${caseId}/logs`)
      .then(r => r.ok ? r.json() as Promise<CaseLogEntry[]> : [])
      .then(data => { setCaseLogs(data); setLogsLoading(false) })
      .catch(() => setLogsLoading(false))
  }, [caseId])

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function toggleChecklist(key: keyof ChecklistData, value: boolean) {
    setChecklist((c) => ({ ...c, [key]: value }))
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } catch {
      setChecklist((c) => ({ ...c, [key]: !value }))
    }
  }

  async function handleStatusChange(newStatus: CaseStatus) {
    const oldStatus = status
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setStatus(newStatus)
      const oldLabel = ALL_STATUSES.find((s) => s.value === oldStatus)?.label ?? oldStatus
      const newLabel = ALL_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus
      showToast(`Statut → ${newLabel}`)

      // Log status change
      fetch(`/api/cases/${caseId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status_changed',
          field_label: 'Statut',
          old_value: oldLabel,
          new_value: newLabel,
          description: `Changement de statut: ${oldLabel} → ${newLabel}`,
        }),
      })
        .then(r => r.ok ? r.json() as Promise<CaseLogEntry> : null)
        .then(log => { if (log) setCaseLogs(prev => [log, ...prev]) })
        .catch(() => {})
    } catch {
      showToast('Erreur lors du changement de statut', 'error')
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', description: noteText.trim(), author_name: 'Charly' }),
      })
      if (!res.ok) throw new Error()
      const newEntry = await res.json() as ActivityEntry
      setFeed(f => [newEntry, ...f])
      setNoteText('')
      showToast('Note ajoutée')
    } catch {
      showToast('Erreur lors de l\'ajout de la note', 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const doneCount = CHECKLIST_ITEMS.filter((item) => !!checklist[item.key]).length

  const STATUTS_ORDRE = [
    { key: 'rdv_booked', label: 'RDV booké', icon: '📅' },
    { key: 'qualification_done', label: 'Qualifié', icon: '✅' },
    { key: 'job_submitted', label: 'Jobs proposés', icon: '💼' },
    { key: 'job_retained', label: 'Offre acceptée', icon: '🤝' },
    { key: 'convention_signed', label: 'Convention', icon: '📝' },
    { key: 'payment_received', label: 'Paiement reçu', icon: '💶' },
    { key: 'visa_in_progress', label: 'Visa en cours', icon: '🛂' },
    { key: 'active', label: 'En stage', icon: '🌴' },
    { key: 'alumni', label: 'Terminé', icon: '🎓' },
  ]

  const STATUS_TO_TIMELINE: Record<string, string> = {
    lead: 'rdv_booked',
    rdv_booked: 'rdv_booked',
    qualification_done: 'qualification_done',
    job_submitted: 'job_submitted',
    job_retained: 'job_retained',
    convention_signed: 'convention_signed',
    payment_pending: 'convention_signed',
    payment_received: 'payment_received',
    visa_docs_sent: 'payment_received',
    visa_submitted: 'visa_in_progress',
    visa_in_progress: 'visa_in_progress',
    visa_received: 'visa_in_progress',
    arrival_prep: 'visa_in_progress',
    active: 'active',
    alumni: 'alumni',
    completed: 'alumni',
  }

  const mappedKey = STATUS_TO_TIMELINE[status] ?? status
  const currentIdx = STATUTS_ORDRE.findIndex(s => s.key === mappedKey)

  return (
    <div className="space-y-6">
      {/* Timeline visuelle */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {STATUTS_ORDRE.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`flex flex-col items-center gap-0.5 flex-shrink-0 ${i <= currentIdx ? 'opacity-100' : 'opacity-30'}`}>
              <span className="text-base">{s.icon}</span>
              <span className="text-[9px] text-zinc-500 text-center max-w-[50px] leading-tight">{s.label}</span>
            </div>
            {i < STATUTS_ORDRE.length - 1 && (
              <div className={`h-0.5 w-4 flex-shrink-0 mt-[-8px] ${i < currentIdx ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className={[
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white',
          toastMsg.type === 'success' ? 'bg-[#0d9e75]' : 'bg-[#dc2626]',
        ].join(' ')}>
          {toastMsg.text}
        </div>
      )}

      {/* Next action banner */}
      {nextAction && (
        <div className={`rounded-2xl border p-4 ${nextAction.bg} ${nextAction.border}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className={`text-sm font-bold mb-0.5 ${nextAction.color}`}>
                ⚡ Prochaine étape
              </p>
              <p className={`text-sm font-semibold ${nextAction.color}`}>{nextAction.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{nextAction.desc}</p>
            </div>
            {nextAction.cta && nextAction.action && (
              <button
                onClick={nextAction.action}
                className={`flex-shrink-0 px-3 py-2 text-xs font-bold text-white rounded-xl transition-colors ${nextAction.ctaColor ?? ''}`}
              >
                {nextAction.cta}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Status Action Panel — boutons compacts */}
      {caseData && (
        <StatusActionPanel
          caseData={{ id: caseId, status, ...caseData } as Parameters<typeof StatusActionPanel>[0]['caseData']}
          onRefresh={onRefresh}
        />
      )}

      {/* 2. Checklist dossier — 5 items essentiels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-700">Checklist dossier</h3>
          <span className="text-xs text-zinc-400">{doneCount}/{CHECKLIST_ITEMS.length} complétés</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#c8a96e] rounded-full transition-all"
            style={{ width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
        <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = !!checklist[item.key]
            return (
              <label
                key={item.key}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => { void toggleChecklist(item.key, e.target.checked) }}
                  className="w-4 h-4 rounded accent-[#c8a96e] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={['text-sm font-medium', checked ? 'line-through text-zinc-400' : 'text-[#1a1918]'].join(' ')}>
                    {item.label}
                  </p>
                  <p className="text-xs text-zinc-400">{item.sub}</p>
                </div>
                {checked && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9e75" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            )
          })}
        </div>
      </div>

      {/* 3. Changer de statut — dropdown discret */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Changer de statut</h3>
        <div className="relative inline-block">
          <select
            value={status}
            onChange={(e) => { void handleStatusChange(e.target.value as CaseStatus) }}
            disabled={statusChanging}
            className="pl-3 pr-8 py-2 text-sm font-medium border border-zinc-200 rounded-lg bg-white text-[#1a1918] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-60"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 4. Notes internes */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Notes internes</h3>
        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Note interne sur le dossier…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => { void handleSaveNote() }}
              disabled={savingNote || !noteText.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
            >
              {savingNote ? 'Ajout…' : 'Ajouter la note'}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Chronologie */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Chronologie</h3>
        <ProcessTimeline caseId={caseId} currentStatus={status} onStatusChange={setStatus} isVisaOnly={isVisaOnly} />
      </div>

      {/* 6. Activité historique (from case_logs) */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Activité</h3>
        {logsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-zinc-100 rounded-lg" />)}
          </div>
        ) : caseLogs.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune activité enregistrée — les actions apparaîtront ici automatiquement</p>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-zinc-100" />
            <div className="space-y-3">
              {caseLogs.map((log) => {
                const icon = LOG_ICONS[log.action] ?? '•'
                return (
                  <div key={log.id} className="flex items-start gap-3 pl-1">
                    <div className={[
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      log.action === 'status_changed' ? 'bg-blue-50 text-blue-600' :
                      log.action === 'field_edited' ? 'bg-amber-50 text-amber-600' :
                      log.action === 'email_sent' ? 'bg-green-50 text-green-600' :
                      log.action === 'note_added' ? 'bg-purple-50 text-purple-600' :
                      log.action === 'doc_uploaded' ? 'bg-zinc-100 text-zinc-500' :
                      'bg-zinc-50 text-zinc-400'
                    ].join(' ')}>
                      <span className="text-xs">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a1918]">{log.description}</p>
                      {log.field_label && log.old_value && log.new_value && log.action !== 'status_changed' && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          <span className="line-through">{log.old_value}</span>
                          {' → '}
                          <span className="text-zinc-600">{String(log.new_value).substring(0, 50)}{String(log.new_value).length > 50 ? '…' : ''}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-zinc-400">{log.author_name}</span>
                        <span className="text-zinc-200">·</span>
                        <span className="text-xs text-zinc-400">{relativeDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
