'use client'

import { useEffect, useState } from 'react'

interface VisaType {
  id: string
  code: string
  name: string
  classification: string | null
  validity_days: number | null
  validity_label: string | null
  publish_price_idr: number | null
  timeline_label: string | null
  is_extendable: boolean
  max_stay_days: number | null
  is_active: boolean
}

export default function VisaTypesPage() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/visa-types?all=true')
      .then(r => r.ok ? r.json() : [])
      .then((d: VisaType[]) => { setVisaTypes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  async function toggleActive(vt: VisaType) {
    setVisaTypes(prev => prev.map(v => v.id === vt.id ? { ...v, is_active: !v.is_active } : v))
    await fetch(`/api/visa-types/${vt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !vt.is_active }),
    })
  }

  const activeCount = visaTypes.filter(v => v.is_active).length

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Types de visa</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{visaTypes.length} visa{visaTypes.length !== 1 ? 's' : ''} · {activeCount} actifs</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {visaTypes.map(v => (
              <div key={v.id} className={['bg-white border border-zinc-100 rounded-xl px-5 py-4 flex items-start gap-4 transition-opacity', !v.is_active ? 'opacity-50' : ''].join(' ')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#c8a96e] bg-[#c8a96e]/10 px-2 py-0.5 rounded">{v.code}</span>
                    <p className="text-sm font-medium text-[#1a1918]">{v.name}</p>
                    {v.is_extendable && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-[#0d9e75] font-medium">Extensible</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    {v.classification && <span>Classification: <strong className="text-[#1a1918]">{v.classification}</strong></span>}
                    {v.validity_label && <span>Validité: <strong className="text-[#1a1918]">{v.validity_label}</strong></span>}
                    {v.max_stay_days && <span>Séjour max: <strong className="text-[#1a1918]">{v.max_stay_days}j</strong></span>}
                    {v.timeline_label && <span>Délai: <strong className="text-[#1a1918]">{v.timeline_label}</strong></span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    {v.publish_price_idr && (
                      <p className="text-sm font-semibold text-[#1a1918]">{formatIDR(v.publish_price_idr)}</p>
                    )}
                  </div>
                  {/* Toggle actif/inactif */}
                  <button
                    onClick={() => void toggleActive(v)}
                    className={['w-10 h-6 rounded-full transition-colors relative', v.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'].join(' ')}
                    title={v.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', v.is_active ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          Les types de visa sont initialisés via la migration SQL. Contactez Sidney pour en ajouter de nouveaux.
        </div>
      </div>
    </div>
  )
}
