'use client'

import { useState } from 'react'
import type { CaseStatus } from '@/lib/types'

const PIPELINE_STEPS: { status: CaseStatus; label: string }[] = [
  { status: 'lead', label: 'Lead' },
  { status: 'rdv_booked', label: 'RDV planifié' },
  { status: 'qualification_done', label: 'Qualifié' },
  { status: 'job_submitted', label: 'Job soumis' },
  { status: 'job_retained', label: 'Job retenu' },
  { status: 'convention_signed', label: 'Convention signée' },
  { status: 'payment_pending', label: 'Paiement en attente' },
  { status: 'payment_received', label: 'Paiement reçu' },
  { status: 'visa_in_progress', label: 'Visa en cours' },
  { status: 'visa_received', label: 'Visa reçu' },
  { status: 'arrival_prep', label: 'Préparation arrivée' },
  { status: 'active', label: 'Actif' },
  { status: 'alumni', label: 'Alumni' },
]

interface ProcessTimelineProps {
  caseId: string
  currentStatus: CaseStatus
  onStatusChange?: (newStatus: CaseStatus) => void
}

export function ProcessTimeline({ caseId, currentStatus, onStatusChange }: ProcessTimelineProps) {
  const [updating, setUpdating] = useState(false)
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus)

  async function handleStepClick(status: CaseStatus, index: number) {
    if (index === currentIndex || updating) return
    setUpdating(true)
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
        {PIPELINE_STEPS.map((step, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <div key={step.status} className="flex items-center">
              {/* Step node */}
              <button
                onClick={() => void handleStepClick(step.status, index)}
                disabled={updating}
                title={step.label}
                className={[
                  'flex flex-col items-center gap-1 px-2 group',
                  'disabled:cursor-default',
                  isCurrent ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                    isPast
                      ? 'bg-[#0d9e75] border-[#0d9e75] text-white'
                      : isCurrent
                      ? 'bg-[#c8a96e] border-[#c8a96e] text-white scale-110'
                      : 'bg-white border-zinc-200 text-zinc-300 group-hover:border-[#c8a96e]',
                  ].join(' ')}
                >
                  {isPast ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className={['w-2 h-2 rounded-full', isCurrent ? 'bg-white' : 'bg-zinc-300'].join(' ')} />
                  )}
                </div>
                <span
                  className={[
                    'text-xs whitespace-nowrap transition-colors',
                    isCurrent ? 'text-[#c8a96e] font-semibold' : isPast ? 'text-[#0d9e75]' : 'text-zinc-400',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-4 flex-shrink-0 -mt-4',
                    index < currentIndex ? 'bg-[#0d9e75]' : 'bg-zinc-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
