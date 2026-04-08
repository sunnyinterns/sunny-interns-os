'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import type { ActivityItem, CaseStatus } from '@/lib/types'

interface ActivityCardProps {
  item: ActivityItem
  dimmed?: boolean
  onStatusUpdate?: (itemId: string, newStatus: CaseStatus) => void
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  lead: { label: 'Demande', bg: '#f4f4f5', text: '#71717a' },
  rdv_booked: { label: 'RDV Booké', bg: '#dbeafe', text: '#1d4ed8' },
  qualification_done: { label: 'Qualif OK', bg: '#ede9fe', text: '#6d28d9' },
  job_submitted: { label: 'Jobs proposés', bg: '#fef3c7', text: '#d97706' },
  job_retained: { label: 'Job retenu', bg: '#d1fae5', text: '#059669' },
  convention_signed: { label: 'Convention', bg: '#dcfce7', text: '#16a34a' },
  payment_pending: { label: 'Paiement ⏳', bg: '#fee2e2', text: '#dc2626' },
  payment_received: { label: 'Payé ✓', bg: '#d1fae5', text: '#059669' },
  visa_docs_sent: { label: 'Docs visa', bg: '#fef3c7', text: '#d97706' },
  visa_submitted: { label: 'Visa soumis', bg: '#dbeafe', text: '#1d4ed8' },
  visa_in_progress: { label: 'Visa en cours', bg: '#dbeafe', text: '#1d4ed8' },
  visa_received: { label: 'Visa ✓', bg: '#d1fae5', text: '#059669' },
  arrival_prep: { label: '🛫 Départ imminent', bg: '#fee2e2', text: '#dc2626' },
  active: { label: '🌴 En stage', bg: '#d1fae5', text: '#059669' },
  alumni: { label: 'Alumni', bg: '#fef3c7', text: '#92400e' },
}

function getDaysTag(daysUntil: number): { label: string; color: string } {
  if (daysUntil < 0) return { label: `J${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 3) return { label: `J-${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 7) return { label: `J-${daysUntil}`, color: 'text-[#d97706] bg-amber-50' }
  if (daysUntil < 30) return { label: `J-${daysUntil}`, color: 'text-yellow-700 bg-yellow-50' }
  return { label: `J-${daysUntil}`, color: 'text-[#0d9e75] bg-emerald-50' }
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function buildWhatsAppUrl(item: ActivityItem): string {
  const meta = item.metadata ?? {}
  const flightNumber = String(meta.flight_number ?? '')
  const arrivalDatetime = String(meta.flight_arrival_datetime ?? '')
  const dropoffAddress = String(meta.dropoff_address ?? '')

  const message = [
    `Bonjour [chauffeur],`,
    `Stagiaire : ${item.internName}`,
    `Vol : ${flightNumber}`,
    `Arrivée à : ${arrivalDatetime}`,
    `Déposer à : ${dropoffAddress}`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function ActivityCard({ item, dimmed = false, onStatusUpdate }: ActivityCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const NO_DAYS_TAG_STATUSES = ['not_interested', 'no_job_found', 'lost', 'alumni', 'not_qualified', 'on_hold', 'suspended', 'visa_refused', 'archived', 'completed']
  const daysTag = item.daysUntil !== undefined && !NO_DAYS_TAG_STATUSES.includes(item.status) ? getDaysTag(item.daysUntil) : null
  const hasFlight = !!(item.metadata?.flight_number)
  const badge = STATUS_BADGE[item.status]
  const googleMeetLink = item.metadata?.google_meet_link as string | undefined

  async function handleStatusUpdate(newStatus: CaseStatus) {
    onStatusUpdate?.(item.id, newStatus)
    setLoading(true)

    try {
      const res = await fetch(`/api/cases/${item.caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        onStatusUpdate?.(item.id, item.status)
        setToast({ message: 'Erreur lors de la mise à jour du statut', type: 'error' })
      } else {
        setToast({ message: 'Statut mis à jour', type: 'success' })
      }
    } catch {
      onStatusUpdate?.(item.id, item.status)
      setToast({ message: 'Erreur réseau', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function goToCase() {
    if (item.caseId && item.caseId !== 'demo') {
      router.push(`/fr/cases/${item.caseId}?tab=process`)
    }
  }

  return (
    <>
      <div
        className={[
          'flex flex-col gap-3 p-3 bg-white rounded-xl border border-zinc-100',
          'hover:shadow-sm transition-shadow',
          dimmed ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar name={item.internName} src={item.internAvatar} size="md" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#1a1918]">{item.internName}</span>
              {badge && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>
              )}
              {daysTag && (
                <span
                  className={[
                    'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold',
                    daysTag.color,
                  ].join(' ')}
                >
                  {daysTag.label}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-xs text-zinc-400">{formatTime(item.createdAt)}</span>
          </div>
        </div>

        {/* Quick action buttons per status */}
        {!dimmed && (
          <div className="flex gap-2 flex-wrap">
            {item.status === 'lead' && (
              <>
                <Button size="sm" variant="primary" loading={loading} onClick={() => handleStatusUpdate('rdv_booked')}>
                  \ud83d\udcde Booker RDV
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'rdv_booked' && (
              <>
                <Button size="sm" variant="primary" loading={loading} onClick={() => handleStatusUpdate('qualification_done')}>
                  \u2705 Qualif faite
                </Button>
                {googleMeetLink && (
                  <Button size="sm" variant="secondary" onClick={() => window.open(googleMeetLink, '_blank')}>
                    \ud83d\udd17 Meet
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'qualification_done' && (
              <>
                <Button size="sm" variant="primary" onClick={goToCase}>
                  \u2795 Proposer job
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'payment_pending' && (
              <>
                <Button size="sm" variant="primary" loading={loading} onClick={() => handleStatusUpdate('payment_received')}>
                  \ud83d\udcb3 Paiement reçu
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'visa_docs_sent' && (
              <>
                <Button size="sm" variant="primary" onClick={goToCase}>
                  \ud83d\udea9 Envoyer FAZZA
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'visa_in_progress' && (
              <>
                <Button size="sm" variant="primary" loading={loading} onClick={() => handleStatusUpdate('visa_received')}>
                  Visa reçu
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {item.status === 'arrival_prep' && (
              <>
                <Button size="sm" variant="primary" loading={loading} onClick={() => handleStatusUpdate('active')}>
                  \u2705 Chauffeur OK
                </Button>
                <Button size="sm" variant="secondary" onClick={goToCase}>
                  \u2192 Voir dossier
                </Button>
              </>
            )}

            {hasFlight && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(buildWhatsAppUrl(item), '_blank')}
              >
                WhatsApp Chauffeur
              </Button>
            )}

            {/* Default: just "Voir dossier" for statuses not covered above */}
            {!['lead', 'rdv_booked', 'qualification_done', 'payment_pending', 'visa_docs_sent', 'visa_in_progress', 'arrival_prep'].includes(item.status) && (
              <Button size="sm" variant="secondary" onClick={goToCase}>
                \u2192 Voir dossier
              </Button>
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
