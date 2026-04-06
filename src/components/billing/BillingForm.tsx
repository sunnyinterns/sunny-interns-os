'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillingEntity {
  id: string
  name: string
  is_active: boolean
  is_default: boolean
}

interface BillingRecord {
  id?: string
  case_id: string
  billing_entity_id?: string
  amount_ht?: number
  discount_percent?: number
  discount_reason?: string
  vat_rate?: number
  amount_ttc?: number
  paid_at?: string | null
  confirmed_by?: string | null
  billing_entities?: BillingEntity
}

interface BillingFormProps {
  caseId: string
}

export function BillingForm({ caseId }: BillingFormProps) {
  const [entities, setEntities] = useState<BillingEntity[]>([])
  const [billing, setBilling] = useState<BillingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form fields
  const [entityId, setEntityId] = useState('')
  const [amountHT, setAmountHT] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState('')
  const [vat, setVat] = useState<number>(20)

  const selectedEntity = entities.find((e) => e.id === entityId)
  const totalTTC = amountHT * (1 - discount / 100) * (1 + vat / 100)
  const isPaid = !!(billing?.paid_at)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [entitiesRes, billingRes] = await Promise.all([
        fetch('/api/billing-entities'),
        fetch(`/api/billing/${caseId}`),
      ])
      const entitiesData: BillingEntity[] = entitiesRes.ok ? await entitiesRes.json() as BillingEntity[] : []
      const billingData: BillingRecord | null = billingRes.ok ? await billingRes.json() as BillingRecord | null : null

      setEntities(entitiesData)
      setBilling(billingData)

      if (billingData) {
        setEntityId(billingData.billing_entity_id ?? '')
        setAmountHT(billingData.amount_ht ?? 0)
        setDiscount(billingData.discount_percent ?? 0)
        setDiscountReason(billingData.discount_reason ?? '')
        setVat(billingData.vat_rate ?? 20)
      } else {
        // Pre-select default entity
        const defaultEntity = entitiesData.find((e) => e.is_default)
        if (defaultEntity) setEntityId(defaultEntity.id)
      }
    } catch {
      setError('Erreur lors du chargement des données.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
          amount_ht: amountHT,
          discount_percent: discount,
          discount_reason: discountReason,
          vat_rate: vat,
          amount_ttc: totalTTC,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const updated = await res.json() as BillingRecord
      setBilling(updated)
      setSuccess('Facturation sauvegardée.')
    } catch {
      setError('Impossible de sauvegarder la facturation.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmPayment() {
    setConfirming(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch(`/api/billing/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_entity_id: entityId,
          amount_ht: amountHT,
          discount_percent: discount,
          discount_reason: discountReason,
          vat_rate: vat,
          amount_ttc: totalTTC,
          paid_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const updated = await res.json() as BillingRecord
      setBilling(updated)
      console.log('[PDF] Generating invoice for case', caseId)
      setSuccess('Paiement confirmé. Génération de la facture en cours…')
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
      {/* Abundance Guild alert */}
      {selectedEntity && !selectedEntity.is_active && (
        <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="text-[#dc2626] font-bold flex-shrink-0">⚠</span>
          <p className="text-sm text-red-900 font-medium">
            ATTENTION — {selectedEntity.name} est inactive. Vérifiez l'entité avant de procéder.
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
          {success}
        </div>
      )}

      {/* Statut paiement */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">Statut paiement :</span>
        {isPaid ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-[#0d9e75]">
            ✓ Payé le {new Date(billing!.paid_at!).toLocaleDateString('fr-FR')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-[#d97706]">
            ⏳ En attente
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4">
        {/* Entité légale */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
            Entité légale
          </label>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            disabled={isPaid}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">— Sélectionner une entité —</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}{!entity.is_active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Montant HT */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
            Montant HT (€)
          </label>
          <input
            type="number"
            value={amountHT}
            onChange={(e) => setAmountHT(parseFloat(e.target.value) || 0)}
            disabled={isPaid}
            min={0}
            step={0.01}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Remise */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
            Remise (%)
          </label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            disabled={isPaid}
            min={0}
            max={100}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Raison de la remise */}
        {discount > 0 && (
          <div>
            <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
              Raison de la remise <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="text"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              disabled={isPaid}
              placeholder="Ex: partenariat école, fidélité client…"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}

        {/* TVA */}
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
            TVA (%)
          </label>
          <input
            type="number"
            value={vat}
            onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
            disabled={isPaid}
            min={0}
            max={100}
            step={0.5}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Total TTC */}
        <div className="pt-2 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Total TTC</span>
            <span className="text-2xl font-bold text-[#1a1918]">
              {totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
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
              disabled={confirming || saving || !entityId || amountHT <= 0 || (discount > 0 && !discountReason.trim())}
              className="px-4 py-2 bg-[#0d9e75] hover:bg-[#0b8a65] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? 'Confirmation…' : 'Confirmer le paiement'}
            </button>
          </>
        )}
        {isPaid && (
          <p className="text-sm text-zinc-500 italic">
            Paiement confirmé — facturation verrouillée.
          </p>
        )}
      </div>
    </div>
  )
}
