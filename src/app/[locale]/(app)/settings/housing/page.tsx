'use client'

import { useEffect, useState } from 'react'
import { GuestHouseCard } from '@/components/housing/GuestHouseCard'

interface GuestHouse {
  id: string
  name: string
  city: string
  price_month: number
  has_pool: boolean
  has_ac: boolean
  has_wifi: boolean
  scooter_included: boolean
  description?: string | null
}

interface Scooter {
  id: string
  provider: string
  type: string
  price_month: number
  whatsapp: string
}

interface TransportProvider {
  id: string
  name: string
  phone: string
  is_default: boolean
  notes?: string | null
}

export default function HousingPage() {
  const [guesthouses, setGuesthouses] = useState<GuestHouse[]>([])
  const [scooters, setScooters] = useState<Scooter[]>([])
  const [transport, setTransport] = useState<TransportProvider[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [cityFilter, setCityFilter] = useState('all')
  const [poolFilter, setPoolFilter] = useState(false)
  const [acFilter, setAcFilter] = useState(false)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(2000)

  async function fetchGuesthouses() {
    const params = new URLSearchParams()
    if (cityFilter !== 'all') params.set('city', cityFilter)
    if (poolFilter) params.set('has_pool', 'true')
    if (acFilter) params.set('has_ac', 'true')
    if (minPrice > 0) params.set('min_price', String(minPrice))
    if (maxPrice < 2000) params.set('max_price', String(maxPrice))
    const res = await fetch(`/api/guesthouses?${params.toString()}`)
    if (res.ok) setGuesthouses(await res.json() as GuestHouse[])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchGuesthouses(),
      fetch('/api/scooters').then((r) => r.ok ? r.json() as Promise<Scooter[]> : Promise.resolve([])).then(setScooters),
      fetch('/api/transport-providers').then((r) => r.ok ? r.json() as Promise<TransportProvider[]> : Promise.resolve([])).then(setTransport),
    ]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchGuesthouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityFilter, poolFilter, acFilter, minPrice, maxPrice])

  function generateListingEmail() {
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h1 style="color:#c8a96e">Logements disponibles — Sunny Interns</h1>
  ${guesthouses.map((g) => `
  <div style="border:1px solid #e4e4e7;border-radius:12px;padding:16px;margin-bottom:16px">
    <h2 style="margin:0 0 4px">${g.name}</h2>
    <p style="color:#71717a;margin:0 0 8px">${g.city} — ${g.price_month} €/mois</p>
    <p style="margin:0">${g.description ?? ''}</p>
  </div>`).join('')}
</body>
</html>`
    console.log('[EMAIL] Housing listing generated', html)
    window.location.href = `mailto:?subject=Listing logements Sunny Interns&body=${encodeURIComponent('Voir listing en pièce jointe ou lien')}`
  }

  async function setDefaultTransport(id: string) {
    await fetch('/api/transport-providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_default: true }),
    })
    setTransport((prev) => prev.map((p) => ({ ...p, is_default: p.id === id })))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Logement & Transport</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Guesthouses, scooters et prestataires de transport</p>
      </div>

      {/* ── Guesthouses ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1a1918]">Guesthouses</h2>
          <button
            onClick={generateListingEmail}
            className="px-3 py-1.5 text-sm bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8994e] transition-colors"
          >
            Envoyer listing
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-zinc-100 rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            >
              <option value="all">Toutes</option>
              <option value="Seminyak">Seminyak</option>
              <option value="Canggu">Canggu</option>
              <option value="Ubud">Ubud</option>
              <option value="Kuta">Kuta</option>
              <option value="Other">Autre</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
              <div
                onClick={() => setPoolFilter(!poolFilter)}
                className={`w-10 h-5 rounded-full transition-colors ${poolFilter ? 'bg-[#c8a96e]' : 'bg-zinc-200'} relative cursor-pointer`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${poolFilter ? 'translate-x-5' : ''}`} />
              </div>
              Piscine
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
              <div
                onClick={() => setAcFilter(!acFilter)}
                className={`w-10 h-5 rounded-full transition-colors ${acFilter ? 'bg-[#c8a96e]' : 'bg-zinc-200'} relative cursor-pointer`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${acFilter ? 'translate-x-5' : ''}`} />
              </div>
              Climatisation
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Budget: {minPrice} € – {maxPrice === 2000 ? '2000+' : maxPrice} €
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={minPrice}
                onChange={(e) => setMinPrice(parseInt(e.target.value))}
                className="w-24 accent-[#c8a96e]"
              />
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-24 accent-[#c8a96e]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guesthouses.length === 0 ? (
            <p className="text-sm text-zinc-400 col-span-3 text-center py-8">Aucune guesthouse trouvée avec ces critères.</p>
          ) : (
            guesthouses.map((g) => <GuestHouseCard key={g.id} guesthouse={g} />)
          )}
        </div>
      </section>

      {/* ── Scooters ── */}
      <section>
        <h2 className="text-lg font-semibold text-[#1a1918] mb-4">Scooters</h2>
        <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Prestataire</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Modèle</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Prix/mois</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-600">Contact</th>
              </tr>
            </thead>
            <tbody>
              {scooters.map((scooter, idx) => (
                <tr key={scooter.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                  <td className="px-4 py-3 font-medium text-[#1a1918]">{scooter.provider}</td>
                  <td className="px-4 py-3 text-zinc-600">{scooter.type}</td>
                  <td className="px-4 py-3 text-[#c8a96e] font-semibold">{scooter.price_month} €</td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://wa.me/${scooter.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                    >
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Transport ── */}
      <section>
        <h2 className="text-lg font-semibold text-[#1a1918] mb-4">Prestataires de transport</h2>
        <div className="space-y-2">
          {transport.map((provider) => (
            <div
              key={provider.id}
              className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between gap-4 ${provider.is_default ? 'border-[#c8a96e]' : 'border-zinc-100'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#1a1918] text-sm">{provider.name}</p>
                  {provider.is_default && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#c8a96e]/10 text-[#c8a96e]">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{provider.phone}</p>
                {provider.notes && <p className="text-xs text-zinc-400 mt-0.5 truncate">{provider.notes}</p>}
              </div>
              {!provider.is_default && (
                <button
                  onClick={() => void setDefaultTransport(provider.id)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Définir par défaut
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
