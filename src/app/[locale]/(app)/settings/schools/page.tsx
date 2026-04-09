'use client'

import { useEffect, useState } from 'react'

interface School {
  id: string
  name: string
  city: string | null
  country: string | null
  is_active: boolean
  case_count?: number
}

interface SchoolPending {
  id: string
  name: string
  city: string | null
  country: string | null
  website: string | null
  submitted_by_email: string | null
  status: string
  created_at: string
}

export default function SchoolsSettingsPage() {
  const [tab, setTab] = useState<'validated' | 'pending'>('validated')
  const [schools, setSchools] = useState<School[]>([])
  const [pending, setPending] = useState<SchoolPending[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', city: '', country: '' })
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [schoolsRes, pendingRes] = await Promise.all([
      fetch('/api/schools?with_count=true'),
      fetch('/api/schools-pending'),
    ])
    if (schoolsRes.ok) setSchools(await schoolsRes.json() as School[])
    if (pendingRes.ok) setPending(await pendingRes.json() as SchoolPending[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleAdd() {
    if (!addForm.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    if (res.ok) {
      setShowAdd(false)
      setAddForm({ name: '', city: '', country: '' })
      void load()
    }
    setSaving(false)
  }

  async function handleApprove(p: SchoolPending) {
    setActionLoading(p.id)
    await fetch('/api/schools-pending/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    void load()
    setActionLoading(null)
  }

  async function handleReject(p: SchoolPending) {
    setActionLoading(p.id)
    await fetch('/api/schools-pending/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    void load()
    setActionLoading(null)
  }

  const pendingCount = pending.filter(p => p.status === 'pending').length

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a1918]">Écoles</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors"
        >
          + Ajouter une école
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('validated')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'validated' ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Écoles validées ({schools.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${tab === 'pending' ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          En attente
          {pendingCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#dc2626] text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'validated' ? (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Ville</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Pays</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">Dossiers</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-[#1a1918]">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{s.city ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">{s.country ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{s.case_count ?? 0}</td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Aucune école</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.filter(p => p.status === 'pending').length === 0 ? (
            <p className="text-center text-zinc-400 py-8">Aucune école en attente</p>
          ) : (
            pending.filter(p => p.status === 'pending').map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1a1918]">{p.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {[p.city, p.country].filter(Boolean).join(', ') || 'Pas de localisation'}
                    {p.submitted_by_email && ` · ${p.submitted_by_email}`}
                    {' · '}
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(p)}
                    disabled={actionLoading === p.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0d9e75] text-white hover:bg-[#0b8a66] transition-colors disabled:opacity-50"
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => handleReject(p)}
                    disabled={actionLoading === p.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add school modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[#1a1918] mb-4">Ajouter une école</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Nom *</label>
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  placeholder="Université de Paris"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Ville</label>
                  <input
                    value={addForm.city}
                    onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Pays</label>
                  <input
                    value={addForm.country}
                    onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !addForm.name.trim()} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
