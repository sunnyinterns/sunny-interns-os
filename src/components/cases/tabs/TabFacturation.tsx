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
    package_id?: string | null
    interns?: { first_name: string; last_name: string } | null
    billing_companies?: { id: string; name: string; legal_form: string | null; currency: string; bank_iban: string | null; stripe_link: string | null } | null
    billing_company_id?: string | null
  }
  referred_by_code?: string | null
}

export function TabFacturation({ caseId, caseData, referred_by_code }: TabFacturationProps) {
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

      {/* Société facturante */}
      {caseData?.billing_companies && (
        <div className="bg-white border border-zinc-100 rounded-xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Société facturante</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1a1918]">{caseData.billing_companies.name}</p>
              <p className="text-xs text-zinc-400">{caseData.billing_companies.legal_form} · {caseData.billing_companies.currency}</p>
              {caseData.billing_companies.bank_iban && (
                <p className="text-xs font-mono text-zinc-400 mt-0.5">{caseData.billing_companies.bank_iban}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {caseData.billing_companies.stripe_link && (
                <a href={caseData.billing_companies.stripe_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 bg-[#635BFF]/10 text-[#635BFF] rounded-xl font-medium hover:bg-[#635BFF]/20">
                  ⚡ Stripe
                </a>
              )}
              <a href="/fr/settings/billing-companies" className="text-xs text-zinc-400 hover:text-[#c8a96e] block mt-1">Modifier →</a>
            </div>
          </div>
        </div>
      )}

      {referred_by_code && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-base">🎁</span>
          <div>
            <p className="text-xs font-semibold text-amber-700">Code ambassadeur</p>
            <p className="text-sm font-mono text-amber-800">{referred_by_code}</p>
            <p className="text-xs text-amber-600 mt-0.5">Vérifier si une remise s&apos;applique</p>
          </div>
        </div>
      )}
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

      <BillingForm 
        caseId={caseId} 
        caseData={caseData} 
        defaultPackageId={caseData?.package_id}
        defaultBillingCompanyId={caseData?.billing_company_id ?? caseData?.billing_companies?.id}
      />
    </div>
  )
}
