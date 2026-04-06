'use client'

import { useState } from 'react'
import { ProcessTimeline } from '@/components/cases/ProcessTimeline'
import { Button } from '@/components/ui/Button'
import type { CaseStatus } from '@/lib/types'

interface ActivityEntry {
  id: string
  action_type: string
  description: string
  created_at: string
}

interface TabProcessProps {
  caseId: string
  status: CaseStatus
  activityFeed: ActivityEntry[]
  isVisaOnly?: boolean
}

export function TabProcess({ caseId, status: initialStatus, activityFeed, isVisaOnly }: TabProcessProps) {
  const [status, setStatus] = useState<CaseStatus>(initialStatus)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleDownloadEngagementLetter() {
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/engagement-letter`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lettre-engagement.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('PDF generation error:', e)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">Étapes du dossier</h3>
        <Button
          variant="secondary"
          size="sm"
          loading={pdfLoading}
          onClick={() => { void handleDownloadEngagementLetter() }}
        >
          Lettre d&apos;engagement
        </Button>
      </div>
      <div>
        <ProcessTimeline caseId={caseId} currentStatus={status} onStatusChange={setStatus} isVisaOnly={isVisaOnly} />
      </div>

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
