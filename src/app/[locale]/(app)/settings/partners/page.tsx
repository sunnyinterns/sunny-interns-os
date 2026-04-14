'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  logo_url: string | null
  is_employer: boolean
  is_partner: boolean
  is_supplier: boolean
  partner_timing: string | null
  partner_category: string | null
  partner_deal: string | null
  partner_visible_from: string | null
  internship_city: string | null
  website: string | null
}

type Tab = 'all' | 'pre_arrival' | 'on_site' | 'suppliers'

export default function PartnersPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/companies')
    if (r.ok) setCompanies(await r.json() as Company[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const TABS: { key: Tab; label: string; count: () => number }[] = [
    { key: 'all', label: 'Partenaires', count: () => companies.filter(c => c.is_partner).length },
    { key: 'pre_arrival', label: '✈️ Avant départ', count: () => companies.filter(c => c.is_partner && (c.partner_timing === 'pre_arrival' || c.partner_timing === 'both')).length },
    { key: 'on_site', label: '🌴 Sur l\'île', count: () => companies.filter(c => c.is_partner && (c.partner_timing === 'on_site' || c.partner_timing === 'both')).length },
    { key: 'suppliers', label: '📦 Fournisseurs', count: () => companies.filter(c => c.is_supplier).length },
  ]

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.partner_category ?? '').toLowerCase().includes(q) || (c.partner_deal ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (tab === 'all') return c.is_partner
    if (tab === 'pre_arrival') return c.is_partner && (c.partner_timing === 'pre_arrival' || c.partner_timing === 'both')
    if (tab === 'on_site') return c.is_partner && (c.partner_timing === 'on_site' || c.partner_timing === 'both')
    if (tab === 'suppliers') return c.is_supplier
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700 mb-6 block">← Paramètres</button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">🤝 Partenaires & Fournisseurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gérés depuis les fiches entreprises</p>
        </div>
        <Link href={`/${locale}/companies`} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-xl hover:bg-[#b8945a]">
          + Ajouter dans Entreprises →
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${tab === t.key ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
            {t.label} <span className="ml-1 text-xs opacity-70">({t.count()})</span>
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par nom, catégorie, deal…"
        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-zinc-400 text-sm mb-2">Aucun résultat</p>
          <Link href={`/${locale}/companies`} className="text-xs text-[#c8a96e] hover:underline">Ajouter depuis les fiches entreprises →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Link key={c.id} href={`/${locale}/companies/${c.id}`}
              className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4 hover:border-[#c8a96e] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {c.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo_url} alt="" className="w-10 h-10 object-cover" onError={e => { e.currentTarget.style.display='none' }} />
                ) : (
                  <span className="font-bold text-[#c8a96e]">{c.name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-[#1a1918]">{c.name}</p>
                  {c.partner_category && <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{c.partner_category}</span>}
                  {c.partner_visible_from === 'payment' && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Welcome Kit</span>}
                  {c.partner_visible_from === 'arrival' && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">À l&apos;arrivée</span>}
                </div>
                {c.partner_deal && <p className="text-xs text-zinc-500 truncate mt-0.5">{c.partner_deal}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {c.is_employer && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Employeur</span>}
                {c.is_supplier && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">Fournisseur</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
