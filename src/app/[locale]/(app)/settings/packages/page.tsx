'use client'
import { useEffect, useState } from 'react'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'

interface VisaType { id: string; code: string; name: string }
interface VisaAgent { id: string; company_name: string | null; name: string | null; email?: string | null }
interface Package {
  id: string; name: string; price_eur: number; visa_cost_idr: number | null
  gross_margin_eur: number | null; description: string | null
  is_active: boolean; is_direct_client: boolean; direct_client_form_token: string | null
  visa_type_id: string | null; visa_agent_id: string | null
  visa_types: { code: string } | null
  visa_agents: { company_name: string | null; name?: string | null } | null
}

const IDR_TO_EUR = 16500
const cls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'
const EUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const IDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

type Form = {
  name: string; visa_type_id: string; visa_agent_id: string
  price_eur: string; visa_cost_idr: string
  type: 'standard' | 'direct_client'; description: string; is_active: boolean
}
const EMPTY: Form = { name: '', visa_type_id: '', visa_agent_id: '', price_eur: '', visa_cost_idr: '', type: 'standard', description: '', is_active: true }

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([])
  const [visaAgents, setVisaAgents] = useState<VisaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState<Package | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const [pkgR, vtR, vaR] = await Promise.all([
      fetch('/api/packages?all=true'),
      fetch('/api/visa-types?all=true'),
      fetch('/api/settings/visa-agents'),
    ])
    setPackages(pkgR.ok ? await pkgR.json() : [])
    setVisaTypes(vtR.ok ? await vtR.json() : [])
    setVisaAgents(vaR.ok ? await vaR.json() : [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function openEdit(p: Package) {
    setEditing(p)
    setForm({
      name: p.name, visa_type_id: p.visa_type_id ?? '', visa_agent_id: p.visa_agent_id ?? '',
      price_eur: String(p.price_eur), visa_cost_idr: p.visa_cost_idr != null ? String(p.visa_cost_idr) : '',
      type: p.is_direct_client ? 'direct_client' : 'standard',
      description: p.description ?? '', is_active: p.is_active,
    })
    setShowModal(true)
  }

  async function toggleActive(p: Package) {
    setPackages(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    await fetch(`/api/packages/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    await fetch(`/api/packages/${confirmDelete.id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDelete(null)
    void load()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const isDirect = form.type === 'direct_client'
    const priceEur = parseFloat(form.price_eur) || 0
    const costIdr = form.visa_cost_idr ? parseInt(form.visa_cost_idr) : 0
    const body = {
      name: form.name.trim(),
      visa_type_id: form.visa_type_id || null,
      visa_agent_id: form.visa_agent_id || null,
      price_eur: priceEur,
      visa_cost_idr: costIdr || null,
      type: form.type,
      is_direct_client: isDirect,
      is_visa_only: isDirect,
      package_type: isDirect ? 'VisaOnly' : 'Standard',
      description: form.description.trim() || null,
      is_active: form.is_active,
      gross_margin_eur: Math.round((priceEur - costIdr / IDR_TO_EUR) * 100) / 100,
      ...(isDirect && !editing?.direct_client_form_token ? { direct_client_form_token: crypto.randomUUID() } : {}),
    }
    const url = editing ? `/api/packages/${editing.id}` : '/api/packages'
    await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setShowModal(false); void load()
  }

  const priceEur = parseFloat(form.price_eur) || 0
  const costIdr = form.visa_cost_idr ? parseInt(form.visa_cost_idr) : 0
  const margin = priceEur - costIdr / IDR_TO_EUR
  const active = packages.filter(p => p.is_active)
  const inactive = packages.filter(p => !p.is_active)

  function PackageCard({ pkg }: { pkg: Package }) {
    const agentName = pkg.visa_agents?.company_name ?? pkg.visa_agents?.name ?? null
    const m = pkg.gross_margin_eur ?? (pkg.price_eur - (pkg.visa_cost_idr ? pkg.visa_cost_idr / IDR_TO_EUR : 0))
    const directLink = pkg.is_direct_client && pkg.direct_client_form_token
      ? `/apply/visa-only?token=${pkg.direct_client_form_token}` : null
    return (
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-[#1a1918]">{pkg.name}</p>
              {pkg.is_direct_client
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Client direct</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Standard</span>
              }
            </div>
            {pkg.description && <p className="text-xs text-zinc-500">{pkg.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-[#1a1918]">{EUR(pkg.price_eur)}</p>
            {m > 0 && <p className="text-xs text-[#0d9e75] font-medium">+{EUR(m)}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-3">
          {pkg.visa_types && <span>Visa <strong className="text-[#1a1918]">{pkg.visa_types.code}</strong></span>}
          {agentName && <span>Agent <strong className="text-[#1a1918]">{agentName}</strong></span>}
          {pkg.visa_cost_idr && <span>Coût {IDR(pkg.visa_cost_idr)}</span>}
        </div>

        {directLink && (
          <div className="bg-zinc-50 rounded-lg p-2 mb-3 font-mono text-[10px] text-zinc-500 truncate">{directLink}</div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(pkg)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              ✏️ Modifier
            </button>
            <button
              onClick={() => setConfirmDelete(pkg)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium">
              🗑 Supprimer
            </button>
          </div>
          <button
            onClick={() => toggleActive(pkg)}
            title={pkg.is_active ? 'Désactiver' : 'Activer'}
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${pkg.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pkg.is_active ? 'translate-x-5' : 'translate-x-1'}`}/>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Packages</h1>
            <p className="text-sm text-zinc-400">{packages.length} packages · {active.length} actifs</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-[#c8a96e] text-white hover:bg-[#b8945a]">
            + Nouveau package
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-40 bg-zinc-100 rounded-xl animate-pulse"/>)}</div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-4xl mb-3">📦</p>
            <p>Aucun package configuré.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">✅ Actifs ({active.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.map(p => <PackageCard key={p.id} pkg={p}/>)}
                </div>
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">⏸ Inactifs ({inactive.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  {inactive.map(p => <PackageCard key={p.id} pkg={p}/>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRMATION SUPPRESSION ── */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <p className="text-4xl mb-3 text-center">🗑</p>
              <h3 className="text-base font-bold text-[#1a1918] mb-1 text-center">Supprimer ce package ?</h3>
              <p className="text-sm text-zinc-500 text-center mb-2">{confirmDelete.name}</p>
              <p className="text-xs text-zinc-400 text-center mb-5">Cette action est irréversible. Les dossiers déjà associés ne seront pas affectés.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50">
                  Annuler
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 disabled:opacity-50">
                  {deleting ? 'Suppression…' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CRÉER / MODIFIER ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? `Modifier · ${editing.name}` : 'Nouveau package'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 text-xl leading-none">×</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                  <input required className={cls} placeholder="C22B Standard 6 mois — 990€" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                  <select className={cls} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as 'standard' | 'direct_client'}))}>
                    <option value="standard">Standard (stagiaire)</option>
                    <option value="direct_client">Client direct (visa only)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Visa</label>
                    <select className={cls} value={form.visa_type_id} onChange={e => setForm(p => ({...p, visa_type_id: e.target.value}))}>
                      <option value="">—</option>
                      {visaTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.code} — {vt.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <SearchableSelect
                      label="Agent visa"
                      items={visaAgents.map<SearchableSelectItem>(a => { const n = a.company_name ?? a.name ?? '—'; return { id: a.id, label: n, sublabel: a.email ?? undefined, avatar: n[0]?.toUpperCase() } })}
                      value={form.visa_agent_id || null}
                      onChange={item => setForm(p => ({...p, visa_agent_id: item?.id ?? ''}))}
                      placeholder="Agent visa…"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Prix (EUR) *</label>
                    <input type="number" required className={cls} value={form.price_eur} onChange={e => setForm(p => ({...p, price_eur: e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Coût agent (IDR)</label>
                    <input type="number" className={cls} value={form.visa_cost_idr} onChange={e => setForm(p => ({...p, visa_cost_idr: e.target.value}))}/>
                  </div>
                </div>
                {(priceEur > 0 || costIdr > 0) && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-[#0d9e75] font-medium">
                    Marge estimée : {EUR(margin)} · ({((margin/priceEur)*100).toFixed(0)}%)
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                  <textarea className={cls} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}/>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))}/>
                  Package actif (visible dans le sélecteur)
                </label>
                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#c8a96e] text-white disabled:opacity-50">
                    {saving ? 'Sauvegarde…' : editing ? 'Sauvegarder' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
