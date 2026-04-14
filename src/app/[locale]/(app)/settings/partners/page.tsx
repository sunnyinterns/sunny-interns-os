'use client'

import { useEffect, useState } from 'react'

interface Partner {
  id: string
  name: string
  logo_url: string | null
  offer_short: string | null
  offer_details: string | null
  partner_type: 'pre_arrival' | 'on_site'
  category: string | null
  contact_name: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  discount_percentage: number | null
  discount_text: string | null
  valid_for: string | null
  booking_url: string | null
  destination_id: string | null
  is_active: boolean
}

const CATEGORIES = ['eSIM', 'Transport', 'Sport/Wellness', 'Restauration', 'Deals', 'Shopping', 'Coworking', 'Banque', 'Assurance', 'Services', 'Autre']
const CATEGORY_TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'all', label: 'Tous', icon: '🌐' },
  { key: 'eSIM', label: 'eSIM', icon: '📶' },
  { key: 'Restauration', label: 'Restaurants', icon: '🍽️' },
  { key: 'Deals', label: 'Deals', icon: '🎁' },
  { key: 'Services', label: 'Services', icon: '🛠️' },
]

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

function PartnerModal({
  initial, onSave, onClose,
}: {
  initial?: Partner | null
  onSave: (data: Partial<Partner>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '')
  const [offerShort, setOfferShort] = useState(initial?.offer_short ?? '')
  const [offerDetails, setOfferDetails] = useState(initial?.offer_details ?? '')
  const [partnerType, setPartnerType] = useState<'pre_arrival' | 'on_site'>(initial?.partner_type ?? 'on_site')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [contactName, setContactName] = useState(initial?.contact_name ?? '')
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '')
  const [contactWhatsapp, setContactWhatsapp] = useState(initial?.contact_whatsapp ?? '')
  const [discountPct, setDiscountPct] = useState(initial?.discount_percentage?.toString() ?? '')
  const [discountText, setDiscountText] = useState(initial?.discount_text ?? '')
  const [validFor, setValidFor] = useState(initial?.valid_for ?? '')
  const [bookingUrl, setBookingUrl] = useState(initial?.booking_url ?? '')
  const [destinationId, setDestinationId] = useState(initial?.destination_id ?? 'bali')

  function handleSave() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      offer_short: offerShort.trim() || null,
      offer_details: offerDetails.trim() || null,
      partner_type: partnerType,
      category: category || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_whatsapp: contactWhatsapp.trim() || null,
      discount_percentage: discountPct ? Number(discountPct) : null,
      discount_text: discountText.trim() || null,
      valid_for: validFor.trim() || null,
      booking_url: bookingUrl.trim() || null,
      destination_id: destinationId || 'bali',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">{initial ? 'Modifier partenaire' : 'Nouveau partenaire'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
              <input className={inputCls + ' w-full'} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
              <select className={inputCls} value={partnerType} onChange={e => setPartnerType(e.target.value as 'pre_arrival' | 'on_site')}>
                <option value="pre_arrival">Pré-arrivée</option>
                <option value="on_site">Sur place</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
              <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">— Aucune —</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Destination</label>
              <select className={inputCls} value={destinationId} onChange={e => setDestinationId(e.target.value)}>
                <option value="bali">Bali</option>
                <option value="bangkok">Bangkok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Remise (%)</label>
              <input type="number" min={0} max={100} className={inputCls} value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="Ex: 10" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Offre courte</label>
            <input className={inputCls + ' w-full'} value={offerShort} onChange={e => setOfferShort(e.target.value)} placeholder="Ex: -10% sur les hébergements" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Détails de l&apos;offre</label>
            <textarea className={inputCls + ' w-full'} rows={2} value={offerDetails} onChange={e => setOfferDetails(e.target.value)} placeholder="Conditions, codes promo…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Deal / remise (texte)</label>
              <input className={inputCls + ' w-full'} value={discountText} onChange={e => setDiscountText(e.target.value)} placeholder="Ex: Apéro offert" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Valable pour</label>
              <input className={inputCls + ' w-full'} value={validFor} onChange={e => setValidFor(e.target.value)} placeholder="Ex: Stagiaires Bali Interns" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Lien de réservation / booking</label>
            <input className={inputCls + ' w-full'} value={bookingUrl} onChange={e => setBookingUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">URL Logo</label>
            <input className={inputCls + ' w-full'} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="border-t border-zinc-100 pt-3">
            <p className="text-xs font-medium text-zinc-500 mb-2">Contact partenaire</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom contact</label>
                <input className={inputCls} value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                <input className={inputCls} value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+62…" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email contact</label>
                <input type="email" className={inputCls + ' w-full'} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Annuler</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50">
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)

  async function fetchPartners() {
    setLoading(true)
    const res = await fetch('/api/partners?destination=all')
    setPartners(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void fetchPartners() }, [])

  async function handleToggle(id: string, isActive: boolean) {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p))
    await fetch(`/api/partners/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: isActive }) })
  }

  async function handleSave(data: Partial<Partner>) {
    if (editingPartner) {
      await fetch(`/api/partners/${editingPartner.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    setShowModal(false)
    setEditingPartner(null)
    void fetchPartners()
  }

  const filtered = partners.filter(p =>
    (filter === 'all' || p.partner_type === filter) &&
    (categoryFilter === 'all' || p.category === categoryFilter)
  )
  const preCount = partners.filter(p => p.partner_type === 'pre_arrival').length
  const onCount = partners.filter(p => p.partner_type === 'on_site').length

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Partenaires</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{preCount} pré-arrivée · {onCount} sur place</p>
          </div>
          <button onClick={() => { setEditingPartner(null); setShowModal(true) }} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors">
            + Nouveau partenaire
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={['px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1', categoryFilter === tab.key ? 'bg-[#c8a96e] text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-[#c8a96e]'].join(' ')}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 mb-6 bg-zinc-100 rounded-xl p-1 w-fit">
          {(['all', 'pre_arrival', 'on_site'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={['px-3 py-1.5 text-sm rounded-lg transition-colors', filter === f ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}>
              {f === 'all' ? 'Tous' : f === 'pre_arrival' ? 'Pré-arrivée' : 'Sur place'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4">
          {loading ? (
            <div className="space-y-3 py-4">{[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">Aucun partenaire</p>
              <button onClick={() => { setEditingPartner(null); setShowModal(true) }} className="mt-3 text-sm text-[#c8a96e] hover:underline">Ajouter le premier</button>
            </div>
          ) : (
            filtered.map(partner => (
              <div key={partner.id} className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
                {partner.logo_url ? (
                  <img src={partner.logo_url} alt={partner.name} className="w-8 h-8 rounded object-contain flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">{partner.name[0]?.toUpperCase()}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918] truncate">{partner.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={['text-xs px-1.5 py-0.5 rounded font-medium', partner.partner_type === 'pre_arrival' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'].join(' ')}>
                      {partner.partner_type === 'pre_arrival' ? 'Pré-arrivée' : 'Sur place'}
                    </span>
                    {partner.category && <span className="text-xs text-zinc-400">{partner.category}</span>}
                    {partner.discount_percentage && <span className="text-xs font-medium text-[#0d9e75]">-{partner.discount_percentage}%</span>}
                  </div>
                  {partner.offer_short && <p className="text-xs text-zinc-500 mt-0.5 truncate">{partner.offer_short}</p>}
                  {partner.discount_text && <p className="text-xs text-[#0d9e75] mt-0.5">🎁 {partner.discount_text}</p>}
                  {partner.valid_for && <p className="text-[10px] text-zinc-400 mt-0.5">Valable: {partner.valid_for}</p>}
                  {partner.booking_url && (
                    <a href={partner.booking_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#c8a96e] hover:underline mt-0.5 inline-block" onClick={e => e.stopPropagation()}>
                      Lien réservation ↗
                    </a>
                  )}
                  {partner.contact_name && <p className="text-xs text-zinc-400 mt-0.5">Contact: {partner.contact_name}{partner.contact_whatsapp ? ` · ${partner.contact_whatsapp}` : ''}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setEditingPartner(partner); setShowModal(true) }} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Modifier</button>
                  <button
                    onClick={() => void handleToggle(partner.id, !partner.is_active)}
                    className={['relative inline-flex h-5 w-9 items-center rounded-full transition-colors', partner.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'].join(' ')}
                  >
                    <span className={['inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', partner.is_active ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          Les partenaires <strong>pré-arrivée</strong> sont inclus dans le Welcome Kit email.
          Les partenaires <strong>sur place</strong> sont affichés sur la Intern Card publique (/verify).
        </div>
      </div>

      {showModal && (
        <PartnerModal
          initial={editingPartner}
          onSave={data => void handleSave(data)}
          onClose={() => { setShowModal(false); setEditingPartner(null) }}
        />
      )}
    </div>
  )
}
