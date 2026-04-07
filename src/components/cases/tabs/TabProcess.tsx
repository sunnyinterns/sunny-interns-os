'use client'

import { useState } from 'react'
import { ProcessTimeline } from '@/components/cases/ProcessTimeline'
import { Button } from '@/components/ui/Button'
import StatusActionPanel from '@/components/cases/StatusActionPanel'
import type { CaseStatus } from '@/lib/types'

interface ActivityEntry {
  id: string
  action_type: string
  description: string
  created_at: string
}

interface ChecklistData {
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  logement_scooter_formulaire?: boolean | null
  logement_reserve?: boolean | null
  scooter_reserve_check?: boolean | null
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

const CHECKLIST_ITEMS: { key: keyof ChecklistData; label: string; sub?: string }[] = [
  { key: 'billet_avion', label: 'Billet avion confirmé', sub: 'Vol aller-retour' },
  { key: 'papiers_visas', label: 'Papiers visa envoyés', sub: 'Dossier complet à agent' },
  { key: 'visa_recu', label: 'Visa reçu', sub: 'B211A validé' },
  { key: 'logement_scooter_formulaire', label: 'Formulaire logement/scooter', sub: 'FillOut rempli' },
  { key: 'logement_reserve', label: 'Logement réservé', sub: 'Guesthouse confirmée' },
  { key: 'scooter_reserve_check', label: 'Scooter réservé', sub: 'Si souhaité' },
  { key: 'convention_signee_check', label: 'Convention signée', sub: 'Par les 3 parties' },
  { key: 'chauffeur_reserve', label: 'Chauffeur réservé', sub: 'Transfert aéroport' },
]

export function TabProcess({
  caseId,
  status: initialStatus,
  activityFeed,
  isVisaOnly,
  checklist: initialChecklist,
  internEmail,
  paymentAmount,
  filloutBillFormUrl,
  caseData,
  onRefresh,
}: TabProcessProps) {
  const [status, setStatus] = useState<CaseStatus>(initialStatus)
  const [checklist, setChecklist] = useState<ChecklistData>(initialChecklist ?? {})
  const [pdfLoading, setPdfLoading] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [emailSending, setEmailSending] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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
      // revert on error
      setChecklist((c) => ({ ...c, [key]: !value }))
    }
  }

  async function handleStatusChange(newStatus: CaseStatus) {
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setStatus(newStatus)
      showToast(`Statut → ${ALL_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus}`)
    } catch {
      showToast('Erreur lors du changement de statut', 'error')
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleSendPaymentEmail() {
    if (!internEmail) { showToast('Email stagiaire manquant', 'error'); return }
    setEmailSending('payment')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_request',
          caseId,
          internEmail,
          paymentAmount: paymentAmount ?? 0,
          filloutBillFormUrl,
        }),
      })
      if (!res.ok) throw new Error()
      showToast('Email paiement envoyé')
    } catch {
      showToast('Erreur envoi email paiement', 'error')
    } finally {
      setEmailSending(null)
    }
  }

  async function handleSendEmployerEmail() {
    setEmailSending('employer')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'employer_docs_reminder', caseId }),
      })
      if (!res.ok) throw new Error()
      showToast('Email employeur envoyé')
    } catch {
      showToast('Erreur envoi email employeur', 'error')
    } finally {
      setEmailSending(null)
    }
  }

  async function handleDownloadEngagementLetter() {
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/engagement-letter`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lettre-engagement.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Erreur génération PDF', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  const doneCount = CHECKLIST_ITEMS.filter((item) => !!checklist[item.key]).length

  return (
    <div className="space-y-6">
      {/* Status Action Panel */}
      {caseData && (
        <StatusActionPanel
          caseData={{ id: caseId, status, ...caseData } as Parameters<typeof StatusActionPanel>[0]['caseData']}
          onRefresh={onRefresh}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={[
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white',
          toastMsg.type === 'success' ? 'bg-[#0d9e75]' : 'bg-[#dc2626]',
        ].join(' ')}>
          {toastMsg.text}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status dropdown */}
        <div className="relative">
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

        <Button
          variant="secondary"
          size="sm"
          loading={emailSending === 'payment'}
          onClick={() => { void handleSendPaymentEmail() }}
        >
          Envoyer email paiement
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={emailSending === 'employer'}
          onClick={() => { void handleSendEmployerEmail() }}
        >
          Envoyer email employeur
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={pdfLoading}
          onClick={() => { void handleDownloadEngagementLetter() }}
        >
          Lettre d&apos;engagement
        </Button>
      </div>

      {/* Checklist 8 items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-700">Checklist dossier</h3>
          <span className="text-xs text-zinc-400">{doneCount}/8 complétés</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#c8a96e] rounded-full transition-all"
            style={{ width: `${(doneCount / 8) * 100}%` }}
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
                  {item.sub && <p className="text-xs text-zinc-400">{item.sub}</p>}
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

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Chronologie</h3>
        <ProcessTimeline caseId={caseId} currentStatus={status} onStatusChange={setStatus} isVisaOnly={isVisaOnly} />
      </div>

      {/* Activity feed */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Activité récente</h3>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune activité enregistrée</p>
        ) : (
          <div className="space-y-2">
            {activityFeed.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1a1918]">{entry.description}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {new Date(entry.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
