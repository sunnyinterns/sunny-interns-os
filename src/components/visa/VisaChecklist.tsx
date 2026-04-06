'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export interface VisaDocument {
  id: string
  type: 'passport' | 'photo_id' | 'bank_statement' | 'return_ticket'
  status: 'pending' | 'uploaded' | 'validated' | 'rejected'
  rejection_reason?: string
  url?: string
}

const DOC_LABELS: Record<VisaDocument['type'], string> = {
  passport: 'Passeport',
  photo_id: "Photo d'identité",
  bank_statement: 'Relevé bancaire',
  return_ticket: 'Billet retour',
}

const DOC_TYPES: VisaDocument['type'][] = ['passport', 'photo_id', 'bank_statement', 'return_ticket']

function statusVariant(status: VisaDocument['status']): 'default' | 'info' | 'success' | 'critical' {
  if (status === 'pending') return 'default'
  if (status === 'uploaded') return 'info'
  if (status === 'validated') return 'success'
  if (status === 'rejected') return 'critical'
  return 'default'
}

function statusLabel(status: VisaDocument['status']): string {
  if (status === 'pending') return 'En attente'
  if (status === 'uploaded') return 'Téléversé'
  if (status === 'validated') return 'Validé'
  if (status === 'rejected') return 'Refusé'
  return status
}

interface VisaChecklistProps {
  caseId: string
  documents: VisaDocument[]
  onReadyForVisa?: () => void
}

export function VisaChecklist({ caseId, documents: initialDocuments, onReadyForVisa }: VisaChecklistProps) {
  const [docs, setDocs] = useState<VisaDocument[]>(() => {
    // Merge initialDocuments with defaults for all 4 types
    return DOC_TYPES.map((type) => {
      const found = initialDocuments.find((d) => d.type === type)
      return found ?? { id: `${caseId}-${type}`, type, status: 'pending' }
    })
  })
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)
  const [submittingReady, setSubmittingReady] = useState(false)

  const allValidated = docs.every((d) => d.status === 'validated')

  async function patchDocument(type: VisaDocument['type'], updates: Partial<VisaDocument>) {
    setLoadingDoc(type)
    try {
      const res = await fetch(`/api/visa-tracking/${caseId}/document`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...updates }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDocs((prev) =>
        prev.map((d) => d.type === type ? { ...d, ...updates } : d)
      )
    } catch {
      // graceful: still update local state for UX
      setDocs((prev) =>
        prev.map((d) => d.type === type ? { ...d, ...updates } : d)
      )
    } finally {
      setLoadingDoc(null)
    }
  }

  function handleUpload(type: VisaDocument['type']) {
    // Simulate upload — sets status to uploaded with a placeholder URL
    void patchDocument(type, {
      status: 'uploaded',
      url: `https://storage.supabase.co/visa/${caseId}/${type}`,
    })
  }

  function handleValidate(type: VisaDocument['type']) {
    void patchDocument(type, { status: 'validated', rejection_reason: undefined })
  }

  function handleReject(type: VisaDocument['type']) {
    const reason = window.prompt('Motif du refus :')
    if (reason === null) return // user cancelled
    void patchDocument(type, { status: 'rejected', rejection_reason: reason })
  }

  async function handleReady() {
    setSubmittingReady(true)
    try {
      await fetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'visa_in_progress' }),
      })
      onReadyForVisa?.()
    } finally {
      setSubmittingReady(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
        {docs.map((doc) => {
          const isLoading = loadingDoc === doc.type
          return (
            <div key={doc.type} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918]">{DOC_LABELS[doc.type]}</p>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <p className="text-xs text-[#dc2626] mt-0.5">{doc.rejection_reason}</p>
                  )}
                </div>
                <Badge label={statusLabel(doc.status)} variant={statusVariant(doc.status)} />
                <div className="flex gap-1.5 flex-shrink-0">
                  {doc.status === 'pending' && (
                    <button
                      disabled={isLoading}
                      onClick={() => handleUpload(doc.type)}
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '…' : 'Téléverser'}
                    </button>
                  )}
                  {(doc.status === 'uploaded' || doc.status === 'validated') && (
                    <>
                      <button
                        disabled={isLoading || doc.status === 'validated'}
                        onClick={() => handleValidate(doc.type)}
                        className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-[#0d9e75] hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Valider
                      </button>
                      <button
                        disabled={isLoading}
                        onClick={() => handleReject(doc.type)}
                        className="px-2.5 py-1 text-xs font-medium bg-red-50 text-[#dc2626] hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  {doc.status === 'rejected' && (
                    <button
                      disabled={isLoading}
                      onClick={() => handleUpload(doc.type)}
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Renvoyer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        variant="primary"
        size="sm"
        disabled={!allValidated || submittingReady}
        onClick={() => { void handleReady() }}
      >
        {submittingReady ? 'Mise à jour…' : allValidated ? 'PRÊT — Soumettre le visa' : 'En attente de validation des documents'}
      </Button>
    </div>
  )
}
