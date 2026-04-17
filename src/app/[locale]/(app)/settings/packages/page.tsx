'use client'

import { useEffect, useState } from 'react'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'

interface VisaType { id: string; code: string; name: string }
interface VisaAgent { id: string; company_name: string | null; name: string | null; email?: string | null }

interface Package {
  id: string
  name: string
  package_type: 'Standard' | 'Express' | 'VisaOnly'
  type: string | null
  price_eur: number
  visa_cost_idr: number | null
  gross_margin_eur: number | null
  max_stay_days: number | null
  validity_label: string | null
  processing_days: number | null
  is_visa_only: boolean
  is_direct_client: boolean
  direct_client_form_token: string | null
  description: string | null
  is_active: boolean
  visa_type_id: string | null
  visa_agent_id: string | null
  visa_types: { id: string; code: string; name: string } | null
  visa_agents: { id: string; company_name: string | null; name?: string | null } | null
}

// IDR → EUR approximate rate (16500 IDR = 1 EUR, updated 2026)
const IDR_TO_EUR = 16500

const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

type Form = {
  name: string
  visa_type_id: string
  visa_agent_id: string
  price_eur: string
  visa_cost_idr: string
  type: 'standard' | 'direct_client'
  is_direct_client: boolean
  description: string
  is_active: boolean
}

