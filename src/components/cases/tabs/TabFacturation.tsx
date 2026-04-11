'use client'

import { useState } from 'react'
import { BillingForm } from '@/components/billing/BillingForm'

interface TabFacturationProps {
  caseId: string
  caseData?: {
    id: string
    status?: string
    payment_amount?: number | null
    invoice_number?: string | null
    interns?: { first_name: string; last_name: string } | null
  }
}

export function TabFacturation({ caseId, caseData }: TabFacturationProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = caseData?.status ?? ''
  const canSendPaymentEmail =
    status === 'job_retained' || status === 'convention_signed' || status === 'payment_pending'

  async function sendPaymentEmail() {
    setSending(true)
    setError(null)
    try {
      const r = await fetch(`/api/cases/${caseId}/send-payment-email`, { method: 'POST' })
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Envoi impossible')
      }
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {canSendPaymentEmail && (
        <div className="bg-[#fef9ee] border border-[#fde68a] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-[#92400e]">Envoyer les infos de paiement au candidat</p>
            <p className="text-xs text-[#a16207] mt-0.5">
              Envoie un email avec le montant, la référence facture, et l&apos;IBAN — passe le dossier en statut &quot;paiement en attente&quot;.
            </p>
            {error && <p className="text-xs text-[#dc2626] mt-1">{error}</p>}
          </div>
          <button
            onClick={() => { void sendPaymentEmail() }}
            disabled={sending || sent}
            className="px-4 py-2 text-sm font-semibold bg-[#0d9e75] text-white rounded-lg hover:bg-[#0a8a65] transition-colors disabled:opacity-60"
          >
            {sending ? 'Envoi…' : sent ? '✓ Envoyé' : '📧 Envoyer'}
          </button>
        </div>
      )}

      <BillingForm caseId={caseId} caseData={caseData} />
    </div>
  )
}
