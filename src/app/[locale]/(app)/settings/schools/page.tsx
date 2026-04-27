'use client'

import { useEffect, useState, useCallback } from 'react'

interface School { id: string; name: string; city: string | null; country: string | null; is_active: boolean; case_count?: number }
interface SchoolPending {
  id: string; name: string; city: string | null; country: string | null; website: string | null
  submitted_by_email: string | null; status: string; submitted_at: string | null; notes: string | null
}

export default function SchoolsSettingsPage() {
  const [tab, setTab] = useState<'validated' | 'pending' | 'duplicates'>('pending')
  const [schools, setSchools] = useState<School[]>([])
  const [pending, setPending] = useState<SchoolPending[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<SchoolPending | null>(null)
  const [mergeSearch, setMergeSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', city: '', country: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [sr, pr] = await Promise.all([
      fetch('/api/schools?with_count=true'),
      fetch('/api/schools-pending'),
    ])
    if (sr.ok) setSchools(await sr.json() as School[])
    if (pr.ok) setPending(await pr.json() as SchoolPending[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Approve: ajoute dans schools + marque pending comme merged
  async function handleApprove(p: SchoolPending) {
    setActionLoading(p.id)
    const res = await fetch('/api/schools-pending/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    if (res.ok) { showToast(`"${p.name}" ajoutée aux écoles validées`); void load() }
    else showToast('Erreur lors de la validation')
    setActionLoading(null)
  }

  // Merge: lie la pending à une école existante
  async function handleMerge(p: SchoolPending, schoolId: string) {
    setActionLoading(p.id)
    const res = await fetch('/api/schools-pending/merge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_id: p.id, school_id: schoolId }),
    })
    if (res.ok) { showToast(`"${p.name}" fusionnée avec l'école existante`); setMergeTarget(null); void load() }
    else showToast('Erreur lors de la fusion')
    setActionLoading(null)
  }

  async function handleReject(p: SchoolPending) {
    setActionLoading(p.id)
    await fetch('/api/schools-pending/reject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    showToast(`"${p.name}" rejetée`)
    void load()
    setActionLoading(null)
  }

  async function handleAdd() {
    if (!addForm.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/schools', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    if (res.ok) { setShowAdd(false); setAddForm({ name: '', city: '', country: '' }); void load() }
    setSaving(false)
  }

  // Dédoublonnage: grouper les écoles validées avec des noms similaires
  const duplicates = schools.reduce((acc, s) => {
    const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, School[]>)
  const duplicateGroups = Object.values(duplicates).filter(g => g.length > 1)

  const pendingList = pending.filter(p => p.status === 'pending')
  const pendingCount = pendingList.length

  const filteredSchools = mergeSearch
    ? schools.filter(s => s.name.toLowerCase().includes(mergeSearch.toLowerCase()))
    : schools.slice(0, 10)

  return (
    <div className="p-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0d9e75] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Schools</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{schools.length} validated · {pendingCount} pending</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors">
          + Add school
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-lg p-1 w-fit">
        {(['pending', 'validated', 'duplicates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${tab === t ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'pending' ? 'Pending' : t === 'validated' ? 'Validated' : 'Duplicates'}
            {t === 'pending' && pendingCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#dc2626] text-white">{pendingCount}</span>
            )}
            {t === 'duplicates' && duplicateGroups.length > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white">{duplicateGroups.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'pending' ? (
        /* ── PENDING ── */
        <div className="space-y-3">
          {pendingList.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm">No pending schools</p>
            </div>
          ) : pendingList.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1a1918]">{p.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {[p.city, p.country].filter(Boolean).join(', ') || 'No location'}
                    {p.submitted_by_email && <> · <span className="text-zinc-500">{p.submitted_by_email}</span></>}
                    {p.submitted_at && <> · {new Date(p.submitted_at).toLocaleDateString('en-GB')}</>}
                  </p>
                  {p.website && <p className="text-xs text-[#c8a96e] mt-0.5">{p.website}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setMergeTarget(p); setMergeSearch(p.name.split(' ')[0] ?? '') }}
                    disabled={actionLoading === p.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50">
                    Merge ↔
                  </button>
                  <button onClick={() => handleApprove(p)}
                    disabled={actionLoading === p.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0d9e75] text-white hover:bg-[#0b8a66] transition-colors disabled:opacity-50">
                    {actionLoading === p.id ? '…' : '✓ Add'}
                  </button>
                  <button onClick={() => handleReject(p)}
                    disabled={actionLoading === p.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors disabled:opacity-50">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'validated' ? (
        /* ── VALIDATED ── */
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">City</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Country</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">Cases</th>
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
              {schools.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">No schools yet</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── DUPLICATES ── */
        <div className="space-y-4">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm">No duplicates detected</p>
            </div>
          ) : duplicateGroups.map((group, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Potential duplicates</p>
              {group.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1a1918]">{s.name}</p>
                    <p className="text-xs text-zinc-400">{[s.city, s.country].filter(Boolean).join(', ')} · {s.case_count ?? 0} cases</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-amber-600 mt-3">Review these schools and merge manually if needed.</p>
            </div>
          ))}
        </div>
      )}

      {/* Merge dialog */}
      {mergeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMergeTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1a1918] mb-1">Merge with existing school</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Pending: <strong className="text-[#1a1918]">{mergeTarget.name}</strong>
            </p>
            <input
              value={mergeSearch}
              onChange={e => setMergeSearch(e.target.value)}
              placeholder="Search school name…"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              autoFocus
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredSchools.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-4">No match</p>
              ) : filteredSchools.map(s => (
                <button key={s.id}
                  onClick={() => void handleMerge(mergeTarget, s.id)}
                  disabled={actionLoading === mergeTarget.id}
                  className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 hover:border-[#c8a96e] hover:bg-amber-50 transition-colors disabled:opacity-50">
                  <p className="text-sm font-medium text-[#1a1918]">{s.name}</p>
                  <p className="text-xs text-zinc-400">{[s.city, s.country].filter(Boolean).join(', ')} · {s.case_count ?? 0} cases</p>
                </button>
              ))}
            </div>
            <button onClick={() => setMergeTarget(null)}
              className="w-full mt-4 px-4 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add school modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[#1a1918] mb-4">Add school</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Name *</label>
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  placeholder="Paris School of Business" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">City</label>
                  <input value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Country</label>
                  <input value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancel</button>
              <button onClick={() => void handleAdd()} disabled={saving || !addForm.name.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50">
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
