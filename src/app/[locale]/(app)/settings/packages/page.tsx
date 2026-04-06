'use client'

import { useEffect, useState } from 'react'

interface Package {
  id: string
  name: string
  package_type: 'Standard' | 'Express' | 'VisaOnly'
  price_eur: number
  visa_cost_idr: number | null
  gross_margin_eur: number | null
  max_stay_days: number | null
  validity_label: string | null
  processing_days: number | null
  is_visa_only: boolean
  is_active: boolean
  visa_types: { id: string; code: string; name: string; validity_label: string | null; max_stay_days: number | null } | null
  visa_agents: { id: string; name: string } | null
}

const TYPE_COLORS = {
  Standard: 'bg-blue-100 text-blue-700',
  Express: 'bg-purple-100 text-purple-700',
  VisaOnly: 'bg-zinc-100 text-zinc-600',
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.ok ? r.json() : [])
      .then((d: Package[]) => { setPackages(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatEUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  const totalRevenue = packages.reduce((s, p) => s + p.price_eur, 0)
  const avgMargin = packages.filter(p => p.gross_margin_eur).reduce((s, p) => s + (p.gross_margin_eur ?? 0), 0) / (packages.filter(p => p.gross_margin_eur).length || 1)

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Packages</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{packages.length} package{packages.length !== 1 ? 's' : ''} · Marge moy. {formatEUR(avgMargin)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Packages actifs</p>
            <p className="text-2xl font-bold text-[#1a1918]">{packages.filter(p => p.is_active).length}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Prix moyen</p>
            <p className="text-2xl font-bold text-[#1a1918]">{formatEUR(packages.length > 0 ? totalRevenue / packages.length : 0)}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Marge moy.</p>
            <p className="text-2xl font-bold text-[#0d9e75]">{formatEUR(avgMargin)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-white border border-zinc-100 rounded-xl px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-[#1a1918]">{pkg.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[pkg.package_type]}`}>{pkg.package_type}</span>
                      {pkg.is_visa_only && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">Visa only</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      {pkg.visa_types && <span>Visa: <strong className="text-[#1a1918]">{pkg.visa_types.code}</strong></span>}
                      {pkg.visa_agents && <span>Agent: <strong className="text-[#1a1918]">{pkg.visa_agents.name}</strong></span>}
                      {pkg.max_stay_days && <span>Séjour: <strong className="text-[#1a1918]">{pkg.max_stay_days}j max</strong></span>}
                      {pkg.processing_days && <span>Délai: <strong className="text-[#1a1918]">{pkg.processing_days}j</strong></span>}
                      {pkg.visa_cost_idr && <span>Coût visa: <strong className="text-[#1a1918]">{formatIDR(pkg.visa_cost_idr)}</strong></span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-[#1a1918]">{formatEUR(pkg.price_eur)}</p>
                    {pkg.gross_margin_eur && (
                      <p className="text-xs text-[#0d9e75] font-medium mt-0.5">+{formatEUR(pkg.gross_margin_eur)} marge</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          Les packages sont initialisés via la migration SQL avec les 14 packages réels. Exécutez <code className="font-mono bg-amber-100 px-1 rounded">npx tsx src/scripts/migrate-all.ts</code> pour les charger.
        </div>
      </div>
    </div>
  )
}
