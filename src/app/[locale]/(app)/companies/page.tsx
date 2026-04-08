"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

interface Company {
  id: string
  name: string
  type?: string | null
  category?: string | null
  city?: string | null
  sector?: string | null
  is_active: boolean
  jobs?: { id: string }[]
  contacts?: { id: string }[]
}

const SECTORS = ['Marketing', 'Hôtellerie', 'Tech', 'E-commerce', 'ONG / Social', 'Tourisme', 'Finance', 'Éducation', 'Autre']
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export default function CompaniesPage() {
  const { locale } = useParams()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [q, setQ] = useState("")
  const [filterSector, setFilterSector] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", type: "", category: "", city: "", website: "", sector: "" })

  useEffect(() => {
    fetch("/api/companies").then(r => r.json()).then(d => { setCompanies(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtered = companies.filter(c => {
    const matchQ = c.name.toLowerCase().includes(q.toLowerCase())
    const matchSector = !filterSector || (c.sector ?? c.category ?? '') === filterSector
    return matchQ && matchSector
  })

  async function createCompany(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, destination_id: "fc9ece85-e5d5-41d2-9142-79054244bbce", country: "Indonesia", is_active: true })
    })
    if (r.ok) {
      const c = await r.json() as Company
      setCompanies(prev => [...prev, c])
      setShowModal(false)
      setForm({ name: "", type: "", category: "", city: "", website: "", sector: "" })
      router.push(`/${locale as string}/companies/${c.id}`)
    }
  }

  const inputCls = "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Companies <span className="text-base font-normal text-zinc-500">({companies.length})</span></h1>
          <p className="text-sm text-zinc-500 mt-0.5">{companies.filter(c => c.is_active).length} actives</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors"
        >
          + Nouvelle company
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher par nom…"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-48"
        />
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="">Tous les secteurs</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucune company trouvée</p>
          <button onClick={() => setShowModal(true)} className="mt-2 px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg">Créer une company</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const activeJobs = (c.jobs ?? []).length
            const contactsCount = (c.contacts ?? []).length
            return (
              <button
                key={c.id}
                onClick={() => router.push(`/${locale as string}/companies/${c.id}`)}
                className="bg-white border border-zinc-100 rounded-xl p-4 text-left hover:border-zinc-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#111110] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#c8a96e] font-bold text-sm">{c.name[0]?.toUpperCase()}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-red-100 text-[#dc2626]'}`}>
                    {c.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="font-semibold text-sm text-[#1a1918] mb-1">{c.name}</p>
                <p className="text-xs text-zinc-400">{[c.sector ?? c.category, c.city].filter(Boolean).join(' · ')}</p>
                <div className="flex gap-3 mt-3 pt-3 border-t border-zinc-50 text-xs text-zinc-500">
                  {contactsCount > 0 && <span>{contactsCount} contact{contactsCount > 1 ? 's' : ''}</span>}
                  {activeJobs > 0 && <span className="text-[#c8a96e] font-medium">{activeJobs} job{activeJobs > 1 ? 's' : ''}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle company</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={createCompany} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={inputCls} placeholder="Ex: Potato Head Bali" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Secteur</label>
                  <select value={form.sector} onChange={e => setForm(p => ({...p, sector: e.target.value, category: e.target.value}))} className={inputCls}>
                    <option value="">— Sélectionner —</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                  <input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} className={inputCls} placeholder="Seminyak…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                  <input value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className={inputCls} placeholder="PME, Startup…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                  <input type="url" value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))} className={inputCls} placeholder="https://…" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a]">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
