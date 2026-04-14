'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Scooter {
  id: string
  name: string
  logo_url: string | null
  offer_short: string | null
  offer_details: string | null
  partner_type: 'pre_arrival' | 'on_site' | 'scooter'
  category: string | null
  contact_name: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  discount_percentage: number | null
  price_per_month: number | null
  zone: string | null
  booking_url: string | null
  destination_id: string | null
  is_active: boolean
}

const ZONES = ['Canggu', 'Seminyak', 'Ubud', 'Uluwatu', 'Sanur', 'Denpasar', 'Autre']

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

function ScooterModal({
  initial, onSave, onClose,
}: {
  initial?: Scooter | null
  onSave: (data: Partial<Scooter>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '')
  const [offerShort, setOfferShort] = useState(initial?.offer_short ?? '')
  const [offerDetails, setOfferDetails] = useState(initial?.offer_details ?? '')
  const [contactName, setContactName] = useState(initial?.contact_name ?? '')
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '')
  const [contactWhatsapp, setContactWhatsapp] = useState(initial?.contact_whatsapp ?? '')
  const [pricePerMonth, setPricePerMonth] = useState(initial?.price_per_month?.toString() ?? '')
  const [zone, setZone] = useState(initial?.zone ?? '')
  const [bookingUrl, setBookingUrl] = useState(initial?.booking_url ?? '')

  function handleSave() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      offer_short: offerShort.trim() || null,
      offer_details: offerDetails.trim() || null,
      partner_type: 'scooter',
      category: 'Scooter',
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_whatsapp: contactWhatsapp.trim() || null,
      price_per_month: pricePerMonth ? Number(pricePerMonth) : null,
      zone: zone || null,
      booking_url: bookingUrl.trim() || null,
      destination_id: 'bali',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">{initial ? 'Modifier partenaire scooter' : 'Nouveau partenaire scooter'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nom du partenaire *</label>
            <input className={inputCls + ' w-full'} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Zone</label>
              <select className={inputCls + ' w-full'} value={zone} onChange={e => setZone(e.target.value)}>
                <option value="">— Choisir —</option>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Prix / mois (IDR)</label>
              <input type="number" min={0} className={inputCls + ' w-full'} value={pricePerMonth} onChange={e => setPricePerMonth(e.target.value)} placeholder="Ex: 900000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Offre courte</label>
            <input className={inputCls + ' w-full'} value={offerShort} onChange={e => setOfferShort(e.target.value)} placeholder="Ex: Vario 125 livré, assurance incluse" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Détails / conditions</label>
            <textarea className={inputCls + ' w-full'} rows={2} value={offerDetails} onChange={e => setOfferDetails(e.target.value)} placeholder="Caution, carburant, casques..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Lien réservation</label>
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
                <input className={inputCls + ' w-full'} value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                <input className={inputCls + ' w-full'} value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+62…" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
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

export default function ScootersPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [scooters, setScooters] = useState<Scooter[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Scooter | null>(null)

  async function fetchScooters() {
    setLoading(true)
    const res = await fetch('/api/partners?destination=all')
    if (res.ok) {
      const all = await res.json() as Scooter[]
      setScooters(all.filter(p => p.partner_type === 'scooter' || p.category === 'Scooter'))
    }
    setLoading(false)
  }

  useEffect(() => { void fetchScooters() }, [])

  async function handleSave(data: Partial<Scooter>) {
    if (editing) {
      await fetch(`/api/partners/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    setShowModal(false)
    setEditing(null)
    void fetchScooters()
  }

  async function handleToggle(id: string, isActive: boolean) {
    setScooters(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p))
    await fetch(`/api/partners/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: isActive }) })
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push(`/${locale}/settings`)} className="text-sm text-zinc-500 hover:text-zinc-700 mb-4">← Paramètres</button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">🛵 Partenaires scooters</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{scooters.length} partenaire{scooters.length > 1 ? 's' : ''} de location scooter</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a]">
            + Nouveau
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4">
          {loading ? (
            <div className="space-y-3 py-4">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
          ) : scooters.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">Aucun partenaire scooter</p>
              <button onClick={() => { setEditing(null); setShowModal(true) }} className="mt-3 text-sm text-[#c8a96e] hover:underline">Ajouter le premier</button>
            </div>
          ) : (
            scooters.map(s => (
              <div key={s.id} className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="w-8 h-8 rounded object-contain flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-sm flex-shrink-0">🛵</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918] truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.zone && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">{s.zone}</span>}
                    {s.price_per_month && <span className="text-xs font-medium text-[#0d9e75]">{s.price_per_month.toLocaleString('fr-FR')} IDR/mois</span>}
                  </div>
                  {s.offer_short && <p className="text-xs text-zinc-500 mt-0.5 truncate">{s.offer_short}</p>}
                  {s.contact_whatsapp && <p className="text-xs text-zinc-400 mt-0.5">WA: {s.contact_whatsapp}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setEditing(s); setShowModal(true) }} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Modifier</button>
                  <button
                    onClick={() => void handleToggle(s.id, !s.is_active)}
                    className={['relative inline-flex h-5 w-9 items-center rounded-full transition-colors', s.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'].join(' ')}
                  >
                    <span className={['inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', s.is_active ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <ScooterModal
          initial={editing}
          onSave={data => void handleSave(data)}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
