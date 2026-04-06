'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillingEntity {
  id: string
  name: string
  iban?: string | null
  is_active: boolean
  is_default: boolean
}

interface Package {
  id: string
  name: string
  price_eur: number
  visa_cost_idr: number | null
  gross_margin_eur: number | null
  max_stay_days: number | null
  validity_label: string | null
  visa_types: { id: string; code: string; name: string } | null
  visa_agents: { id: string; name: string } | null
}

interface BillingRecord {
  id?: string
  case_id: string
  billing_entity_id?: string
  package_id?: string | null
  amount_ht?: number
  discount_percent?: number
  discount_reason?: string
  vat_rate?: number
  amount_ttc?: number
  invoice_number?: string | null
  payment_type?: string
  paid_at?: string | null
  confirmed_by?: string | null
  billing_entities?: BillingEntity
}

interface CaseData {
  id: string
  interns?: { first_name: string; last_name: string } | null
  payment_date?: string | null
}

interface BillingFormProps {
  caseId: string
  caseData?: CaseData
}

function formatEUR(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
}

function generateInvoiceNumber(caseData?: CaseData): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const name = caseData?.interns
    ? `${caseData.interns.first_name} ${caseData.interns.last_name}`
    : 'Stagiaire'
  return `${yy}-${mm}-${dd}_${name}`
}

