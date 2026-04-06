'use client'

import { useEffect, useState, useRef } from 'react'
import { CompanyCard } from '@/components/companies/CompanyCard'

interface Job {
  id: string
  status: string
}

interface Company {
  id: string
  name: string
  destination?: string | null
  sector?: string | null
  department?: string | null
  website?: string | null
  jobs?: Job[]
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [destination, setDestination] = useState('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDest, setNewDest] = useState('bali')
  const [newSector, setNewSector] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchCompanies() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (destination !== 'all') params.set('destination', destination)
      const res = await fetch(`/api/companies?${params.toString()}`)
      if (res.ok) {
        const data = await res.json() as Company[]
        setCompanies(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, destination])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), destination: newDest, sector: newSector, website: newWebsite }),
      })
      setShowNewForm(false)
      setNewName('')
      setNewSector('')
      setNewWebsite('')
      void fetchCompanies()
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const rows = lines.slice(1)
      for (const row of rows) {
        const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
        if (!obj.name) continue
        await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: obj.name, destination: obj.destination ?? 'bali', sector: obj.sector ?? '', website: obj.website ?? '' }),
        })
      }
      void fetchCompanies()
    } catch {
      // ignore
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Entreprises</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{companies.length} entreprise{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
            id="csv-import"
          />
          <label
            htmlFor="csv-import"
            className="px-3 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors"
          >
            {importing ? 'Import…' : 'Importer CSV'}
          </label>
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Nouvelle entreprise
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise…"
          className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        />
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="all">Toutes destinations</option>
          <option value="bali">Bali</option>
          <option value="bangkok">Bangkok</option>
        </select>
      </div>

      {/* New company form */}
      {showNewForm && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[#1a1918] mb-4">Nouvelle entreprise</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Nom de l'entreprise"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Destination</label>
                <select
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                >
                  <option value="bali">Bali</option>
                  <option value="bangkok">Bangkok</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Secteur</label>
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  placeholder="Ex: Hôtellerie, Tech…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                <input
                  type="url"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-[#1a1918] text-sm font-medium rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium">Aucune entreprise trouvée</p>
          <p className="text-sm mt-1">Créez votre première entreprise ou modifiez vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  )
}
