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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ price_eur: '', visa_cost_idr: '', processing_days: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/packages?all=true')
    const d = res.ok ? await res.json() as Package[] : []
    setPackages(d)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function toggleActive(pkg: Package) {
    const updated = packages.map(p => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p)
    setPackages(updated)
    await fetch(`/api/packages/${pkg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !pkg.is_active }),
    })
  }

  function startEdit(pkg: Package) {
    setEditingId(pkg.id)
    setEditForm({
      price_eur: String(pkg.price_eur),
      visa_cost_idr: pkg.visa_cost_idr != null ? String(pkg.visa_cost_idr) : '',
      processing_days: pkg.processing_days != null ? String(pkg.processing_days) : '',
    })
  }

  async function saveEdit(pkgId: string) {
    setSaving(true)
    const body: Record<string, unknown> = {
      price_eur: parseFloat(editForm.price_eur),
    }
    if (editForm.visa_cost_idr) body.visa_cost_idr = parseInt(editForm.visa_cost_idr)
    if (editForm.processing_days) body.processing_days = parseInt(editForm.processing_days)

    const res = await fetch(`/api/packages/${pkgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as Package
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, ...updated } : p))
    }
    setEditingId(null)
    setSaving(false)
  }

  const formatEUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  const activeCount = packages.filter(p => p.is_active).length
  const avgMargin = packages.filter(p => p.gross_margin_eur).reduce((s, p) => s + (p.gross_margin_eur ?? 0), 0) / (packages.filter(p => p.gross_margin_eur).length || 1)
  const avgPrice = packages.length > 0 ? packages.reduce((s, p) => s + p.price_eur, 0) / packages.length : 0

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Packages</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{packages.length} packages · {activeCount} actifs · Marge moy. {formatEUR(avgMargin)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Packages actifs</p>
            <p className="text-2xl font-bold text-[#1a1918]">{activeCount}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Prix moyen</p>
            <p className="text-2xl font-bold text-[#1a1918]">{formatEUR(avgPrice)}</p>
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
              <div key={pkg.id} className={['bg-white border rounded-xl px-5 py-4 transition-colors', pkg.is_active ? 'border-zinc-100' : 'border-zinc-100 opacity-60'].join(' ')}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={['text-sm font-semibold', pkg.is_active ? 'text-[#1a1918]' : 'text-zinc-400'].join(' ')}>{pkg.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[pkg.package_type]}`}>{pkg.package_type}</span>
                      {pkg.is_visa_only && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">Visa only</span>}
                      {!pkg.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Inactif</span>}
                    </div>

                    {editingId === pkg.id ? (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div>
                          <label className="text-xs text-zinc-400">Tarif (€)</label>
                          <input
                            type="number"
                            className="block mt-0.5 px-2 py-1 text-sm border border-[#c8a96e] rounded-lg w-24 focus:outline-none"
                            value={editForm.price_eur}
                            onChange={e => setEditForm(p => ({...p, price_eur: e.target.value}))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Visa cost (IDR)</label>
                          <input
                            type="number"
                            className="block mt-0.5 px-2 py-1 text-sm border border-zinc-200 rounded-lg w-32 focus:outline-none"
                            value={editForm.visa_cost_idr}
                            onChange={e => setEditForm(p => ({...p, visa_cost_idr: e.target.value}))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400">Délai (j)</label>
                          <input
                            type="number"
                            className="block mt-0.5 px-2 py-1 text-sm border border-zinc-200 rounded-lg w-16 focus:outline-none"
                            value={editForm.processing_days}
                            onChange={e => setEditForm(p => ({...p, processing_days: e.target.value}))}
                          />
                        </div>
                        <div className="flex gap-1 mt-4">
                          <button onClick={() => void saveEdit(pkg.id)} disabled={saving} className="px-3 py-1.5 text-xs bg-[#c8a96e] text-white rounded-lg disabled:opacity-50">✓ Sauv.</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs bg-zinc-100 rounded-lg">×</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        {pkg.visa_types && <span>Visa: <strong className="text-[#1a1918]">{pkg.visa_types.code}</strong></span>}
                        {pkg.visa_agents && <span>Agent: <strong className="text-[#1a1918]">{pkg.visa_agents.name}</strong></span>}
                        {pkg.max_stay_days && <span>Séjour: <strong className="text-[#1a1918]">{pkg.max_stay_days}j max</strong></span>}
                        {pkg.processing_days && <span>Délai: <strong className="text-[#1a1918]">{pkg.processing_days}j</strong></span>}
                        {pkg.visa_cost_idr && <span>Coût visa: <strong className="text-[#1a1918]">{formatIDR(pkg.visa_cost_idr)}</strong></span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1a1918]">{formatEUR(pkg.price_eur)}</p>
                      {pkg.gross_margin_eur && (
                        <p className="text-xs text-[#0d9e75] font-medium mt-0.5">+{formatEUR(pkg.gross_margin_eur)} marge</p>
                      )}
                    </div>

                    {editingId !== pkg.id && (
                      <button
                        onClick={() => startEdit(pkg)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        Modifier
                      </button>
                    )}

                    {/* Toggle actif/inactif */}
                    <button
                      onClick={() => void toggleActive(pkg)}
                      className={[
                        'w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                        pkg.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200',
                      ].join(' ')}
                      title={pkg.is_active ? 'Désactiver' : 'Activer'}
                    >
                      <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', pkg.is_active ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
