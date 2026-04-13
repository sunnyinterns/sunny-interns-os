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

interface ProcessTimelineProps {
  caseId: string
  currentStatus: CaseStatus
  onStatusChange?: (newStatus: CaseStatus) => void
  isVisaOnly?: boolean
}

export function ProcessTimeline({ caseId, currentStatus, onStatusChange, isVisaOnly }: ProcessTimelineProps) {
  const [updating, setUpdating] = useState(false)
  const [showEditPopup, setShowEditPopup] = useState(false)
  const steps = isVisaOnly ? VISA_ONLY_STEPS : CANDIDATE_STEPS
  const currentIndex = steps.findIndex((s) => s.status === currentStatus)

  async function handleStatusChange(status: CaseStatus) {
    if (updating) return
    setUpdating(true)
    setShowEditPopup(false)
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        onStatusChange?.(status)
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
          const isFuture = index > currentIndex

          return (
            <div key={step.status} className="flex items-center">
              {/* Step node — non cliquable */}
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

        {/* Bouton edit */}
        <div className="relative ml-2 -mt-4">
          <button
            onClick={() => setShowEditPopup(!showEditPopup)}
            disabled={updating}
            className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-xs text-zinc-500 transition-colors disabled:opacity-50"
            title="Modifier le statut manuellement"
          >
            ✏️
          </button>

          {/* Popup de confirmation + sélection statut */}
          {showEditPopup && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEditPopup(false)} />
              <div className="absolute right-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 w-72">
                <div className="flex items-start gap-2 mb-3 pb-3 border-b border-zinc-100">
                  <span className="text-base">⚠️</span>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Modifier le statut manuellement peut déclencher des automatisations (emails, notifications). Êtes-vous sûr ?
                  </p>
                </div>
                <div className="space-y-1.5">
                  {steps.map((step, index) => (
                    <button
                      key={step.status}
                      disabled={index === currentIndex || updating}
                      onClick={() => void handleStatusChange(step.status)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        index === currentIndex
                          ? 'bg-[#c8a96e]/10 text-[#c8a96e] font-semibold cursor-default'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                      {index === currentIndex && <span className="ml-auto text-[10px] text-[#c8a96e]">actuel</span>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowEditPopup(false)}
                  className="w-full mt-3 pt-2 border-t border-zinc-100 text-xs text-zinc-400 hover:text-zinc-600 text-center"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
