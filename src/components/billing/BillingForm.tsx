'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillingEntity {
  id: string
  name: string
  iban?: string | null
  bank_name?: string | null
  is_active: boolean
  is_default: boolean
}

interface Package {
  id: string
  name: string
  price_eur: number
  visa_cost_idr: number | null
  package_type?: string | null
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
    ? `${caseData.interns.first_name}${caseData.interns.last_name}`
    : 'Stagiaire'
  return `${yy}-${mm}-${dd}_${name}`
}

// UK entity IBAN hardcodé (Revolut)
const UK_IBAN = 'GB76REVO00996903517949'
const UK_BANK = 'REVOLUT LTD'

export function BillingForm({ caseId, caseData }: BillingFormProps) {
  const [entities, setEntities] = useState<BillingEntity[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [billing, setBilling] = useState<BillingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form fields
  const [entityId, setEntityId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [tarifPackage, setTarifPackage] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState('')
  const [paymentType, setPaymentType] = useState('bank_transfer')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [isPaidCheck, setIsPaidCheck] = useState(false)

  const selectedEntity = entities.find(e => e.id === entityId)
  const selectedPackage = packages.find(p => p.id === packageId)

  // Calculs temps réel
  const remiseMontant = tarifPackage * (discount / 100)
  const prixRemise = tarifPackage - remiseMontant
  const tva = prixRemise * 0.20
  const montantFinal = prixRemise - tva
  const margebrute = selectedPackage?.visa_cost_idr
    ? montantFinal - (selectedPackage.visa_cost_idr / 16500)
    : null

  const isPaid = !!(billing?.paid_at)

  // IBAN effectif: UK entity → hardcodé Revolut, sinon celui de l'entité
  const isUKEntity = selectedEntity?.name?.toLowerCase().includes('uk') || selectedEntity?.name?.toLowerCase().includes('united kingdom')
  const displayIBAN = isUKEntity ? UK_IBAN : (selectedEntity?.iban ?? null)
  const displayBank = isUKEntity ? UK_BANK : (selectedEntity?.bank_name ?? null)

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
        setInvoiceNumber(billingData.invoice_number ?? '')
        setIsPaidCheck(!!(billingData.paid_at))
      } else {
        const defaultEntity = entitiesData.find(e => e.is_default)
        if (defaultEntity) setEntityId(defaultEntity.id)
        setInvoiceNumber(generateInvoiceNumber(caseData))
      }
    } catch {
      setError('Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }, [caseId, caseData])

  useEffect(() => { void loadData() }, [loadData])

  // Quand package change → auto-rempli tarif
  useEffect(() => {
    if (selectedPackage) {
      setTarifPackage(selectedPackage.price_eur)
    }
  }, [packageId, selectedPackage])

  // Quand facture vide et pas encore payé → auto-generate
  useEffect(() => {
    if (!invoiceNumber && caseData) {
      setInvoiceNumber(generateInvoiceNumber(caseData))
    }
  }, [caseData, invoiceNumber])

  async function copyIBAN() {
    if (!displayIBAN) return
    await navigator.clipboard.writeText(displayIBAN)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_amount: montantFinal,
          discount_percentage: discount,
          package_id: packageId || null,
          billing_entity_id: entityId,
          payment_type: paymentType,
          invoice_number: invoiceNumber || null,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      // Also update billing record
      await fetch(`/api/billing/${caseId}`, {
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
          invoice_number: invoiceNumber || null,
        }),
      })
      setSuccess('Facturation sauvegardée.')
    } catch {
      setError('Impossible de sauvegarder.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePaymentToggle(checked: boolean) {
    if (isPaid) return // verrouillé si déjà payé
    setIsPaidCheck(checked)
    if (checked) {
      if (discount > 0 && !discountReason.trim()) {
        setError('Raison de remise requise.')
        setIsPaidCheck(false)
        return
      }
      setConfirming(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const inv = invoiceNumber || generateInvoiceNumber(caseData)
        setInvoiceNumber(inv)

        await fetch(`/api/cases/${caseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'payment_received',
            payment_date: new Date().toISOString().split('T')[0],
          }),
        })

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
            invoice_number: inv,
            paid_at: new Date().toISOString(),
            confirmed_by: user?.id ?? null,
          }),
        })
        if (!res.ok) throw new Error('Erreur serveur')
        const updated = await res.json() as BillingRecord
        setBilling(updated)
        setSuccess(`Paiement confirmé. Facture N° ${inv}`)
      } catch {
        setError('Impossible de confirmer le paiement.')
        setIsPaidCheck(false)
      } finally {
        setConfirming(false)
      }
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
                {pkg.name} — {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(pkg.price_eur)}
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
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Remise (0-30%)</label>
          <input
            type="number"
            value={discount}
            onChange={e => setDiscount(Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))}
            disabled={isPaid}
            min={0} max={30}
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

        {/* Tableau récapitulatif — format lignes */}
        <div className="border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-50">
              <tr className="bg-zinc-50/50">
                <td className="px-4 py-2.5 text-xs text-zinc-500">Tarif</td>
                <td className="px-4 py-2.5 text-right text-sm text-[#1a1918]">{formatEUR(tarifPackage)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-xs text-zinc-500">Remise {discount > 0 ? `${discount}%` : ''}</td>
                <td className="px-4 py-2.5 text-right text-sm text-red-500">{discount > 0 ? `-${formatEUR(remiseMontant)}` : '—'}</td>
              </tr>
              <tr className="bg-zinc-50/50">
                <td className="px-4 py-2.5 text-xs text-zinc-500">Prix remisé</td>
                <td className="px-4 py-2.5 text-right text-sm text-[#1a1918]">{formatEUR(prixRemise)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-xs text-zinc-500">TVA 20%</td>
                <td className="px-4 py-2.5 text-right text-sm text-red-500">-{formatEUR(tva)}</td>
              </tr>
              <tr className="bg-[#c8a96e]/5">
                <td className="px-4 py-3 text-sm font-semibold text-[#1a1918]">Montant à régler (HT)</td>
                <td className="px-4 py-3 text-right text-base font-bold text-[#1a1918]">{formatEUR(montantFinal)}</td>
              </tr>
              {margebrute !== null && (
                <tr className="bg-green-50/50">
                  <td className="px-4 py-2.5 text-xs text-zinc-500">Marge brute estimée</td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-[#0d9e75]">{formatEUR(margebrute)}</td>
                </tr>
              )}
            </tbody>
          </table>
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

          {/* Bloc IBAN */}
          {displayIBAN && (
            <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              {displayBank && <p className="text-xs text-zinc-500 mb-1">Banque: <strong className="text-[#1a1918]">{displayBank}</strong></p>}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono text-[#1a1918] select-all">{displayIBAN}</p>
                <button
                  type="button"
                  onClick={copyIBAN}
                  className="text-xs px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors flex-shrink-0"
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>
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

        {/* Numéro facture */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">Numéro de facture</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={e => setInvoiceNumber(e.target.value)}
            disabled={isPaid}
            placeholder={generateInvoiceNumber(caseData)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-400">Format auto: {generateInvoiceNumber(caseData)}</p>
        </div>

        {/* Toggle paiement reçu */}
        <div className={['flex items-center gap-3 p-3 rounded-xl border', isPaid ? 'bg-green-50 border-green-200' : 'bg-white border-zinc-200'].join(' ')}>
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <div className="relative">
              <input
                type="checkbox"
                checked={isPaidCheck || isPaid}
                onChange={e => void handlePaymentToggle(e.target.checked)}
                disabled={isPaid || confirming}
                className="sr-only"
              />
              <div
                className={[
                  'w-10 h-6 rounded-full transition-colors',
                  (isPaidCheck || isPaid) ? 'bg-[#0d9e75]' : 'bg-zinc-200',
                  (isPaid || confirming) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                ].join(' ')}
                onClick={() => !isPaid && !confirming && void handlePaymentToggle(!isPaidCheck)}
              >
                <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', (isPaidCheck || isPaid) ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1a1918]">Paiement reçu</p>
              {isPaid && billing?.paid_at && (
                <p className="text-xs text-[#0d9e75]">Confirmé le {new Date(billing.paid_at).toLocaleDateString('fr-FR')}</p>
              )}
              {confirming && <p className="text-xs text-zinc-400">Confirmation en cours…</p>}
            </div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {!isPaid && (
          <button
            onClick={handleSave}
            disabled={saving || confirming}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8945a] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        )}
        {isPaid && (
          <p className="text-sm text-zinc-500 italic">Paiement confirmé — facturation verrouillée.</p>
        )}
      </div>
    </div>
  )
}
