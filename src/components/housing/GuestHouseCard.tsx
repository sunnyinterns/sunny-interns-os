'use client'

import { useState } from 'react'

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

interface GuestHouseCardProps {
  guesthouse: GuestHouse
}

export function GuestHouseCard({ guesthouse }: GuestHouseCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-white rounded-xl border border-zinc-100 p-4 cursor-pointer hover:border-[#c8a96e] hover:shadow-sm transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[#1a1918] text-sm leading-tight">{guesthouse.name}</h3>
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
          {guesthouse.city}
        </span>
      </div>

      <p className="text-lg font-bold text-[#c8a96e] mb-3">
        {guesthouse.price_month.toLocaleString('fr-FR')} €<span className="text-sm font-normal text-zinc-400">/mois</span>
      </p>

      {/* Amenity icons */}
      <div className="flex items-center gap-2 flex-wrap">
        {guesthouse.has_pool && (
          <span title="Piscine" className="text-sm px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
            🏊 Piscine
          </span>
        )}
        {guesthouse.has_ac && (
          <span title="Climatisation" className="text-sm px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 text-xs font-medium">
            ❄️ AC
          </span>
        )}
        {guesthouse.has_wifi && (
          <span title="WiFi" className="text-sm px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs font-medium">
            📶 WiFi
          </span>
        )}
        {guesthouse.scooter_included && (
          <span title="Scooter inclus" className="text-sm px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
            🏍️ Scooter
          </span>
        )}
      </div>

      {expanded && guesthouse.description && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <p className="text-sm text-zinc-600">{guesthouse.description}</p>
        </div>
      )}
    </div>
  )
}
