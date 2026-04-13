'use client'

import { useState } from 'react'
import type { CaseStatus } from '@/lib/types'

const CANDIDATE_STEPS: { status: CaseStatus; label: string; icon: string }[] = [
  { status: 'lead', label: 'Demande', icon: '📋' },
  { status: 'rdv_booked', label: 'RDV', icon: '📅' },
  { status: 'qualification_done', label: 'Qualifié', icon: '✅' },
  { status: 'job_submitted', label: 'Jobs envoyés', icon: '💼' },
  { status: 'job_retained', label: 'Job retenu', icon: '🤝' },
]

const VISA_ONLY_STEPS: { status: CaseStatus; label: string; icon: string }[] = [
  { status: 'convention_signed', label: 'Documents', icon: '📄' },
  { status: 'visa_in_progress', label: 'Soumission', icon: '🛂' },
  { status: 'visa_received', label: 'Visa reçu', icon: '✅' },
  { status: 'archived', label: 'Archivé', icon: '📦' },
]

const ALL_STATUSES: { value: string; label: string }[] = [
  { value: 'lead', label: '📋 Demande' },
  { value: 'rdv_booked', label: '📅 RDV Booké' },
  { value: 'qualification_done', label: '✅ Qualifié' },
  { value: 'job_submitted', label: '💼 Jobs proposés' },
  { value: 'job_retained', label: '🤝 Job retenu' },
  { value: 'convention_signed', label: '📄 Convention signée' },
  { value: 'payment_pending', label: '💰 Paiement en attente' },
  { value: 'payment_received', label: '💵 Payé' },
  { value: 'visa_docs_sent', label: '📑 Docs visa envoyés' },
  { value: 'visa_submitted', label: '🛂 Visa soumis' },
  { value: 'visa_in_progress', label: '⏳ Visa en cours' },
  { value: 'visa_received', label: '🎉 Visa reçu' },
  { value: 'arrival_prep', label: '✈️ Départ imminent' },
  { value: 'active', label: '🌴 En stage' },
  { value: 'alumni', label: '🎓 Alumni' },
  { value: 'completed', label: '🏁 Terminé' },
  { value: 'not_interested', label: '👋 Pas intéressé' },
  { value: 'not_qualified', label: '❌ Non qualifié' },
  { value: 'on_hold', label: '⏸️ En attente' },
  { value: 'suspended', label: '🚫 Suspendu' },
  { value: 'visa_refused', label: '🚷 Visa refusé' },
  { value: 'archived', label: '📦 Archivé' },
]

interface ProcessTimelineProps {
  caseId: string
  currentStatus: CaseStatus
  onStatusChange?: (newStatus: CaseStatus) => void
  isVisaOnly?: boolean
}

export function ProcessTimeline({ caseId, currentStatus, onStatusChange, isVisaOnly }: ProcessTimelineProps) {
  const [updating, setUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const steps = isVisaOnly ? VISA_ONLY_STEPS : CANDIDATE_STEPS
  const currentIndex = steps.findIndex((s) => s.status === currentStatus)

  async function handleStatusChange(status: string) {
    if (updating) return
    setUpdating(true)
    setShowStatusModal(false)
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        onStatusChange?.(status as CaseStatus)
      }
    } catch {
      // silent fail
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max">
        {steps.map((step, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.status} className="flex items-center">
              {/* Step node — visuel seulement */}
              <div className="flex flex-col items-center gap-1 px-2">
                <div
                  className={[
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs',
                    isPast
                      ? 'bg-[#c8a96e] border-[#c8a96e]'
                      : isCurrent
                      ? 'bg-[#c8a96e] border-[#c8a96e] scale-110 shadow-md shadow-[#c8a96e]/30'
                      : 'bg-white border-zinc-200',
                  ].join(' ')}
                >
                  {isPast ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isCurrent ? (
                    <span>{step.icon}</span>
                  ) : (
                    <span className="opacity-30">{step.icon}</span>
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] whitespace-nowrap transition-colors',
                    isCurrent ? 'text-[#c8a96e] font-bold' : isPast ? 'text-[#c8a96e]' : 'text-zinc-300',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-6 flex-shrink-0 -mt-4 rounded-full',
                    index < currentIndex ? 'bg-[#c8a96e]' : 'bg-zinc-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}

        {/* Bouton edit — ouvre modal avec tous les statuts */}
        <button
          onClick={() => setShowStatusModal(true)}
          disabled={updating}
          className="ml-2 -mt-4 text-xs flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
          title="Modifier le statut manuellement"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          ✏️
        </button>
      </div>

      {/* Modal changement de statut — tous les statuts */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Modifier le statut</h3>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ Modifier le statut manuellement peut déclencher des automatisations (emails, notifications). Agis avec précaution.
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {ALL_STATUSES.map(s => (
                <button key={s.value}
                  onClick={() => { void handleStatusChange(s.value) }}
                  disabled={s.value === currentStatus}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    s.value === currentStatus
                      ? 'bg-[#c8a96e] text-white cursor-default'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                  }`}>
                  {s.value === currentStatus ? '● ' : ''}{s.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} className="mt-4 w-full py-2 text-sm text-zinc-400 hover:text-zinc-600">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
