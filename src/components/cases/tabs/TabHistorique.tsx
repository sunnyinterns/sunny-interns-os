'use client'

import { useEffect, useState, useCallback } from 'react'

interface HistoryItem {
  id: string
  type: string
  title: string
  description?: string | null
  created_at: string
  metadata?: Record<string, unknown>
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  case_created: { icon: '🌴', color: '#c8a96e' },
  rdv_booked: { icon: '📅', color: '#1a73e8' },
  status_changed: { icon: '🔄', color: '#8b5cf6' },
  job_proposed: { icon: '💼', color: '#0d9e75' },
  job_sent_employer: { icon: '📧', color: '#1a73e8' },
  job_retained: { icon: '🤝', color: '#0d9e75' },
  cv_feedback: { icon: '📄', color: '#c8a96e' },
  cv_status_changed: { icon: '📄', color: '#8b5cf6' },
  payment_received: { icon: '💳', color: '#0d9e75' },
  visa_docs_sent: { icon: '🛂', color: '#8b5cf6' },
  note_added: { icon: '💬', color: '#6b7280' },
  email_sent: { icon: '📧', color: '#1a73e8' },
  lead_captured: { icon: '📋', color: '#f59e0b' },
  lead_converted: { icon: '✅', color: '#0d9e75' },
  intern_comment: { icon: '💬', color: '#8b5cf6' },
  intern_interest: { icon: '🎯', color: '#0d9e75' },
  default: { icon: '⚡', color: '#6b7280' },
}

interface Props {
  caseId: string
}

export function TabHistorique({ caseId }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/activity`)
      if (!res.ok) throw new Error()
      const data = await res.json() as HistoryItem[]
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-[#1a1918] mb-4">Historique du dossier</h2>

      <div className="relative">
        {/* Ligne verticale */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-zinc-100" />

        <div className="space-y-4">
          {items.map(item => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.default
            return (
              <div key={item.id} className="flex items-start gap-4 relative">
                {/* Icône sur la timeline */}
                <div
                  className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center flex-shrink-0 z-10 text-base"
                  style={{ borderColor: cfg.color }}
                >
                  {cfg.icon}
                </div>
                {/* Contenu */}
                <div className="flex-1 pb-2">
                  <p className="text-sm font-semibold text-[#1a1918]">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {items.length === 0 && !loading && (
          <div className="py-8 text-center text-sm text-zinc-400">
            Aucune action enregistrée pour ce dossier.
          </div>
        )}
      </div>
    </div>
  )
}