export function BillingForm({ caseId, caseData }: BillingFormProps) {
  const [entities, setEntities] = useState<BillingEntity[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [billing, setBilling] = useState<BillingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form fields
  const [entityId, setEntityId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [tarifPackage, setTarifPackage] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState('')
  const [paymentType, setPaymentType] = useState('bank_transfer')

  const selectedEntity = entities.find(e => e.id === entityId)
  const selectedPackage = packages.find(p => p.id === packageId)

  // Logique de calcul exacte Airtable:
  // prix_remise = tarif * (1 - remise%)
  // montant_TVA = prix_remise * 0.20
  // montant_final (ce que le client paie, HT) = prix_remise - montant_TVA
  // Le client paie HT. TVA est pour Sunny Interns.
  const prixRemise = tarifPackage * (1 - discount / 100)
  const montantTVA = prixRemise * 0.20
  const montantFinal = prixRemise - montantTVA
  const margebrute = selectedPackage?.visa_cost_idr
    ? montantFinal - (selectedPackage.visa_cost_idr / 15000) // approx IDR→EUR
    : null

  const isPaid = !!(billing?.paid_at)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [entitiesRes, billingRes, packagesRes] = await Promise.all([
        fetch('/api/billing-entities'),
        fetch(`/api/billing/${caseId}`),
        fetch('/api/packages'),
      ])
      const entitiesData: BillingEntity[] = entitiesRes.ok ? await entitiesRes.json() as BillingEntity[] : []
      const billingData: BillingRecord | null = billingRes.ok ? await billingRes.json() as BillingRecord | null : null
      const packagesData: Package[] = packagesRes.ok ? await packagesRes.json() as Package[] : []

      setEntities(entitiesData)
      setPackages(packagesData)
      setBilling(billingData)

      if (billingData) {
        setEntityId(billingData.billing_entity_id ?? '')
        setPackageId(billingData.package_id ?? '')
        setTarifPackage(billingData.amount_ht ?? 0)
        setDiscount(billingData.discount_percent ?? 0)
        setDiscountReason(billingData.discount_reason ?? '')
        setPaymentType(billingData.payment_type ?? 'bank_transfer')
      } else {
        const defaultEntity = entitiesData.find(e => e.is_default)
        if (defaultEntity) setEntityId(defaultEntity.id)
      }
    } catch {
      setError('Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { void loadData() }, [loadData])

  // Quand package change → auto-rempli tarif
  useEffect(() => {
    if (selectedPackage) {
      setTarifPackage(selectedPackage.price_eur)
    }
  }, [packageId, selectedPackage])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/billing/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_entity_id: entityId,
          package_id: packageId || null,
          amount_ht: tarifPackage,
          discount_percent: discount,
          discount_reason: discountReason,
          vat_rate: 20,
          amount_ttc: montantFinal,
          payment_type: paymentType,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const updated = await res.json() as BillingRecord
      setBilling(updated)
      setSuccess('Facturation sauvegardée.')
    } catch {
      setError('Impossible de sauvegarder.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmPayment() {
    if (discount > 0 && !discountReason.trim()) {
      setError('Raison de remise requise.')
      return
    }
    setConfirming(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const invoiceNumber = billing?.invoice_number ?? generateInvoiceNumber(caseData)

      const res = await fetch(`/api/billing/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_entity_id: entityId,
          package_id: packageId || null,
          amount_ht: tarifPackage,
          discount_percent: discount,
          discount_reason: discountReason,
          vat_rate: 20,
          amount_ttc: montantFinal,
          payment_type: paymentType,
          invoice_number: invoiceNumber,
          paid_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const updated = await res.json() as BillingRecord
      setBilling(updated)
      setSuccess(`Paiement confirmé. Facture N° ${invoiceNumber}`)
    } catch {
      setError('Impossible de confirmer le paiement.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {selectedEntity && !selectedEntity.is_active && (
        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="text-[#dc2626] font-bold flex-shrink-0">⚠</span>
          <p className="text-sm text-red-900 font-medium">ATTENTION — {selectedEntity.name} est inactive.</p>
        </div>
      )}

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">{error}</div>}
      {success && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">{success}</div>}

      {/* Statut paiement */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-zinc-500">Statut paiement :</span>
        {isPaid ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-[#0d9e75]">
            ✓ Payé le {new Date(billing!.paid_at!).toLocaleDateString('fr-FR')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-[#d97706]">⏳ En attente</span>
        )}
        {billing?.invoice_number && (
          <span className="text-xs text-zinc-500 font-mono">{billing.invoice_number}</span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4">
        {/* Package */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Package</label>
          <select
            value={packageId}
            onChange={e => setPackageId(e.target.value)}
            disabled={isPaid}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          >
            <option value="">— Sélectionner un package —</option>
            {packages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} — {formatEUR(pkg.price_eur)}
                {pkg.visa_types ? ` · ${pkg.visa_types.code}` : ''}
                {pkg.max_stay_days ? ` · ${pkg.max_stay_days}j max` : ''}
              </option>
            ))}
          </select>
          {selectedPackage && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
              {selectedPackage.visa_types && <span>Visa: <strong className="text-[#1a1918]">{selectedPackage.visa_types.name}</strong></span>}
              {selectedPackage.visa_agents && <span>Agent: <strong className="text-[#1a1918]">{selectedPackage.visa_agents.name}</strong></span>}
              {selectedPackage.validity_label && <span>Validité: <strong className="text-[#1a1918]">{selectedPackage.validity_label}</strong></span>}
              {selectedPackage.gross_margin_eur && <span>Marge brute: <strong className="text-[#0d9e75]">{formatEUR(selectedPackage.gross_margin_eur)}</strong></span>}
            </div>
          )}
        </div>

        {/* Tarif */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Tarif package (€)</label>
          <input
            type="number"
            value={tarifPackage}
            onChange={e => setTarifPackage(parseFloat(e.target.value) || 0)}
            disabled={isPaid}
            min={0} step={0.01}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          />
        </div>

        {/* Remise */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Remise (%)</label>
          <input
            type="number"
            value={discount}
            onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            disabled={isPaid}
            min={0} max={100}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          />
        </div>

        {discount > 0 && (
          <div>
            <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Raison de la remise <span className="text-[#dc2626]">*</span></label>
            <input
              type="text"
              value={discountReason}
              onChange={e => setDiscountReason(e.target.value)}
              disabled={isPaid}
              placeholder="Ex: partenariat école, fidélité client…"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
            />
          </div>
        )}

        {/* Tableau récapitulatif */}
        <div className="border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Tarif</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Remise</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Prix remisé</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">TVA 20%</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-[#1a1918] font-semibold">Montant final (HT)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 text-[#1a1918]">{formatEUR(tarifPackage)}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{discount > 0 ? `-${discount}%` : '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{formatEUR(prixRemise)}</td>
                <td className="px-4 py-3 text-right text-zinc-500">{formatEUR(montantTVA)}</td>
                <td className="px-4 py-3 text-right font-bold text-[#1a1918]">{formatEUR(montantFinal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-500">Le client paie HT. La TVA est récupérée par Sunny Interns.</span>
          {margebrute !== null && (
            <span className="text-xs text-[#0d9e75] font-medium">Marge estimée: {formatEUR(margebrute)}</span>
          )}
        </div>

        {/* Entité légale */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Entité légale</label>
          <select
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            disabled={isPaid}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          >
            <option value="">— Sélectionner —</option>
            {entities.map(entity => (
              <option key={entity.id} value={entity.id}>
                {entity.name}{entity.is_default ? ' (défaut)' : ''}{!entity.is_active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          {selectedEntity?.iban && (
            <p className="mt-1.5 text-xs text-zinc-500 font-mono">IBAN: {selectedEntity.iban}</p>
          )}
        </div>

        {/* Type de paiement */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Type de paiement</label>
          <select
            value={paymentType}
            onChange={e => setPaymentType(e.target.value)}
            disabled={isPaid}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          >
            <option value="bank_transfer">Virement bancaire</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {!isPaid && (
          <>
            <button
              onClick={handleSave}
              disabled={saving || confirming}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-[#1a1918] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button
              onClick={handleConfirmPayment}
              disabled={confirming || saving || !entityId || tarifPackage <= 0}
              className="px-4 py-2 bg-[#0d9e75] hover:bg-[#0b8a65] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? 'Confirmation…' : 'Confirmer le paiement'}
            </button>
          </>
        )}
        {isPaid && (
          <p className="text-sm text-zinc-500 italic">Paiement confirmé — facturation verrouillée.</p>
        )}
      </div>
    </div>
  )
}
