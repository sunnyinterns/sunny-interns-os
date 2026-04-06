'use client'

import { useState } from 'react'
import { ProcessTimeline } from '@/components/cases/ProcessTimeline'
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
}

export function TabProcess({ caseId, status: initialStatus, activityFeed }: TabProcessProps) {
  const [status, setStatus] = useState<CaseStatus>(initialStatus)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Étapes du dossier</h3>
        <ProcessTimeline caseId={caseId} currentStatus={status} onStatusChange={setStatus} />
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
