'use client'

interface TabFacturationProps {
  caseData: {
    status?: string | null
    payment_amount?: number | null
    payment_date?: string | null
    invoice_sent_at?: string | null
    iban?: string | null
    legal_entity?: string | null
    metadata?: Record<string, unknown>
  }
}

function InfoRow({ label, value, critical }: { label: string; value?: string | null; critical?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-50 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={['text-sm font-medium', critical ? 'text-[#dc2626]' : 'text-[#1a1918]'].join(' ')}>
        {value || '—'}
      </span>
    </div>
  )
}

export function TabFacturation({ caseData }: TabFacturationProps) {
  const isPending = caseData.status === 'payment_pending'
  const isReceived = [
    'payment_received', 'visa_in_progress', 'visa_received',
    'arrival_prep', 'active', 'alumni', 'completed',
  ].includes(caseData.status ?? '')

  const meta = caseData.metadata ?? {}
  const isAbundanceGuild = !!(meta.is_abundance_guild)

  return (
    <div className="space-y-4">
      {isAbundanceGuild && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-[#dc2626] flex-shrink-0">!</span>
          <p className="text-sm text-red-900 font-medium">
            PT THE ABUNDANCE GUILD — Entité inactive. Vérifier la facturation.
          </p>
        </div>
      )}

      {isPending && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[#d97706] flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-900">Paiement en attente — facture à envoyer après réception.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-100 px-4">
        <InfoRow
          label="Statut paiement"
          value={isPending ? 'En attente' : isReceived ? 'Reçu' : 'Non défini'}
          critical={isPending}
        />
        <InfoRow
          label="Montant"
          value={caseData.payment_amount != null ? `${caseData.payment_amount} €` : null}
        />
        <InfoRow
          label="Date de paiement"
          value={caseData.payment_date ? new Date(caseData.payment_date).toLocaleDateString('fr-FR') : null}
        />
        <InfoRow
          label="Facture envoyée le"
          value={caseData.invoice_sent_at ? new Date(caseData.invoice_sent_at).toLocaleDateString('fr-FR') : null}
        />
        <InfoRow label="IBAN" value={caseData.iban} />
        <InfoRow label="Entité légale" value={caseData.legal_entity ?? 'UK (défaut)'} />
      </div>
    </div>
  )
}
