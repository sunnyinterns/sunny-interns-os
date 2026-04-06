'use client'

import { useEffect, useState } from 'react'

interface Partner {
  id: string
  name: string
  logo_url: string | null
  offer_short: string | null
  partner_type: 'pre_arrival' | 'on_site'
  category: string | null
  destination_id: string | null
  is_active: boolean
}

const inputClass =
  'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

function PartnerRow({
  partner,
  onToggle,
  onEdit,
}: {
  partner: Partner
  onToggle: (id: string, active: boolean) => void
  onEdit: (partner: Partner) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-100 last:border-0">
      {partner.logo_url ? (
        <img src={partner.logo_url} alt={partner.name} className="w-8 h-8 rounded object-contain" />
      ) : (
        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
          {partner.name[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1918] truncate">{partner.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={[
              'text-xs px-1.5 py-0.5 rounded font-medium',
              partner.partner_type === 'pre_arrival'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700',
            ].join(' ')}
          >
            {partner.partner_type === 'pre_arrival' ? 'Pré-arrivée' : 'Sur place'}
          </span>
          {partner.category && (
            <span className="text-xs text-zinc-400">{partner.category}</span>
          )}
        </div>
        {partner.offer_short && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{partner.offer_short}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(partner)}
          className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Modifier
        </button>
        <button
          onClick={() => onToggle(partner.id, !partner.is_active)}
          className={[
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            partner.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
              partner.is_active ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}

function PartnerModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partner | null
  onSave: (data: Partial<Partner>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '')
  const [offerShort, setOfferShort] = useState(initial?.offer_short ?? '')
  const [partnerType, setPartnerType] = useState<'pre_arrival' | 'on_site'>(initial?.partner_type ?? 'on_site')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [destinationId, setDestinationId] = useState(initial?.destination_id ?? 'bali')

  function handleSave() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      offer_short: offerShort.trim() || null,
      partner_type: partnerType,
      category: category.trim() || null,
      destination_id: destinationId || 'bali',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">
            {initial ? 'Modifier le partenaire' : 'Nouveau partenaire'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Nom *</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">URL Logo</label>
            <input className={inputClass} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Offre courte</label>
            <input className={inputClass} value={offerShort} onChange={(e) => setOfferShort(e.target.value)} placeholder="Ex: -10% sur les hébergements" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Type</label>
              <select
                className={inputClass}
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value as 'pre_arrival' | 'on_site')}
              >
                <option value="pre_arrival">Pré-arrivée</option>
                <option value="on_site">Sur place</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Destination</label>
              <select
                className={inputClass}
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              >
                <option value="bali">Bali</option>
                <option value="bangkok">Bangkok</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Catégorie</label>
            <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Transport, Hébergement, Loisirs" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
          >
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pre_arrival' | 'on_site'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)

  async function fetchPartners() {
    setLoading(true)
    try {
      const res = await fetch('/api/partners?destination=all')
      if (!res.ok) throw new Error()
      const data = await res.json() as Partner[]
      setPartners(data)
    } catch {
      setPartners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchPartners() }, [])

  async function handleToggle(id: string, isActive: boolean) {
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, is_active: isActive } : p))
    await fetch(`/api/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
  }

  async function handleSave(data: Partial<Partner>) {
    if (editingPartner) {
      await fetch(`/api/partners/${editingPartner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowModal(false)
    setEditingPartner(null)
    void fetchPartners()
  }

  const filtered = partners.filter((p) => filter === 'all' || p.partner_type === filter)
  const preArrivalCount = partners.filter((p) => p.partner_type === 'pre_arrival').length
  const onSiteCount = partners.filter((p) => p.partner_type === 'on_site').length

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Partenaires</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {preArrivalCount} pré-arrivée · {onSiteCount} sur place
            </p>
          </div>
          <button
            onClick={() => { setEditingPartner(null); setShowModal(true) }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors"
          >
            + Nouveau partenaire
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-100 rounded-xl p-1 w-fit">
          {(['all', 'pre_arrival', 'on_site'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter === f ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {f === 'all' ? 'Tous' : f === 'pre_arrival' ? 'Pré-arrivée' : 'Sur place'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">Aucun partenaire</p>
              <button
                onClick={() => { setEditingPartner(null); setShowModal(true) }}
                className="mt-3 text-sm text-[#c8a96e] hover:underline"
              >
                Ajouter le premier partenaire
              </button>
            </div>
          ) : (
            filtered.map((partner) => (
              <PartnerRow
                key={partner.id}
                partner={partner}
                onToggle={(id, active) => void handleToggle(id, active)}
                onEdit={(p) => { setEditingPartner(p); setShowModal(true) }}
              />
            ))
          )}
        </div>

        {/* Info: pre_arrival in Welcome Kit */}
        <div className="mt-6 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          Les partenaires <strong>pré-arrivée</strong> sont automatiquement inclus dans le Welcome Kit email envoyé aux stagiaires.
          Les partenaires <strong>sur place</strong> sont affichés sur la carte stagiaire publique (/verify).
        </div>
      </div>

      {(showModal || editingPartner) && (
        <PartnerModal
          initial={editingPartner}
          onSave={(data) => void handleSave(data)}
          onClose={() => { setShowModal(false); setEditingPartner(null) }}
        />
      )}
    </div>
  )
}
