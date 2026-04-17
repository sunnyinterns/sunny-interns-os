'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

const EUR  = (v: number) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(v)
const inp  = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'
const TABS = ['overview','invoices','billing','payouts'] as const
type Tab = typeof TABS[number]

// ─── Types ────────────────────────────────────────────────────────────────
type Invoice = {
  id:string; invoice_number:string|null; supplier_name:string; supplier_type:string
  amount_eur:number|null; amount_local:number|null; currency:string
  invoice_date:string; due_date:string|null; paid_at:string|null
  payment_method:string|null; pdf_url:string|null; notes:string|null
  extracted_by_ai:boolean; extraction_confidence:string|null
  visa_agent_invoice_lines?:{id:string;intern_name:string|null;visa_type:string|null;amount_eur:number|null}[]
}
type BillingEntry = {
  id:string; type:string; category:string; label:string; amount_eur:number
  billing_type:string; invoice_number:string|null; due_date:string|null
  paid_at:string|null; payment_method:string|null; recorded_at:string
  cases?:{id:string; interns?:{first_name:string;last_name:string}|null}|null
}
type Associate = {
  id:string; name:string; assoc_role:string; email:string|null
  share_pct:number; iban:string|null; wise_email:string|null
  associate_payouts?:Payout[]
}
type Payout = {
  id:string; associate_id:string; period_label:string
  gross_revenue:number; total_costs:number; net_profit:number
  share_pct:number; amount_due:number; amount_paid:number
  paid_at:string|null; payment_method:string|null; payment_ref:string|null
  status:string; notes:string|null
}
type Extraction = {
  invoice_number?:string|null; supplier_name?:string|null
  invoice_date?:string|null; due_date?:string|null
  amount_total?:string|null; currency?:string|null
  amount_eur?:string|null; description?:string|null
}

const SUPPLIER_TYPES = [
  {v:'visa_agent',l:'🛂 Agent visa',c:'bg-blue-100 text-blue-700'},
  {v:'accommodation',l:'🏠 Hébergement',c:'bg-amber-100 text-amber-700'},
  {v:'transport',l:'🚗 Transport',c:'bg-green-100 text-green-700'},
  {v:'marketing',l:'📣 Marketing',c:'bg-purple-100 text-purple-700'},
  {v:'software',l:'💻 Software',c:'bg-cyan-100 text-cyan-700'},
  {v:'tax',l:'🏦 Fiscal/Légal',c:'bg-red-100 text-red-700'},
  {v:'other',l:'📦 Autre',c:'bg-zinc-100 text-zinc-700'},
]
const typeInfo = (t:string) => SUPPLIER_TYPES.find(s=>s.v===t) ?? SUPPLIER_TYPES[SUPPLIER_TYPES.length-1]

