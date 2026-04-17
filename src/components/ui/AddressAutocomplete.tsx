'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export interface AddressResult {
  formatted: string
  street: string
  city: string
  postal_code: string
  country: string
  place_id: string
  lat?: number
  lng?: number
}

interface Props {
  value: string
  onChange: (val: string) => void
  onSelect?: (result: AddressResult) => void
  placeholder?: string
  className?: string
  label?: string
  required?: boolean
  countryRestrict?: string // e.g. 'id' for Indonesia
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

declare global {
  interface Window {
    google: typeof google
    initGoogleMaps?: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
const callbacks: (() => void)[] = []

function loadGoogleMaps(cb: () => void) {
  if (scriptLoaded) { cb(); return }
  callbacks.push(cb)
  if (scriptLoading) return
  scriptLoading = true
  window.initGoogleMaps = () => {
    scriptLoaded = true
    callbacks.forEach(fn => fn())
    callbacks.length = 0
  }
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&callback=initGoogleMaps&loading=async`
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

export function AddressAutocomplete({
  value, onChange, onSelect,
  placeholder = 'Rechercher une adresse…',
  className = '',
  label,
  required,
  countryRestrict,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(!GOOGLE_API_KEY)

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return
    const opts: google.maps.places.AutocompleteOptions = {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'place_id', 'geometry'],
    }
    if (countryRestrict) opts.componentRestrictions = { country: countryRestrict }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, opts)
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace()
      if (!place.address_components) return

      const get = (type: string) =>
        place.address_components!.find(c => c.types.includes(type))?.long_name ?? ''
      const getShort = (type: string) =>
        place.address_components!.find(c => c.types.includes(type))?.short_name ?? ''

      const street = [get('street_number'), get('route')].filter(Boolean).join(' ')
      const city = get('locality') || get('administrative_area_level_2') || get('administrative_area_level_1')
      const postal_code = get('postal_code')
      const country = get('country')
      const formatted = place.formatted_address ?? ''
      const place_id = place.place_id ?? ''
      const lat = place.geometry?.location?.lat()
      const lng = place.geometry?.location?.lng()

      onChange(formatted)
      onSelect?.({ formatted, street, city, postal_code, country, place_id, lat, lng })
    })
    setReady(true)
  }, [onChange, onSelect, countryRestrict])

  useEffect(() => {
    if (!GOOGLE_API_KEY) { setFallback(true); return }
    loadGoogleMaps(() => { initAutocomplete() })
  }, [initAutocomplete])

  const base = className || 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  if (fallback) {
    return (
      <div>
        {label && <label className="block text-xs font-medium text-zinc-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={base}
        />
        <p className="text-[10px] text-zinc-400 mt-0.5">💡 Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour activer la recherche adresse</p>
      </div>
    )
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium text-zinc-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`${base} pr-8`}
          autoComplete="off"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 text-sm pointer-events-none">
          📍
        </span>
      </div>
      {!ready && <p className="text-[10px] text-zinc-400 mt-0.5">Chargement Google Maps…</p>}
    </div>
  )
}
