'use client'

import { useEffect, useState } from 'react'
import { VisaChecklist } from '@/components/visa/VisaChecklist'
import type { VisaDocument } from '@/components/visa/VisaChecklist'

interface TabVisaProps {
  caseData: {
    id: string
    visa_submitted_at?: string | null
    visa_received_at?: string | null
    visa_type?: string | null
    metadata?: Record<string, unknown>
  }
  onStatusChange?: () => void
}

export function TabVisa({ caseData, onStatusChange }: TabVisaProps) {
  const [documents, setDocuments] = useState<VisaDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  useEffect(() => {
    fetch(`/api/visa-tracking/${caseData.id}`)
      .then((res) => res.ok ? res.json() as Promise<VisaDocument[]> : Promise.resolve([]))
      .then((data) => { setDocuments(data); setLoadingDocs(false) })
      .catch(() => { setDocuments([]); setLoadingDocs(false) })
  }, [caseData.id])

  const done = documents.filter((d) => d.status === 'validated').length
  const total = 4 // always 4 docs

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="px-4 py-3 bg-white rounded-xl border border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#1a1918]">Documents validés</span>
          <span className="text-sm text-zinc-500">{done}/{total}</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0d9e75] rounded-full transition-all"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      {loadingDocs ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl" />)}
        </div>
      ) : (
        <VisaChecklist
          caseId={caseData.id}
          documents={documents}
          onReadyForVisa={onStatusChange}
        />
      )}

      {/* Visa dates */}
      {(caseData.visa_submitted_at || caseData.visa_received_at) && (
        <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
          {caseData.visa_submitted_at && (
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-zinc-500">Soumis le</span>
              <span className="text-sm font-medium text-[#1a1918]">
                {new Date(caseData.visa_submitted_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          {caseData.visa_received_at && (
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-zinc-500">Reçu le</span>
              <span className="text-sm font-medium text-[#1a1918]">
                {new Date(caseData.visa_received_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