export default function FinancesPage() {
  const [tab, setTab]           = useState<Tab>('overview')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billing, setBilling]   = useState<BillingEntry[]>([])
  const [associates, setAssociates] = useState<Associate[]>([])
  const [payouts, setPayouts]   = useState<Payout[]>([])
  const [loading, setLoading]   = useState(true)

  // Invoice upload state
  const [showInvForm, setShowInvForm] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadDone, setUploadDone]   = useState(false)
  const [extraction, setExtraction]   = useState<Extraction|null>(null)
  const [extractConf, setExtractConf] = useState<string>('low')
  const [filePath, setFilePath]       = useState<string>('')
  const [pdfUrl, setPdfUrl]           = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [invForm, setInvForm] = useState({
    invoice_number:'', supplier_name:'', supplier_type:'other',
    amount_eur:'', amount_local:'', currency:'IDR',
    invoice_date: new Date().toISOString().slice(0,10),
    due_date:'', paid_at:'', payment_method:'', notes:'',
  })
  const [savingInv, setSavingInv] = useState(false)

  // Payout state
  const [showPayoutForm, setShowPayoutForm] = useState(false)
  const [payoutMode, setPayoutMode]         = useState<'auto'|'manual'>('auto')
  const [payoutForm, setPayoutForm]         = useState({
    period_label:'', period_start:'', period_end:'',
    associate_id:'', amount_due:'', payment_method:'', payment_ref:'', notes:''
  })
  const [savingPayout, setSavingPayout] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [invR, bilR, assR, payR] = await Promise.all([
      fetch('/api/finances/invoices'),
      fetch('/api/finances/billing-entries'),
      fetch('/api/finances/associates'),
      fetch('/api/finances/associates/payouts'),
    ])
    setInvoices(invR.ok ? await invR.json() as Invoice[] : [])
    setBilling(bilR.ok ? await bilR.json() as BillingEntry[] : [])
    setAssociates(assR.ok ? await assR.json() as Associate[] : [])
    setPayouts(payR.ok ? await payR.json() as Payout[] : [])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  // ── Stats ─────────────────────────────────────────────────────────────
  const revenue   = billing.filter(b=>b.type==='revenue').reduce((s,b)=>s+b.amount_eur,0)
  const costs     = billing.filter(b=>b.type==='cost').reduce((s,b)=>s+b.amount_eur,0)
  const invCosts  = invoices.filter(i=>!i.paid_at).reduce((s,i)=>s+(i.amount_eur??0),0)
  const netProfit = revenue - costs - invoices.reduce((s,i)=>s+(i.amount_eur??0),0)
  const pendingPayouts = payouts.filter(p=>!p.paid_at).reduce((s,p)=>s+p.amount_due,0)

  // ── Upload invoice ─────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setExtraction(null); setUploadDone(false)
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/finances/invoices/upload', { method:'POST', body:fd })
    if (r.ok) {
      const d = await r.json() as {
        file_path:string; pdf_url:string; extracted:Extraction
        category:string; confidence:string
      }
      setFilePath(d.file_path); setPdfUrl(d.pdf_url)
      setExtraction(d.extracted); setExtractConf(d.confidence)
      setInvForm(f => ({
        ...f,
        invoice_number: d.extracted.invoice_number ?? f.invoice_number,
        supplier_name: d.extracted.supplier_name ?? f.supplier_name,
        invoice_date: d.extracted.invoice_date ?? f.invoice_date,
        due_date: d.extracted.due_date ?? f.due_date,
        amount_eur: d.extracted.amount_eur ?? f.amount_eur,
        amount_local: d.extracted.amount_total ?? f.amount_local,
        currency: d.extracted.currency ?? f.currency,
        notes: d.extracted.description ?? f.notes,
        supplier_type: d.category,
      }))
      setUploadDone(true)
    }
    setUploading(false)
  }

  async function handleSaveInv(e: React.FormEvent) {
    e.preventDefault(); setSavingInv(true)
    await fetch('/api/finances/invoices', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        ...invForm,
        file_path: filePath || null,
        pdf_url: pdfUrl || null,
        extracted_by_ai: !!extraction,
        extraction_confidence: extractConf,
        amount_eur: invForm.amount_eur ? parseFloat(invForm.amount_eur) : null,
        amount_local: invForm.amount_local ? parseFloat(invForm.amount_local) : null,
      }),
    })
    setSavingInv(false); setShowInvForm(false); setExtraction(null); setUploadDone(false)
    setInvForm({ invoice_number:'', supplier_name:'', supplier_type:'other', amount_eur:'', amount_local:'', currency:'IDR', invoice_date:new Date().toISOString().slice(0,10), due_date:'', paid_at:'', payment_method:'', notes:'' })
    void load()
  }

  async function markInvPaid(id:string) {
    await fetch(`/api/finances/invoices/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ paid_at: new Date().toISOString() }),
    }); void load()
  }

  // ── Payouts ──────────────────────────────────────────────────────────
  async function handleCreatePayout(e: React.FormEvent) {
    e.preventDefault(); setSavingPayout(true)
    if (payoutMode === 'auto') {
      await fetch('/api/finances/associates/payouts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'auto', ...payoutForm }),
      })
    } else {
      await fetch('/api/finances/associates/payouts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ mode:'manual', ...payoutForm, amount_due: parseFloat(payoutForm.amount_due)||0 }),
      })
    }
    setSavingPayout(false); setShowPayoutForm(false); void load()
  }

  async function markPayoutPaid(p: Payout) {
    const method = window.prompt('Mode de paiement (Wise / Virement / ...) ?') ?? 'Wise'
    const ref = window.prompt('Référence paiement (optionnel)') ?? ''
    await fetch('/api/finances/associates/payouts', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:p.id, amount_paid:p.amount_due, payment_method:method, payment_ref:ref }),
    }); void load()
  }

  const confBadge = (c:string|null) => c==='high'
    ? 'bg-green-100 text-green-700' : c==='medium'
    ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
            <p className="text-sm text-zinc-400">Facturation · Coûts · Suivi des revenus · Payouts associés</p>
          </div>
          <button onClick={() => setShowInvForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]">
            + Importer facture
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { l:'Revenus', v:EUR(revenue), c:'text-[#0d9e75]' },
            { l:'Coûts directs', v:EUR(costs), c:'text-red-500' },
            { l:'Factures fournisseurs', v:EUR(invoices.reduce((s,i)=>s+(i.amount_eur??0),0)), c:'text-orange-500' },
            { l:'Bénéfice net', v:EUR(netProfit), c: netProfit>=0 ? 'text-[#0d9e75]':'text-red-500' },
            { l:'Payouts en attente', v:EUR(pendingPayouts), c:'text-amber-600' },
          ].map(({l,v,c}) => (
            <div key={l} className="bg-white border border-zinc-100 rounded-2xl p-4">
              <p className="text-xs text-zinc-400 mb-1">{l}</p>
              <p className={`text-xl font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-6 flex-wrap">
          {([['overview','📊 Vue générale'],['invoices','🧾 Factures fournisseurs'],['billing','💳 Suivi billings'],['payouts','💸 Payouts associés']] as const).map(([t,label]) => (
            <button key={t} onClick={() => setTab(t as Tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab===t?'bg-white shadow text-[#1a1918]':'text-zinc-500 hover:text-zinc-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ────────────────────────────────────────────────── */}
        {tab==='overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Répartition charges */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Charges par catégorie</p>
                {SUPPLIER_TYPES.map(t => {
                  const total = invoices.filter(i=>i.supplier_type===t.v).reduce((s,i)=>s+(i.amount_eur??0),0)
                  if (!total) return null
                  return (
                    <div key={t.v} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.c}`}>{t.l}</span>
                      <span className="text-sm font-semibold text-[#1a1918]">{EUR(total)}</span>
                    </div>
                  )
                })}
                {invoices.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Aucune facture importée</p>}
              </div>

              {/* Résumé associés */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Répartition bénéfices</p>
                {associates.map(a => {
                  const due = a.associate_payouts?.filter(p=>!p.paid_at).reduce((s,p)=>s+p.amount_due,0) ?? 0
                  const paid = a.associate_payouts?.filter(p=>!!p.paid_at).reduce((s,p)=>s+p.amount_paid,0) ?? 0
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-[#c8a96e]/15 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
                        {a.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1a1918]">{a.name}</p>
                        <p className="text-xs text-zinc-400">{a.share_pct}% des bénéfices</p>
                      </div>
                      <div className="text-right">
                        {due > 0 && <p className="text-xs font-bold text-amber-600">{EUR(due)} dû</p>}
                        {paid > 0 && <p className="text-xs text-zinc-400">{EUR(paid)} versé</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Billings recents */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Flux récents</p>
              {billing.slice(0,8).map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div>
                    <p className="text-sm text-[#1a1918]">{b.label}</p>
                    <p className="text-xs text-zinc-400">{new Date(b.recorded_at).toLocaleDateString('fr-FR')} · {b.category}</p>
                  </div>
                  <p className={`text-sm font-bold ${b.type==='revenue'?'text-[#0d9e75]':'text-red-500'}`}>
                    {b.type==='revenue'?'+':'-'}{EUR(b.amount_eur)}
                  </p>
                </div>
              ))}
              {billing.length===0 && <p className="text-xs text-zinc-400 text-center py-4">Aucun flux enregistré</p>}
            </div>
          </div>
        )}

        {/* ── FACTURES FOURNISSEURS ────────────────────────────────────── */}
        {tab==='invoices' && (
          <div className="space-y-3">
            {['visa_agent', 'other'].map(section => {
              const sectionInvoices = section === 'visa_agent'
                ? invoices.filter(i=>i.supplier_type==='visa_agent')
                : invoices.filter(i=>i.supplier_type!=='visa_agent')
              if (!sectionInvoices.length) return null
              return (
                <div key={section}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    {section==='visa_agent' ? '🛂 Factures Agent Visa' : '📦 Autres fournisseurs'}
                  </p>
                  {sectionInvoices.map(inv => {
                    const ti = typeInfo(inv.supplier_type)
                    return (
                      <div key={inv.id} className={`bg-white border rounded-xl p-4 mb-2 ${inv.paid_at?'border-zinc-100':'border-amber-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ti.c}`}>{ti.l}</span>
                              {inv.extracted_by_ai && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confBadge(inv.extraction_confidence)}`}>
                                  🤖 IA {inv.extraction_confidence}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid_at?'bg-green-50 text-[#0d9e75]':'bg-amber-50 text-amber-700'}`}>
                                {inv.paid_at?'✅ Payée':'⏳ En attente'}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#1a1918]">{inv.supplier_name}</p>
                            <p className="text-xs text-zinc-400">
                              {inv.invoice_number?`N°${inv.invoice_number} · `:''}
                              {new Date(inv.invoice_date).toLocaleDateString('fr-FR')}
                              {inv.due_date?` · Éch. ${new Date(inv.due_date).toLocaleDateString('fr-FR')}`:''}
                            </p>
                            {inv.notes && <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{inv.notes}</p>}
                            {inv.visa_agent_invoice_lines?.map(l => (
                              <div key={l.id} className="text-xs text-zinc-500 mt-1">
                                · {l.intern_name} {l.visa_type?`(${l.visa_type})`:''} — {l.amount_eur?EUR(l.amount_eur):'—'}
                              </div>
                            ))}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-[#1a1918]">{inv.amount_eur?EUR(inv.amount_eur):'—'}</p>
                            {inv.amount_local && inv.currency!=='EUR' && (
                              <p className="text-xs text-zinc-400">{Number(inv.amount_local).toLocaleString()} {inv.currency}</p>
                            )}
                            <div className="flex gap-2 mt-2 justify-end">
                              {inv.pdf_url && <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">📄 PDF</a>}
                              {!inv.paid_at && (
                                <button onClick={() => markInvPaid(inv.id)}
                                  className="text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg hover:bg-green-700">
                                  Régler
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {invoices.length===0 && (
              <div className="text-center py-16 text-zinc-400">
                <p className="text-4xl mb-3">🧾</p>
                <p className="font-semibold">Aucune facture importée</p>
                <p className="text-sm mt-1">Cliquez sur "+ Importer facture" pour commencer</p>
              </div>
            )}
          </div>
        )}

        {/* ── BILLING SUIVI ────────────────────────────────────────────── */}
        {tab==='billing' && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-4">
              {[['all','Tous'],['intern','Interns'],['external','Externes']].map(([v,l]) => (
                <button key={v} className="text-xs px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:border-[#c8a96e]">{l}</button>
              ))}
            </div>
            {billing.map(b => {
              const intern = b.cases?.interns
              return (
                <div key={b.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.type==='revenue'?'bg-green-100 text-[#0d9e75]':'bg-red-100 text-red-600'}`}>
                        {b.type==='revenue'?'Entrée':'Sortie'}
                      </span>
                      <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{b.category}</span>
                      {b.paid_at && <span className="text-xs text-[#0d9e75]">✅ Payé</span>}
                      {!b.paid_at && b.due_date && new Date(b.due_date) < new Date() && (
                        <span className="text-xs text-red-500">⚠️ En retard</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#1a1918]">{b.label}</p>
                    {intern && <p className="text-xs text-zinc-400">{intern.first_name} {intern.last_name}</p>}
                    <p className="text-xs text-zinc-400">{new Date(b.recorded_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <p className={`text-lg font-bold shrink-0 ${b.type==='revenue'?'text-[#0d9e75]':'text-red-500'}`}>
                    {b.type==='revenue'?'+':'-'}{EUR(b.amount_eur)}
                  </p>
                </div>
              )
            })}
            {billing.length===0 && (
              <div className="text-center py-16 text-zinc-400">
                <p className="text-4xl mb-3">💳</p>
                <p>Aucune entrée de billing. Les paiements validés apparaîtront ici automatiquement.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS ASSOCIÉS ─────────────────────────────────────────── */}
        {tab==='payouts' && (
          <div className="space-y-4">
            {/* Associates summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {associates.map(a => {
                const totalDue  = (a.associate_payouts??[]).filter(p=>!p.paid_at).reduce((s,p)=>s+p.amount_due,0)
                const totalPaid = (a.associate_payouts??[]).filter(p=>!!p.paid_at).reduce((s,p)=>s+p.amount_paid,0)
                return (
                  <div key={a.id} className="bg-white border border-zinc-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#c8a96e]/15 flex items-center justify-center text-sm font-bold text-[#c8a96e]">
                        {a.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1a1918]">{a.name}</p>
                        <p className="text-xs text-zinc-400">{a.assoc_role} · {a.share_pct}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-xs text-amber-600 mb-0.5">À verser</p>
                        <p className="text-lg font-bold text-amber-700">{EUR(totalDue)}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs text-[#0d9e75] mb-0.5">Versé total</p>
                        <p className="text-lg font-bold text-[#0d9e75]">{EUR(totalPaid)}</p>
                      </div>
                    </div>
                    {a.wise_email && <p className="text-xs text-zinc-400 mt-2 text-center">Wise: {a.wise_email}</p>}
                    {a.iban && <p className="text-xs text-zinc-400 text-center font-mono">{a.iban}</p>}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historique des payouts</p>
              <button onClick={() => setShowPayoutForm(true)}
                className="text-sm px-4 py-2 bg-[#c8a96e] text-white rounded-xl font-semibold hover:bg-[#b8945a]">
                + Créer payout
              </button>
            </div>

            {payouts.map(p => {
              const assoc = associates.find(a=>a.id===p.associate_id)
              return (
                <div key={p.id} className={`bg-white border rounded-xl p-4 ${p.paid_at?'border-zinc-100':'border-amber-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-[#1a1918]">{assoc?.name ?? '—'}</p>
                        <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{p.period_label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.paid_at?'bg-green-100 text-[#0d9e75]':'bg-amber-100 text-amber-700'}`}>
                          {p.paid_at?'✅ Versé':'⏳ En attente'}
                        </span>
                      </div>
                      {p.net_profit > 0 && (
                        <p className="text-xs text-zinc-500">
                          Rev: {EUR(p.gross_revenue)} · Coûts: {EUR(p.total_costs)} · Bénéfice: {EUR(p.net_profit)} · Part: {p.share_pct}%
                        </p>
                      )}
                      {p.payment_ref && <p className="text-xs text-zinc-400 mt-0.5">Réf: {p.payment_ref}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#1a1918]">{EUR(p.amount_due)}</p>
                      {p.amount_paid > 0 && <p className="text-xs text-[#0d9e75]">Versé: {EUR(p.amount_paid)}</p>}
                      {!p.paid_at && (
                        <button onClick={() => markPayoutPaid(p)}
                          className="mt-2 text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-xl font-semibold hover:bg-[#b8945a]">
                          Marquer versé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {payouts.length===0 && (
              <div className="text-center py-12 text-zinc-400">
                <p className="text-4xl mb-3">💸</p>
                <p>Aucun payout créé. Créez votre premier payout pour tracer les versements.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL IMPORT FACTURE ─────────────────────────────────────────── */}
      {showInvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e=>{if(e.target===e.currentTarget)setShowInvForm(false)}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-[#1a1918]">Importer une facture</h2>
              <button onClick={()=>setShowInvForm(false)} className="text-zinc-400 text-xl">×</button>
            </div>

            <form onSubmit={handleSaveInv} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Upload zone */}
              <div
                onClick={()=>fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${uploadDone?'border-[#0d9e75] bg-green-50':'border-zinc-200 hover:border-[#c8a96e]'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/>
                    <p className="text-sm text-zinc-500">Analyse par Claude en cours…</p>
                  </div>
                ) : uploadDone ? (
                  <div>
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-sm font-semibold text-[#0d9e75]">Données extraites automatiquement</p>
                    <p className={`text-xs mt-1 font-medium ${confBadge(extractConf)} px-2 py-0.5 rounded-full inline-block`}>
                      Confiance : {extractConf}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Vérifiez et corrigez les champs ci-dessous si nécessaire</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📄</p>
                    <p className="text-sm font-semibold text-zinc-600">Déposez votre facture ici</p>
                    <p className="text-xs text-zinc-400 mt-1">PDF, JPG, PNG · Max 10 Mo</p>
                    <p className="text-xs text-[#c8a96e] mt-2">🤖 Claude extraira automatiquement les données</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload}/>
              </div>

              {/* Type tag */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  {SUPPLIER_TYPES.map(t => (
                    <button key={t.v} type="button"
                      onClick={()=>setInvForm(f=>({...f,supplier_type:t.v}))}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${invForm.supplier_type===t.v?'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]':'border-zinc-200 text-zinc-600'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Fournisseur *</label>
                  <input required className={inp} value={invForm.supplier_name} onChange={e=>setInvForm(f=>({...f,supplier_name:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">N° facture</label>
                  <input className={inp} value={invForm.invoice_number} onChange={e=>setInvForm(f=>({...f,invoice_number:e.target.value}))}/>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Montant EUR</label>
                  <input type="number" step="0.01" className={inp} value={invForm.amount_eur} onChange={e=>setInvForm(f=>({...f,amount_eur:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Montant local</label>
                  <input type="number" className={inp} value={invForm.amount_local} onChange={e=>setInvForm(f=>({...f,amount_local:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Devise</label>
                  <select className={inp} value={invForm.currency} onChange={e=>setInvForm(f=>({...f,currency:e.target.value}))}>
                    <option>IDR</option><option>EUR</option><option>USD</option><option>SGD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Date facture *</label>
                  <input required type="date" className={inp} value={invForm.invoice_date} onChange={e=>setInvForm(f=>({...f,invoice_date:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Date paiement (si payée)</label>
                  <input type="date" className={inp} value={invForm.paid_at} onChange={e=>setInvForm(f=>({...f,paid_at:e.target.value}))}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes / Description</label>
                <textarea className={inp} rows={2} value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))}/>
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={()=>setShowInvForm(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
                <button type="submit" disabled={savingInv} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {savingInv?'Enregistrement…':'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉER PAYOUT ───────────────────────────────────────────── */}
      {showPayoutForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e=>{if(e.target===e.currentTarget)setShowPayoutForm(false)}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Créer un payout</h2>
              <button onClick={()=>setShowPayoutForm(false)} className="text-zinc-400 text-xl">×</button>
            </div>
            <form onSubmit={handleCreatePayout} className="px-6 py-5 space-y-4">
              {/* Mode */}
              <div className="flex gap-2">
                {(['auto','manual'] as const).map(m => (
                  <button key={m} type="button" onClick={()=>setPayoutMode(m)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${payoutMode===m?'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]':'border-zinc-200 text-zinc-600'}`}>
                    {m==='auto'?'🤖 Auto (calculé depuis billings)':'✏️ Manuel'}
                  </button>
                ))}
              </div>

              {payoutMode==='auto' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                  Le mode auto calcule automatiquement le bénéfice net pour la période choisie (revenus − coûts directs − factures fournisseurs) et génère un payout pour chaque associé selon son % de parts.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Libellé période *</label>
                <input required className={inp} placeholder="Ex: Avril 2026 / Q1 2026"
                  value={payoutForm.period_label} onChange={e=>setPayoutForm(f=>({...f,period_label:e.target.value}))}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Début période *</label>
                  <input required type="date" className={inp}
                    value={payoutForm.period_start} onChange={e=>setPayoutForm(f=>({...f,period_start:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Fin période *</label>
                  <input required type="date" className={inp}
                    value={payoutForm.period_end} onChange={e=>setPayoutForm(f=>({...f,period_end:e.target.value}))}/>
                </div>
              </div>

              {payoutMode==='manual' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Associé *</label>
                    <select required className={inp}
                      value={payoutForm.associate_id} onChange={e=>setPayoutForm(f=>({...f,associate_id:e.target.value}))}>
                      <option value="">— Choisir —</option>
                      {associates.map(a=><option key={a.id} value={a.id}>{a.name} ({a.share_pct}%)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Montant à verser (EUR) *</label>
                    <input required type="number" step="0.01" className={inp}
                      value={payoutForm.amount_due} onChange={e=>setPayoutForm(f=>({...f,amount_due:e.target.value}))}/>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Mode paiement</label>
                  <select className={inp} value={payoutForm.payment_method} onChange={e=>setPayoutForm(f=>({...f,payment_method:e.target.value}))}>
                    <option value="">—</option>
                    <option>Wise</option><option>Virement bancaire</option><option>PayPal</option><option>Crypto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Référence</label>
                  <input className={inp} value={payoutForm.payment_ref} onChange={e=>setPayoutForm(f=>({...f,payment_ref:e.target.value}))}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                <textarea className={inp} rows={2} value={payoutForm.notes} onChange={e=>setPayoutForm(f=>({...f,notes:e.target.value}))}/>
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={()=>setShowPayoutForm(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm">Annuler</button>
                <button type="submit" disabled={savingPayout} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {savingPayout?'Création…':payoutMode==='auto'?'Générer les payouts':'Créer payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
