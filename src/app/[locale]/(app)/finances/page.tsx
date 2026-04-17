'use client'
import { useEffect, useState, useCallback } from 'react'

const EUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

const SUPPLIER_TYPES = [
  { value: 'visa_agent', label: '🛂 Agent visa', color: 'bg-blue-100 text-blue-700' },
  { value: 'accommodation', label: '🏠 Hébergement', color: 'bg-amber-100 text-amber-700' },
  { value: 'transport', label: '🚗 Transport', color: 'bg-green-100 text-green-700' },
  { value: 'marketing', label: '📣 Marketing', color: 'bg-purple-100 text-purple-700' },
  { value: 'software', label: '💻 Logiciel', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'tax', label: '🏦 Fiscal/légal', color: 'bg-red-100 text-red-700' },
  { value: 'other', label: '📦 Autre', color: 'bg-zinc-100 text-zinc-700' },
]

type Invoice = {
  id: string
  invoice_number: string | null
  supplier_name: string
  supplier_type: string
  category: string
  amount_eur: number | null
  amount_local: number | null
  currency: string
  exchange_rate: number | null
  invoice_date: string
  due_date: string | null
  paid_at: string | null
  payment_method: string | null
  pdf_url: string | null
  notes: string | null
  visa_agent_invoice_lines?: VisaLine[]
}

type VisaLine = {
  id: string
  case_id: string | null
  intern_name: string | null
  visa_type: string | null
  amount_eur: number | null
  paid: boolean
}

type CaseSummary = {
  id: string
  status: string
  interns: { first_name: string; last_name: string } | null
  billing_entries?: { type: string; amount_eur: number; label: string }[]
}

type Stats = {
  revenue_ytd: number
  cost_ytd: number
  margin_ytd: number
  unpaid_visa_cost: number
  pending_invoices: number
}

