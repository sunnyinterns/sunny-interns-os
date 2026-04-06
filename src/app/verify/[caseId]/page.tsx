'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Partner {
  id: string
  name: string
  logo_url: string | null
  offer_short: string | null
  category: string | null
}

interface VerifyData {
  found: boolean
  isActive?: boolean
  status?: string
  internName?: string
  destination?: string
  arrivalDate?: string | null
  returnDate?: string | null
}

export default function VerifyPage() {
  const params = useParams()
  const caseId = typeof params?.caseId === 'string' ? params.caseId : ''
  const [data, setData] = useState<VerifyData | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!caseId) return
    fetch(`/api/verify/${caseId}`)
      .then((r) => r.json())
      .then((d: unknown) => {
        const verifyData = d as VerifyData
        setData(verifyData)
        if (verifyData.found && verifyData.destination) {
          const dest = verifyData.destination.toLowerCase()
          return fetch(`/api/partners?type=on_site&destination=${encodeURIComponent(dest)}`)
            .then((r) => r.ok ? r.json() as Promise<Partner[]> : Promise.resolve([]))
            .then((pts) => setPartners(pts))
        }
      })
      .catch(() => setData({ found: false }))
      .finally(() => setLoading(false))
  }, [caseId])

  return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#c8a96e' }}>
            SUNNY INTERNS
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Certification de stage actif</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 animate-pulse space-y-4">
            <div className="h-6 bg-zinc-100 rounded-lg w-3/4 mx-auto" />
            <div className="h-4 bg-zinc-100 rounded-lg w-1/2 mx-auto" />
            <div className="h-10 bg-zinc-100 rounded-full w-24 mx-auto" />
          </div>
        ) : !data?.found ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[#1a1918]">Stagiaire non trouvé</p>
            <p className="text-sm text-zinc-500 mt-1">Ce lien de vérification est invalide ou expiré.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-5 text-center" style={{ backgroundColor: '#c8a96e' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-1">
                Carte stagiaire
              </p>
              <h2 className="text-xl font-bold text-white">{data.internName}</h2>
            </div>

            {/* Card body */}
            <div className="p-6 space-y-4">
              {/* Active badge */}
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                    data.isActive
                      ? 'bg-green-100 text-[#0d9e75]'
                      : 'bg-red-100 text-[#dc2626]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${data.isActive ? 'bg-[#0d9e75]' : 'bg-[#dc2626]'}`}
                  />
                  {data.isActive ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {data.destination && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Destination</span>
                    <span className="font-medium text-[#1a1918]">{data.destination}</span>
                  </div>
                )}
                {data.arrivalDate && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Arrivée</span>
                    <span className="font-medium text-[#1a1918]">
                      {new Date(data.arrivalDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                {data.returnDate && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Retour</span>
                    <span className="font-medium text-[#1a1918]">
                      {new Date(data.returnDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>

              {/* On-site partners */}
              {partners.length > 0 && (
                <div className="pt-3 border-t border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Partenaires sur place
                  </p>
                  <div className="space-y-2">
                    {partners.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.name} className="w-6 h-6 rounded object-contain flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                            {p.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1a1918] truncate">{p.name}</p>
                          {p.offer_short && (
                            <p className="text-xs text-zinc-400 truncate">{p.offer_short}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-100 text-center">
                <p className="text-xs text-zinc-400">
                  Vérifié par Sunny Interns — {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
