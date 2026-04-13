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

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  case_created: { icon: '🌴', color: '#c8a96e', label: 'Création' },
  rdv_booked: { icon: '📅', color: '#1a73e8', label: 'RDV' },
  status_changed: { icon: '🔄', color: '#8b5cf6', label: 'Statut' },
  job_proposed: { icon: '💼', color: '#0d9e75', label: 'Job proposé' },
  job_sent_employer: { icon: '📧', color: '#1a73e8', label: 'Envoyé employeur' },
  job_retained: { icon: '🤝', color: '#0d9e75', label: 'Job retenu' },
  cv_feedback: { icon: '📄', color: '#c8a96e', label: 'Retour CV' },
  cv_status_changed: { icon: '📄', color: '#8b5cf6', label: 'Statut CV' },
  payment_received: { icon: '💳', color: '#0d9e75', label: 'Paiement' },
  visa_docs_sent: { icon: '🛂', color: '#8b5cf6', label: 'Visa' },
  note_added: { icon: '💬', color: '#6b7280', label: 'Note' },
  email_sent: { icon: '📧', color: '#1a73e8', label: 'Email' },
  qualification_email_sent: { icon: '📧', color: '#1a73e8', label: 'Email qualif' },
  lead_captured: { icon: '📋', color: '#f59e0b', label: 'Lead' },
  lead_converted: { icon: '✅', color: '#0d9e75', label: 'Conversion' },
  intern_comment: { icon: '💬', color: '#8b5cf6', label: 'Commentaire' },
  intern_interest: { icon: '🎯', color: '#0d9e75', label: 'Intérêt' },
  field_edited: { icon: '✏️', color: '#6b7280', label: 'Modification' },
  default: { icon: '⚡', color: '#6b7280', label: 'Autre' },
}

const FILTER_TYPES = [
  { key: 'all', label: 'Tous' },
  { key: 'status', label: '🔄 Statuts', types: ['status_changed', 'rdv_booked', 'case_created'] },
  { key: 'email', label: '📧 Emails', types: ['email_sent', 'job_sent_employer', 'qualification_email_sent'] },
  { key: 'job', label: '💼 Jobs', types: ['job_proposed', 'job_sent_employer', 'job_retained'] },
  { key: 'cv', label: '📄 CV', types: ['cv_feedback', 'cv_status_changed'] },
]

interface Props {
  caseId: string
}

export function TabHistorique({ caseId }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

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

  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter(item => {
        const filterDef = FILTER_TYPES.find(f => f.key === activeFilter)
        return filterDef?.types?.includes(item.type) ?? false
      })

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

      {/* Filtres */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_TYPES.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-[#c8a96e] text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {/* Ligne verticale */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-zinc-100" />

        <div className="space-y-4">
          {filteredItems.map(item => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.default
            const meta = item.metadata ?? {}

            // Détails enrichis selon le type
            let detail: string | null = null
            if (item.type === 'job_proposed' || item.type === 'job_retained') {
              const jobTitle = meta.job_title as string | undefined
              const company = meta.company_name as string | undefined
              if (jobTitle || company) {
                detail = [jobTitle, company].filter(Boolean).join(' — ')
              }
            } else if (item.type === 'email_sent' || item.type === 'qualification_email_sent' || item.type === 'job_sent_employer') {
              const subject = meta.subject as string | undefined
              if (subject) detail = subject
            } else if (item.type === 'status_changed') {
              const from = meta.from_status as string | undefined
              const to = meta.to_status as string | undefined
              if (from && to) detail = `${from} → ${to}`
            }

            return (
              <div key={item.id} className="flex items-start gap-4 relative">
                {/* Icone sur la timeline */}
                <div
                  className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center flex-shrink-0 z-10 text-base"
                  style={{ borderColor: cfg.color }}
                >
                  {cfg.icon}
                </div>
                {/* Contenu */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#1a1918]">{item.title}</p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                  )}
                  {detail && (
                    <p className="text-xs text-zinc-400 mt-0.5 italic">{detail}</p>
                  )}
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })} à {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="py-8 text-center text-sm text-zinc-400">
            {activeFilter === 'all'
              ? 'Aucune action enregistrée pour ce dossier.'
              : 'Aucun événement de ce type.'}
          </div>
        )}
      </div>
    </div>
  )
}