export default function FinancesPage() {
  const [tab, setTab] = useState<'overview' | 'invoices' | 'visa_import'>('overview')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [stats, setStats] = useState<Stats>({ revenue_ytd: 0, cost_ytd: 0, margin_ytd: 0, unpaid_visa_cost: 0, pending_invoices: 0 })
  const [loading, setLoading] = useState(true)

  // Invoice form
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'general' | 'visa_agent'>('general')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    invoice_number: '', supplier_name: '', supplier_type: 'other',
    amount_eur: '', amount_local: '', currency: 'IDR',
    exchange_rate: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', paid_at: '', payment_method: '', pdf_url: '', notes: '',
  })
  const [visaLines, setVisaLines] = useState<{ case_id: string; intern_name: string; visa_type: string; amount_eur: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, casesRes] = await Promise.all([
      fetch('/api/finances/invoices'),
      fetch('/api/finances/cases'),
    ])
    const invData = invRes.ok ? await invRes.json() as Invoice[] : []
    const casesData = casesRes.ok ? await casesRes.json() as CaseSummary[] : []
    setInvoices(invData)
    setCases(casesData)

    // Compute stats from billing_entries
    let rev = 0, cost = 0, unpaid = 0
    casesData.forEach(c => {
      (c.billing_entries ?? []).forEach(b => {
        if (b.type === 'revenue') rev += b.amount_eur
        if (b.type === 'cost') cost += b.amount_eur
      })
    })
    const unpaidInvoices = invData.filter(i => !i.paid_at && i.supplier_type === 'visa_agent')
    unpaid = unpaidInvoices.reduce((s, i) => s + (i.amount_eur ?? 0), 0)

    setStats({
      revenue_ytd: rev,
      cost_ytd: cost,
      margin_ytd: rev - cost,
      unpaid_visa_cost: unpaid,
      pending_invoices: unpaidInvoices.length,
    })
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSaveInvoice(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = {
      ...form,
      supplier_type: formType === 'visa_agent' ? 'visa_agent' : form.supplier_type,
      amount_eur: form.amount_eur ? parseFloat(form.amount_eur) : null,
      amount_local: form.amount_local ? parseFloat(form.amount_local) : null,
      exchange_rate: form.exchange_rate ? parseFloat(form.exchange_rate) : null,
      visa_lines: formType === 'visa_agent' ? visaLines.map(l => ({
        ...l, amount_eur: parseFloat(l.amount_eur) || 0,
      })) : [],
    }
    await fetch('/api/finances/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setSaving(false)
    setShowForm(false)
    setVisaLines([])
    setForm({ invoice_number: '', supplier_name: '', supplier_type: 'other', amount_eur: '', amount_local: '', currency: 'IDR', exchange_rate: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', paid_at: '', payment_method: '', pdf_url: '', notes: '' })
    void load()
  }

  async function markPaid(id: string) {
    await fetch(`/api/finances/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid_at: new Date().toISOString() }),
    })
    void load()
  }

  const typeInfo = (t: string) => SUPPLIER_TYPES.find(s => s.value === t) ?? SUPPLIER_TYPES[SUPPLIER_TYPES.length - 1]

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
            <p className="text-sm text-zinc-400">Facturation, coûts fournisseurs, agent visa</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]">
            + Importer facture
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Revenus YTD', value: EUR(stats.revenue_ytd), color: 'text-[#0d9e75]' },
            { label: 'Coûts YTD', value: EUR(stats.cost_ytd), color: 'text-red-500' },
            { label: 'Marge brute', value: EUR(stats.margin_ytd), color: stats.margin_ytd >= 0 ? 'text-[#0d9e75]' : 'text-red-500' },
            { label: 'Factures visa impayées', value: EUR(stats.unpaid_visa_cost), color: 'text-amber-600',
              sub: stats.pending_invoices ? `${stats.pending_invoices} facture${stats.pending_invoices > 1 ? 's' : ''}` : undefined },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-white border border-zinc-100 rounded-2xl p-4">
              <p className="text-xs text-zinc-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-6">
          {([['overview', '📊 Vue générale'], ['invoices', '🧾 Factures'], ['visa_import', '🛂 Import visa']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white shadow text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Flux par dossier actifs</p>
            {loading ? <div className="h-40 bg-zinc-100 rounded-xl animate-pulse"/> : cases.filter(c => (c.billing_entries?.length ?? 0) > 0).map(c => {
              const intern = c.interns
              const revenue = (c.billing_entries ?? []).filter(b => b.type === 'revenue').reduce((s, b) => s + b.amount_eur, 0)
              const cost = (c.billing_entries ?? []).filter(b => b.type === 'cost').reduce((s, b) => s + b.amount_eur, 0)
              return (
                <div key={c.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1918]">{intern ? `${intern.first_name} ${intern.last_name}` : c.id}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      {(c.billing_entries ?? []).map(b => (
                        <span key={b.label} className={b.type === 'revenue' ? 'text-[#0d9e75]' : 'text-red-500'}>
                          {b.type === 'revenue' ? '+' : '-'}{EUR(b.amount_eur)} {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${revenue - cost >= 0 ? 'text-[#0d9e75]' : 'text-red-500'}`}>{EUR(revenue - cost)}</p>
                    <p className="text-xs text-zinc-400">marge</p>
                  </div>
                </div>
              )
            })}
            {!loading && cases.filter(c => (c.billing_entries?.length ?? 0) > 0).length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Aucune entrée de facturation. Validez un paiement pour voir les flux apparaître.</div>
            )}
          </div>
        )}

        {/* INVOICES TAB */}
        {tab === 'invoices' && (
          <div className="space-y-3">
            {loading ? <div className="h-40 bg-zinc-100 rounded-xl animate-pulse"/> : invoices.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">Aucune facture importée. Cliquez sur "+ Importer facture" pour commencer.</div>
            ) : invoices.map(inv => {
              const ti = typeInfo(inv.supplier_type)
              return (
                <div key={inv.id} className={`bg-white border rounded-xl p-4 ${inv.paid_at ? 'border-zinc-100' : 'border-amber-100'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ti.color}`}>{ti.label}</span>
                        {!inv.paid_at && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">⏳ Impayée</span>}
                        {inv.paid_at && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-[#0d9e75] font-medium">✅ Payée</span>}
                      </div>
                      <p className="text-sm font-semibold text-[#1a1918]">{inv.supplier_name}</p>
                      <p className="text-xs text-zinc-400">{inv.invoice_number ? `N° ${inv.invoice_number} · ` : ''}{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                      {inv.notes && <p className="text-xs text-zinc-400 mt-0.5 truncate">{inv.notes}</p>}
                      {/* Visa lines */}
                      {inv.visa_agent_invoice_lines && inv.visa_agent_invoice_lines.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {inv.visa_agent_invoice_lines.map(l => (
                            <div key={l.id} className="flex items-center gap-2 text-xs text-zinc-500">
                              <span>·</span>
                              <span>{l.intern_name ?? 'Intern'}</span>
                              {l.visa_type && <span className="text-zinc-400">({l.visa_type})</span>}
                              {l.amount_eur && <span className="text-[#1a1918] font-medium">{EUR(l.amount_eur)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#1a1918]">{inv.amount_eur ? EUR(inv.amount_eur) : '—'}</p>
                      {inv.amount_local && inv.currency !== 'EUR' && (
                        <p className="text-xs text-zinc-400">{inv.amount_local.toLocaleString('id-ID')} {inv.currency}</p>
                      )}
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#c8a96e] hover:underline">📄 PDF</a>
                      )}
                      {!inv.paid_at && (
                        <button onClick={() => markPaid(inv.id)}
                          className="mt-2 block text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg hover:bg-green-700">
                          Marquer payée
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* VISA IMPORT TAB */}
        {tab === 'visa_import' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">🛂 Import facture agent visa</p>
              <p className="text-xs">L'agent visa facture par période (ex: mensuel). Importez la facture ici et associez chaque ligne aux dossiers clients concernés pour tracer tous les paiements.</p>
            </div>
            <button onClick={() => { setFormType('visa_agent'); setShowForm(true) }}
              className="w-full py-3 border-2 border-dashed border-[#c8a96e] rounded-2xl text-sm text-[#c8a96e] font-semibold hover:bg-[#c8a96e]/5">
              + Importer une facture agent visa
            </button>

            {/* Unpaid visa lines */}
            {invoices.filter(i => i.supplier_type === 'visa_agent' && !i.paid_at).length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Factures visa non réglées</p>
                {invoices.filter(i => i.supplier_type === 'visa_agent' && !i.paid_at).map(inv => (
                  <div key={inv.id} className="bg-white border border-amber-100 rounded-xl p-4 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{inv.supplier_name}</p>
                        <p className="text-xs text-zinc-400">{new Date(inv.invoice_date).toLocaleDateString('fr-FR')} {inv.due_date ? `· Échéance: ${new Date(inv.due_date).toLocaleDateString('fr-FR')}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a1918]">{inv.amount_eur ? EUR(inv.amount_eur) : '—'}</p>
                        <button onClick={() => markPaid(inv.id)}
                          className="text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg mt-1">
                          Régler
                        </button>
                      </div>
                    </div>
                    {inv.visa_agent_invoice_lines?.map(l => (
                      <div key={l.id} className="flex justify-between items-center py-1 border-t border-zinc-50 text-xs">
                        <span className="text-zinc-600">{l.intern_name} {l.visa_type ? `(${l.visa_type})` : ''}</span>
                        <span className="font-medium">{l.amount_eur ? EUR(l.amount_eur) : '—'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL IMPORT FACTURE */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-[#1a1918]">Importer une facture</h2>
                  <div className="flex gap-2 mt-1.5">
                    {(['general', 'visa_agent'] as const).map(t => (
                      <button key={t} onClick={() => setFormType(t)}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${formType === t ? 'bg-[#c8a96e] text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                        {t === 'general' ? '📦 Fournisseur général' : '🛂 Agent visa'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="text-zinc-400 text-xl">×</button>
              </div>

              <form onSubmit={handleSaveInvoice} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Type tag (hidden if visa_agent) */}
                {formType === 'general' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie *</label>
                    <div className="flex flex-wrap gap-2">
                      {SUPPLIER_TYPES.map(t => (
                        <button key={t.value} type="button"
                          onClick={() => setForm(p => ({ ...p, supplier_type: t.value }))}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${form.supplier_type === t.value ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fournisseur *</label>
                    <input required className={inp} value={form.supplier_name} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))} placeholder="Nom du fournisseur" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">N° facture</label>
                    <input className={inp} value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Montant EUR</label>
                    <input type="number" step="0.01" className={inp} value={form.amount_eur} onChange={e => setForm(p => ({ ...p, amount_eur: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Montant local</label>
                    <input type="number" className={inp} value={form.amount_local} onChange={e => setForm(p => ({ ...p, amount_local: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Devise</label>
                    <select className={inp} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                      <option>IDR</option><option>EUR</option><option>USD</option><option>SGD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Date facture *</label>
                    <input required type="date" className={inp} value={form.invoice_date} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Échéance</label>
                    <input type="date" className={inp} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Date paiement (si déjà payée)</label>
                    <input type="date" className={inp} value={form.paid_at} onChange={e => setForm(p => ({ ...p, paid_at: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Mode de paiement</label>
                    <select className={inp} value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                      <option value="">—</option>
                      <option>Virement bancaire</option><option>Wise</option><option>PayPal</option>
                      <option>Carte</option><option>Espèces</option><option>Crypto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">URL PDF facture</label>
                  <input type="url" className={inp} value={form.pdf_url} onChange={e => setForm(p => ({ ...p, pdf_url: e.target.value }))} placeholder="https://…" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                  <textarea className={inp} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>

                {/* Visa agent lines */}
                {formType === 'visa_agent' && (
                  <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Lignes par stagiaire</p>
                      <button type="button" onClick={() => setVisaLines(l => [...l, { case_id: '', intern_name: '', visa_type: '', amount_eur: '' }])}
                        className="text-xs text-blue-700 hover:underline">+ Ajouter ligne</button>
                    </div>
                    <div className="space-y-2">
                      {visaLines.map((line, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <select className={`${inp} text-xs`} value={line.case_id}
                              onChange={e => {
                                const c = cases.find(x => x.id === e.target.value)
                                setVisaLines(ls => ls.map((l, j) => j === i ? {
                                  ...l, case_id: e.target.value,
                                  intern_name: c?.interns ? `${c.interns.first_name} ${c.interns.last_name}` : ''
                                } : l))
                              }}>
                              <option value="">— Stagiaire —</option>
                              {cases.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : c.id.slice(0, 8)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input className={`${inp} text-xs`} placeholder="Type visa" value={line.visa_type}
                              onChange={e => setVisaLines(ls => ls.map((l, j) => j === i ? { ...l, visa_type: e.target.value } : l))} />
                          </div>
                          <div className="col-span-3">
                            <input type="number" className={`${inp} text-xs`} placeholder="Montant EUR" value={line.amount_eur}
                              onChange={e => setVisaLines(ls => ls.map((l, j) => j === i ? { ...l, amount_eur: e.target.value } : l))} />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button type="button" onClick={() => setVisaLines(ls => ls.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                      {visaLines.length === 0 && (
                        <p className="text-xs text-zinc-400 text-center py-2">Cliquez "+ Ajouter ligne" pour associer des stagiaires à cette facture</p>
                      )}
                    </div>
                    {visaLines.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-100 flex justify-end">
                        <p className="text-xs font-semibold text-blue-800">
                          Total lignes: {EUR(visaLines.reduce((s, l) => s + (parseFloat(l.amount_eur) || 0), 0))}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-bold bg-[#c8a96e] text-white rounded-xl disabled:opacity-50">
                    {saving ? 'Import…' : 'Importer'}
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
