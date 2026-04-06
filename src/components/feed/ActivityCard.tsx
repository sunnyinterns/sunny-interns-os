'use client'

import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import type { ActivityItem, CaseStatus } from '@/lib/types'

interface ActivityCardProps {
  item: ActivityItem
  dimmed?: boolean
  onStatusUpdate?: (itemId: string, newStatus: CaseStatus) => void
}

function getDaysTag(daysUntil: number): { label: string; color: string } {
  if (daysUntil < 0) return { label: `J${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 3) return { label: `J-${daysUntil}`, color: 'text-[#dc2626] bg-red-50' }
  if (daysUntil < 7) return { label: `J-${daysUntil}`, color: 'text-[#d97706] bg-amber-50' }
  if (daysUntil < 30) return { label: `J-${daysUntil}`, color: 'text-yellow-700 bg-yellow-50' }
  return { label: `J-${daysUntil}`, color: 'text-[#0d9e75] bg-emerald-50' }
}

function priorityToVariant(
  priority: ActivityItem['priority']
): 'default' | 'success' | 'attention' | 'critical' | 'info' {
  switch (priority) {
    case 'critical': return 'critical'
    case 'attention': return 'attention'
    case 'completed': return 'success'
    default: return 'default'
  }
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
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const daysTag = item.daysUntil !== undefined ? getDaysTag(item.daysUntil) : null

  const hasFlight = !!(item.metadata?.flight_number)

  async function handleStatusUpdate(newStatus: CaseStatus) {
    // Optimistic update
    onStatusUpdate?.(item.id, newStatus)
    setLoading(true)

    try {
      const res = await fetch(`/api/cases/${item.caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert optimistic update
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
            <Badge label={item.priority} variant={priorityToVariant(item.priority)} />
            <span className="text-xs text-zinc-400">{formatTime(item.createdAt)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {!dimmed && (
          <div className="flex gap-2 flex-wrap">
            {item.status === 'payment_pending' && (
              <Button
                size="sm"
                variant="primary"
                loading={loading}
                onClick={() => handleStatusUpdate('payment_received')}
              >
                Paiement reçu
              </Button>
            )}

            {item.status === 'visa_in_progress' && (
              <Button
                size="sm"
                variant="primary"
                loading={loading}
                onClick={() => handleStatusUpdate('visa_received')}
              >
                Visa reçu
              </Button>
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