const emptyForm: Form = {
  name: '',
  visa_type_id: '',
  visa_agent_id: '',
  price_eur: '',
  visa_cost_idr: '',
  type: 'standard',
  is_direct_client: false,
  description: '',
  is_active: true,
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([])
  const [visaAgents, setVisaAgents] = useState<VisaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)

  async function load() {
    setLoading(true)
    const [pkgRes, vtRes, vaRes] = await Promise.all([
      fetch('/api/packages?all=true'),
      fetch('/api/visa-types?all=true'),
      fetch('/api/settings/visa-agents'),
    ])
    setPackages(pkgRes.ok ? await pkgRes.json() : [])
    setVisaTypes(vtRes.ok ? await vtRes.json() : [])
    setVisaAgents(vaRes.ok ? await vaRes.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(p: Package) {
    setEditing(p)
    setForm({
      name: p.name,
      visa_type_id: p.visa_type_id ?? '',
      visa_agent_id: p.visa_agent_id ?? '',
      price_eur: String(p.price_eur),
      visa_cost_idr: p.visa_cost_idr != null ? String(p.visa_cost_idr) : '',
      type: p.is_direct_client ? 'direct_client' : 'standard',
      is_direct_client: p.is_direct_client,
      description: p.description ?? '',
      is_active: p.is_active,
    })
    setShowModal(true)
  }

  async function toggleActive(p: Package) {
    setPackages(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    await fetch(`/api/packages/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !p.is_active }) })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const isDirect = form.type === 'direct_client' || form.is_direct_client
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      visa_type_id: form.visa_type_id || null,
      visa_agent_id: form.visa_agent_id || null,
      price_eur: parseFloat(form.price_eur) || 0,
      visa_cost_idr: form.visa_cost_idr ? parseInt(form.visa_cost_idr) : null,
      type: form.type,
      is_direct_client: isDirect,
      is_visa_only: isDirect,
      package_type: isDirect ? 'VisaOnly' : 'Standard',
      description: form.description.trim() || null,
      is_active: form.is_active,
    }
    if (isDirect && !editing?.direct_client_form_token) {
      body.direct_client_form_token = crypto.randomUUID()
    }
    // gross margin calc
    const priceEur = parseFloat(form.price_eur) || 0
    const costEur = form.visa_cost_idr ? (parseInt(form.visa_cost_idr) / IDR_TO_EUR) : 0
    body.gross_margin_eur = Math.round((priceEur - costEur) * 100) / 100
    const url = editing ? `/api/packages/${editing.id}` : '/api/packages'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowModal(false)
    void load()
  }

  const formatEUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

  const priceEur = parseFloat(form.price_eur) || 0
  const costIdr = form.visa_cost_idr ? parseInt(form.visa_cost_idr) : 0
  const estimatedMargin = priceEur - (costIdr / IDR_TO_EUR)

  const activeCount = packages.filter(p => p.is_active).length

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Packages</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{packages.length} package{packages.length !== 1 ? 's' : ''} · {activeCount} actif{activeCount !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a]">+ Nouveau package</button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>Aucun package configuré.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {['active','inactive'].map(section => {
              const sectionPkgs = packages.filter(p => section === 'active' ? p.is_active : !p.is_active)
              if (!sectionPkgs.length) return null
              return (
                <div key={section}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                    {section === 'active' ? `✅ Actifs (${sectionPkgs.length})` : `⏸ Inactifs (${sectionPkgs.length})`}
                  </p>
                  <div className={['grid grid-cols-1 md:grid-cols-2 gap-4', section === 'inactive' ? 'opacity-60' : ''].join(' ')}>
                    {sectionPkgs.map(pkg => {
              const agentName = pkg.visa_agents?.company_name ?? pkg.visa_agents?.name ?? null
              const margin = pkg.gross_margin_eur ?? (pkg.price_eur - (pkg.visa_cost_idr ? pkg.visa_cost_idr / IDR_TO_EUR : 0))
              const directLink = pkg.is_direct_client && pkg.direct_client_form_token
                ? `/apply/visa-only?token=${pkg.direct_client_form_token}` : null
              return (
                <div key={pkg.id} className={['bg-white border rounded-xl p-5', pkg.is_active ? 'border-zinc-100' : 'border-zinc-100 opacity-60'].join(' ')}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-[#1a1918]">{pkg.name}</p>
                        {pkg.is_direct_client ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Client direct</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Offre principale</span>
                        )}
                        {!pkg.is_active && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">Inactif</span>}
                      </div>
                      {pkg.description && <p className="text-xs text-zinc-500 mb-1">{pkg.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#1a1918]">{formatEUR(pkg.price_eur)}</p>
                      {margin > 0 && <p className="text-xs text-[#0d9e75] font-medium">+{formatEUR(margin)} marge</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-3">
                    {pkg.visa_types && <span>Visa: <strong className="text-[#1a1918]">{pkg.visa_types.code}</strong></span>}
                    {agentName && <span>Agent: <strong className="text-[#1a1918]">{agentName}</strong></span>}
                    {pkg.visa_cost_idr && <span>Coût: <strong className="text-[#1a1918]">{formatIDR(pkg.visa_cost_idr)}</strong></span>}
                  </div>
                  {directLink && (
                    <div className="bg-zinc-50 rounded-lg p-2.5 mb-3">
                      <p className="text-[10px] text-zinc-400 uppercase">Lien formulaire client direct</p>
                      <p className="font-mono text-[11px] text-zinc-600 break-all">{directLink}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                    <button onClick={() => openEdit(pkg)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600">Modifier</button>
                    <button
                      onClick={() => toggleActive(pkg)}
                      className={['w-10 h-6 rounded-full transition-colors relative', pkg.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'].join(' ')}
                    >
                      <div className={['absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', pkg.is_active ? 'translate-x-5' : 'translate-x-1'].join(' ')} />
                    </button>
                  </div>
                </div>
              )
            })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? 'Modifier package' : 'Nouveau package'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 text-xl">×</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom du package *</label>
                  <input required className={inputCls} placeholder="Ex: C22B Standard" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                  <select className={inputCls} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as 'standard' | 'direct_client', is_direct_client: e.target.value === 'direct_client'}))}>
                    <option value="standard">Standard (stagiaire)</option>
                    <option value="direct_client">Client direct (visa only)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Type de visa</label>
                    <select className={inputCls} value={form.visa_type_id} onChange={e => setForm(p => ({...p, visa_type_id: e.target.value}))}>
                      <option value="">—</option>
                      {visaTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.code} — {vt.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <SearchableSelect
                      label="Agent visa *"
                      items={visaAgents.map<SearchableSelectItem>(a => {
                        const name = a.company_name ?? a.name ?? '—'
                        return {
                          id: a.id,
                          label: name,
                          sublabel: a.email ?? undefined,
                          avatar: name[0]?.toUpperCase(),
                        }
                      })}
                      value={form.visa_agent_id || null}
                      onChange={item => setForm(p => ({...p, visa_agent_id: item?.id ?? ''}))}
                      placeholder="Sélectionner un agent visa…"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Prix de vente (EUR) *</label>
                    <input type="number" required className={inputCls} value={form.price_eur} onChange={e => setForm(p => ({...p, price_eur: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Coût agent (IDR)</label>
                    <input type="number" className={inputCls} value={form.visa_cost_idr} onChange={e => setForm(p => ({...p, visa_cost_idr: e.target.value}))} />
                  </div>
                </div>
                {(priceEur > 0 || costIdr > 0) && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-[#0d9e75] font-medium">Marge estimée: ~{formatEUR(estimatedMargin)}</p>
                    <p className="text-[10px] text-zinc-500">Taux IDR/EUR: 1 EUR ≈ {IDR_TO_EUR.toLocaleString()} IDR (indicatif)</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                  <textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} />
                  Actif
                </label>
                {editing?.is_direct_client && editing.direct_client_form_token && (
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-zinc-400 uppercase">Lien formulaire client direct</p>
                    <p className="font-mono text-xs text-zinc-600 break-all">/apply/visa-only?token={editing.direct_client_form_token}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
