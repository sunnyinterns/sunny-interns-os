'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const FMT = (v: number) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(v)
const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'
const COLORS = ['#c8a96e','#1a1918','#0d9e75','#e8930a','#ef4444','#6366f1','#06b6d4']

type Invoice = {
  id:string; invoice_number:string|null; supplier_name:string; supplier_type:string
  amount_eur:number|null; amount_local:number|null; currency:string
  invoice_date:string; due_date:string|null; paid_at:string|null
  pdf_url:string|null; notes:string|null; extracted_by_ai:boolean
  extraction_confidence:string|null; deleted_at:string|null
  visa_agent_invoice_lines?:{id:string;intern_name:string|null;visa_type:string|null;amount_eur:number|null}[]
}
type BillingEntry = {
  id:string; type:string; category:string; label:string; amount_eur:number
  paid_at:string|null; recorded_at:string
  cases?:{id:string; interns?:{first_name:string;last_name:string}|null}|null
}
type Config = { idr_eur_rate:number; usd_eur_rate:number; sgd_eur_rate:number; driver_cost_idr:number; founders:{name:string;payout_pct:number;wise_email:string}[] }
type Extraction = { invoice_number?:string|null; supplier_name?:string|null; invoice_date?:string|null; due_date?:string|null; amount_total?:string|null; currency?:string|null; amount_eur?:string|null; description?:string|null }

const SUPPLIER_TYPES = [
  {v:'visa_agent',l:'🛂 Agent visa',c:'bg-blue-100 text-blue-700'},
  {v:'accommodation',l:'🏠 Hébergement',c:'bg-amber-100 text-amber-700'},
  {v:'transport',l:'🚗 Transport',c:'bg-green-100 text-green-700'},
  {v:'marketing',l:'📣 Marketing',c:'bg-purple-100 text-purple-700'},
  {v:'software',l:'💻 Software',c:'bg-cyan-100 text-cyan-700'},
  {v:'tax',l:'🏦 Fiscal/Légal',c:'bg-red-100 text-red-700'},
  {v:'other',l:'📦 Autre',c:'bg-zinc-100 text-zinc-700'},
]
const tInfo = (t:string) => SUPPLIER_TYPES.find(s=>s.v===t) ?? SUPPLIER_TYPES[SUPPLIER_TYPES.length-1]

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function FinancesPage() {
  const [tab, setTab] = useState<'dashboard'|'invoices'|'billing'>('dashboard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billing, setBilling] = useState<BillingEntry[]>([])
  const [config, setConfig] = useState<Config>({ idr_eur_rate:16500, usd_eur_rate:0.92, sgd_eur_rate:0.70, driver_cost_idr:400000, founders:[] })
  const [loading, setLoading] = useState(true)

  // Filters
  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState<number|null>(null) // null = all year

  // Invoice modal
  const [showInvForm, setShowInvForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [extraction, setExtraction] = useState<Extraction|null>(null)
  const [extractConf, setExtractConf] = useState('low')
  const [filePath, setFilePath] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [invForm, setInvForm] = useState({ invoice_number:'', supplier_name:'', supplier_type:'visa_agent', amount_eur:'', amount_local:'', currency:'IDR', invoice_date:new Date().toISOString().slice(0,10), due_date:'', paid_at:'', notes:'' })
  const [savingInv, setSavingInv] = useState(false)
  const [deleteInv, setDeleteInv] = useState<Invoice|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [invR, bilR, cfgR] = await Promise.all([
      fetch('/api/finances/invoices'),
      fetch('/api/finances/billing-entries'),
      fetch('/api/settings/finance-config'),
    ])
    setInvoices(invR.ok ? await invR.json() as Invoice[] : [])
    setBilling(bilR.ok ? await bilR.json() as BillingEntry[] : [])
    if (cfgR.ok) {
      const d = await cfgR.json() as { settings: Record<string,number>; founders: Config['founders'] }
      setConfig({ idr_eur_rate: d.settings?.idr_eur_rate ?? 16500, usd_eur_rate: d.settings?.usd_eur_rate ?? 0.92, sgd_eur_rate: d.settings?.sgd_eur_rate ?? 0.70, driver_cost_idr: d.settings?.driver_cost_idr ?? 400000, founders: d.founders ?? [] })
    }
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  // ── Helpers
  const RATES: Record<string,number> = { EUR:1, USD:config.usd_eur_rate, IDR:1/config.idr_eur_rate, SGD:config.sgd_eur_rate }
  const toEur = (amt:number|null, cur:string) => (amt??0)*(RATES[cur]??1)
  const driverEur = config.driver_cost_idr / config.idr_eur_rate

  // Filter helpers
  const inPeriod = (dateStr:string) => {
    const d = new Date(dateStr)
    if (d.getFullYear() !== selYear) return false
    if (selMonth !== null && d.getMonth() !== selMonth) return false
    return true
  }

  const filteredInvoices = invoices.filter(i => !i.deleted_at && inPeriod(i.invoice_date))
  const filteredBilling  = billing.filter(b => inPeriod(b.recorded_at))

  // ── Stats on filtered period
  const revenue       = filteredBilling.filter(b=>b.type==='revenue').reduce((s,b)=>s+b.amount_eur,0)
  const directCosts   = filteredBilling.filter(b=>b.type==='cost').reduce((s,b)=>s+b.amount_eur,0)
  const supplierTotal = filteredInvoices.reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
  const supplierUnpaid= filteredInvoices.filter(i=>!i.paid_at).reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
  const grossMargin   = revenue - directCosts
  const netMargin     = grossMargin - supplierTotal
  const grossMarginPct= revenue > 0 ? (grossMargin/revenue)*100 : 0
  const netMarginPct  = revenue > 0 ? (netMargin/revenue)*100 : 0

  // Upcoming: cases in visa_in_progress/arrival_prep needing driver cost
  const driverIncoming = 0 // Will be from cases API — placeholder

  // Payout split
  const foundersPayouts = config.founders.map(f => ({ ...f, amount:(netMargin*f.payout_pct)/100 }))

  // Monthly chart data for the selected year
  const monthlyData = Array.from({length:12},(_,mi) => {
    const rev = billing.filter(b=>b.type==='revenue' && new Date(b.recorded_at).getFullYear()===selYear && new Date(b.recorded_at).getMonth()===mi).reduce((s,b)=>s+b.amount_eur,0)
    const inv = invoices.filter(i=>!i.deleted_at && new Date(i.invoice_date).getFullYear()===selYear && new Date(i.invoice_date).getMonth()===mi).reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
    return { month: MONTHS_FR[mi], revenue: rev, invoices: inv, margin: rev-inv }
  })

  // Pie
  const pieData = SUPPLIER_TYPES
    .map(t => ({ name: t.l, value: filteredInvoices.filter(i=>i.supplier_type===t.v).reduce((s,i)=>s+(i.amount_eur??0),0) }))
    .filter(d=>d.value>0)

  // ── Upload
  async function handleUpload(e:React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setExtraction(null); setUploadDone(false)
    const fd = new FormData(); fd.append('file',file)
    const r = await fetch('/api/finances/invoices/upload',{method:'POST',body:fd})
    if (r.ok) {
      const d = await r.json() as {file_path:string;pdf_url:string;extracted:Extraction;category:string;confidence:string}
      setFilePath(d.file_path); setPdfUrl(d.pdf_url); setExtraction(d.extracted); setExtractConf(d.confidence)
      setInvForm(f=>({...f, invoice_number:d.extracted.invoice_number??f.invoice_number, supplier_name:d.extracted.supplier_name??f.supplier_name, invoice_date:d.extracted.invoice_date??f.invoice_date, due_date:d.extracted.due_date??f.due_date, amount_eur:d.extracted.amount_eur??f.amount_eur, amount_local:d.extracted.amount_total??f.amount_local, currency:d.extracted.currency??f.currency, notes:d.extracted.description??f.notes, supplier_type:d.category||f.supplier_type}))
      setUploadDone(true)
    }
    setUploading(false)
  }

  async function handleSaveInv(e:React.FormEvent) {
    e.preventDefault(); setSavingInv(true)
    await fetch('/api/finances/invoices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...invForm,file_path:filePath||null,pdf_url:pdfUrl||null,extracted_by_ai:!!extraction,extraction_confidence:extractConf,amount_eur:invForm.amount_eur?parseFloat(invForm.amount_eur):null,amount_local:invForm.amount_local?parseFloat(invForm.amount_local):null})})
    setSavingInv(false); setShowInvForm(false); setExtraction(null); setUploadDone(false)
    setInvForm({invoice_number:'',supplier_name:'',supplier_type:'visa_agent',amount_eur:'',amount_local:'',currency:'IDR',invoice_date:new Date().toISOString().slice(0,10),due_date:'',paid_at:'',notes:''})
    void load()
  }

  async function markInvPaid(id:string) {
    await fetch(`/api/finances/invoices/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({paid_at:new Date().toISOString()})})
    void load()
  }

  async function handleDeleteInv() {
    if (!deleteInv) return
    await fetch(`/api/finances/invoices/${deleteInv.id}`,{method:'DELETE'})
    setInvoices(p=>p.filter(i=>i.id!==deleteInv.id))
    setDeleteInv(null)
  }

  const confBadge=(c:string|null)=>c==='high'?'bg-green-100 text-green-700':c==='medium'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'
  const years = [now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2]

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
            <p className="text-sm text-zinc-400">Revenus · Charges · Marges · Suivi fournisseurs</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year/Month selectors */}
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))} className="text-sm border border-zinc-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selMonth??''} onChange={e=>setSelMonth(e.target.value===''?null:parseInt(e.target.value))} className="text-sm border border-zinc-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              <option value="">Toute l'année</option>
              {MONTHS_FR.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <a href="/fr/settings/finances" className="px-3 py-2 text-xs border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">⚙️ Configurer</a>
            <button onClick={()=>setShowInvForm(true)} className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]">+ Importer facture</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            {l:'CA',v:FMT(revenue),c:'text-[#1a1918]',sub:`${filteredBilling.filter(b=>b.type==='revenue').length} encaissements`},
            {l:'Marge brute',v:FMT(grossMargin),c:grossMargin>=0?'text-[#0d9e75]':'text-red-500',sub:`${grossMarginPct.toFixed(1)}%`},
            {l:'Marge nette',v:FMT(netMargin),c:netMargin>=0?'text-[#0d9e75]':'text-red-500',sub:`${netMarginPct.toFixed(1)}%`},
            {l:'Fournisseurs impayés',v:FMT(supplierUnpaid),c:supplierUnpaid>0?'text-amber-600':'text-zinc-400',sub:`${filteredInvoices.filter(i=>!i.paid_at).length} facture(s)`},
            {l:'Chauffeur (prévu)',v:FMT(driverEur),c:'text-zinc-400',sub:`${(config.driver_cost_idr/1000).toFixed(0)}k IDR / résa`},
          ].map(({l,v,c,sub})=>(
            <div key={l} className="bg-white border border-zinc-100 rounded-2xl p-4">
              <p className="text-xs text-zinc-400 mb-0.5">{l}</p>
              <p className={`text-xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Payout banner */}
        {config.founders.length>=2 && netMargin>0 && (
          <div className="bg-[#1a1918] rounded-2xl p-5 mb-5 flex items-center gap-6 flex-wrap">
            <div><p className="text-xs text-zinc-400 mb-1">Marge nette · {selMonth!==null?MONTHS_FR[selMonth]:selYear}</p><p className="text-2xl font-bold text-white">{FMT(netMargin)}</p></div>
            <div className="flex-1 flex gap-4 flex-wrap">
              {foundersPayouts.map((f,i)=>(
                <div key={f.name} className="bg-white/10 rounded-xl px-4 py-3 flex-1 min-w-28">
                  <p className="text-xs text-zinc-400">{f.name} · {f.payout_pct}%</p>
                  <p className={`text-xl font-bold ${i===0?'text-[#c8a96e]':'text-white'}`}>{FMT(f.amount)}</p>
                  {f.wise_email && <p className="text-[10px] text-zinc-500 mt-0.5">{f.wise_email}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming costs */}
        {(supplierUnpaid > 0) && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">⚠️ Dépenses à venir / en attente</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {supplierUnpaid>0 && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-600">🧾 Factures fournisseurs impayées</span>
                  <strong className="text-amber-800">{FMT(supplierUnpaid)}</strong>
                  <span className="text-xs text-amber-500">({filteredInvoices.filter(i=>!i.paid_at).length} facture{filteredInvoices.filter(i=>!i.paid_at).length>1?'s':''})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-6">
          {([['dashboard','📊 Dashboard'],['invoices','🧾 Factures'],['billing','💳 Billings']] as const).map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab===t?'bg-white shadow text-[#1a1918]':'text-zinc-500 hover:text-zinc-700'}`}>{l}</button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab==='dashboard' && (
          <div className="space-y-5">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Évolution {selYear}</p>
              <p className="text-xs text-zinc-400 mb-4">CA, marge nette et charges fournisseurs mois par mois</p>
              {loading ? <div className="h-52 bg-zinc-50 rounded-xl animate-pulse"/> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:'#9ca3af'}}/>
                    <YAxis tick={{fontSize:11,fill:'#9ca3af'}} tickFormatter={v=>`${(v/1000).toFixed(0)}k€`}/>
                    <Tooltip formatter={(v:number)=>FMT(v)} labelStyle={{fontWeight:'bold'}}/>
                    <Legend iconType="circle" iconSize={8}/>
                    <Line type="monotone" dataKey="revenue" name="CA" stroke="#0d9e75" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="margin" name="Marge nette" stroke="#c8a96e" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="invoices" name="Fournisseurs" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4"/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">CA vs Charges {selMonth!==null?MONTHS_FR[selMonth]:selYear}</p>
                {monthlyData.every(d=>d.revenue===0&&d.invoices===0) ? (
                  <div className="h-40 flex items-center justify-center text-zinc-300 text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:'#9ca3af'}}/>
                      <YAxis tick={{fontSize:10,fill:'#9ca3af'}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                      <Tooltip formatter={(v:number)=>FMT(v)}/>
                      <Legend iconType="square" iconSize={8}/>
                      <Bar dataKey="revenue" name="CA" fill="#0d9e75" radius={[3,3,0,0]}/>
                      <Bar dataKey="invoices" name="Fournisseurs" fill="#ef4444" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Charges par catégorie</p>
                {pieData.length===0 ? (
                  <div className="h-40 flex items-center justify-center text-zinc-300 text-sm">Aucune facture</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                          {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(v:number)=>FMT(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {pieData.map((d,i)=>(
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                            <span className="text-zinc-600 truncate max-w-[90px]">{d.name.replace(/^\S+\s/,'')}</span>
                          </span>
                          <span className="font-semibold text-[#1a1918]">{FMT(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {foundersPayouts.length>0 && (
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Répartition fondateurs</p>
                {foundersPayouts.map((f,i)=>(
                  <div key={f.name} className="flex items-center gap-4 mb-4 last:mb-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{background:i===0?'linear-gradient(135deg,#F5A623,#E8930A)':'#1a1918'}}>{f.name[0]}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-sm font-medium text-[#1a1918]">{f.name}</span><span className="text-sm font-bold text-[#1a1918]">{FMT(f.amount)}</span></div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${f.payout_pct}%`,background:i===0?'#c8a96e':'#1a1918'}}/></div>
                      <p className="text-xs text-zinc-400 mt-0.5">{f.payout_pct}% de {FMT(netMargin)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FACTURES */}
        {tab==='invoices' && (
          <div className="space-y-3">
            <div className="flex gap-4 pb-3 border-b border-zinc-100 text-xs flex-wrap">
              <span className="text-zinc-500">Total période : <strong className="text-[#1a1918]">{FMT(supplierTotal)}</strong></span>
              <span className="text-amber-600">Impayé : <strong>{FMT(supplierUnpaid)}</strong></span>
              <span className="text-[#0d9e75]">Réglé : <strong>{FMT(supplierTotal-supplierUnpaid)}</strong></span>
            </div>

            {['visa_agent','other'].map(section=>{
              const list = section==='visa_agent'
                ? filteredInvoices.filter(i=>i.supplier_type==='visa_agent')
                : filteredInvoices.filter(i=>i.supplier_type!=='visa_agent')
              if (!list.length) return null
              return (
                <div key={section}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{section==='visa_agent'?'🛂 Agent Visa':'📦 Autres fournisseurs'}</p>
                  {list.map(inv=>{
                    const ti=tInfo(inv.supplier_type)
                    return (
                      <div key={inv.id} className={`bg-white border rounded-xl p-4 mb-2 ${inv.paid_at?'border-zinc-100':'border-amber-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ti.c}`}>{ti.l}</span>
                              {inv.extracted_by_ai && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confBadge(inv.extraction_confidence)}`}>🤖 {inv.extraction_confidence}</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid_at?'bg-green-50 text-[#0d9e75]':'bg-amber-50 text-amber-700'}`}>
                                {inv.paid_at?`✅ Payée ${new Date(inv.paid_at).toLocaleDateString('fr-FR')}`:`⏳ Éch. ${inv.due_date?new Date(inv.due_date).toLocaleDateString('fr-FR'):'—'}`}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#1a1918]">{inv.supplier_name}</p>
                            <p className="text-xs text-zinc-400">{inv.invoice_number?`N°${inv.invoice_number} · `:''}{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                            {inv.notes && <p className="text-xs text-zinc-400 truncate">{inv.notes}</p>}
                            {inv.visa_agent_invoice_lines?.map(l=><div key={l.id} className="text-xs text-zinc-500 mt-0.5">· {l.intern_name} {l.visa_type?`(${l.visa_type})`:''} — {l.amount_eur?FMT(l.amount_eur):'—'}</div>)}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-[#1a1918]">{inv.amount_eur?FMT(inv.amount_eur):'—'}</p>
                            {inv.amount_local && inv.currency!=='EUR' && <p className="text-xs text-zinc-400">{Number(inv.amount_local).toLocaleString()} {inv.currency}</p>}
                            <div className="flex gap-2 mt-1.5 justify-end flex-wrap">
                              {inv.pdf_url && <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e]">📄</a>}
                              {!inv.paid_at && <button onClick={()=>markInvPaid(inv.id)} className="text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg">✓ Régler</button>}
                              <button onClick={()=>setDeleteInv(inv)} className="text-xs px-2.5 py-1 border border-red-100 text-red-400 rounded-lg hover:bg-red-50">🗑</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {filteredInvoices.length===0 && <div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">🧾</p><p className="font-semibold">Aucune facture sur cette période</p></div>}
          </div>
        )}

        {/* BILLING */}
        {tab==='billing' && (
          <div className="space-y-2">
            {filteredBilling.map(b=>(
              <div key={b.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.type==='revenue'?'bg-green-100 text-[#0d9e75]':'bg-red-100 text-red-600'}`}>{b.type==='revenue'?'Entrée':'Sortie'}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{b.category}</span>
                    {b.paid_at && <span className="text-xs text-[#0d9e75]">✅</span>}
                  </div>
                  <p className="text-sm font-medium text-[#1a1918] truncate">{b.label}</p>
                  {b.cases?.interns && <p className="text-xs text-zinc-400">{b.cases.interns.first_name} {b.cases.interns.last_name}</p>}
                  <p className="text-xs text-zinc-400">{new Date(b.recorded_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <p className={`text-lg font-bold shrink-0 ${b.type==='revenue'?'text-[#0d9e75]':'text-red-500'}`}>{b.type==='revenue'?'+':'-'}{FMT(b.amount_eur)}</p>
              </div>
            ))}
            {filteredBilling.length===0 && <div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">💳</p><p>Aucun flux sur cette période</p></div>}
          </div>
        )}
      </div>

      {/* DELETE INVOICE CONFIRM */}
      {deleteInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <p className="text-3xl mb-3">🗑</p>
            <h3 className="font-bold text-[#1a1918] mb-1">Supprimer cette facture ?</h3>
            <p className="text-sm text-zinc-500 mb-1">{deleteInv.supplier_name}</p>
            <p className="text-xs font-mono text-zinc-400 mb-5">{deleteInv.invoice_number} · {deleteInv.amount_eur ? FMT(deleteInv.amount_eur) : '—'}</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteInv(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
              <button onClick={handleDeleteInv} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT FACTURE */}
      {showInvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowInvForm(false)}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-[#1a1918]">Importer une facture</h2>
              <button onClick={()=>setShowInvForm(false)} className="text-zinc-400 text-xl">×</button>
            </div>
            <form onSubmit={handleSaveInv} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${uploadDone?'border-[#0d9e75] bg-green-50':'border-zinc-200 hover:border-[#c8a96e]'}`}>
                {uploading ? <div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/><p className="text-sm text-zinc-500">Claude analyse la facture…</p></div>
                  : uploadDone ? <div><p className="text-2xl mb-1">✅</p><p className="text-sm font-semibold text-[#0d9e75]">Données extraites</p><span className={`text-xs font-medium ${confBadge(extractConf)} px-2 py-0.5 rounded-full inline-block mt-1`}>Confiance {extractConf}</span></div>
                  : <div><p className="text-3xl mb-2">📄</p><p className="text-sm font-semibold text-zinc-600">Déposez votre facture</p><p className="text-xs text-zinc-400 mt-1">PDF, JPG, PNG · 🤖 Claude extrait automatiquement</p></div>
                }
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload}/>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUPPLIER_TYPES.map(t=>(
                  <button key={t.v} type="button" onClick={()=>setInvForm(f=>({...f,supplier_type:t.v}))}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${invForm.supplier_type===t.v?'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]':'border-zinc-200 text-zinc-600'}`}>
                    {t.l}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Fournisseur *</label><input required className={inp} value={invForm.supplier_name} onChange={e=>setInvForm(f=>({...f,supplier_name:e.target.value}))}/></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">N° facture</label><input className={inp} value={invForm.invoice_number} onChange={e=>setInvForm(f=>({...f,invoice_number:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant EUR</label><input type="number" step="0.01" className={inp} value={invForm.amount_eur} onChange={e=>setInvForm(f=>({...f,amount_eur:e.target.value}))}/></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant local</label><input type="number" className={inp} value={invForm.amount_local} onChange={e=>setInvForm(f=>({...f,amount_local:e.target.value}))}/></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Devise</label>
                  <select className={inp} value={invForm.currency} onChange={e=>setInvForm(f=>({...f,currency:e.target.value}))}>
                    <option>IDR</option><option>EUR</option><option>USD</option><option>SGD</option>
                  </select>
                </div>
              </div>
              {invForm.amount_local && invForm.currency!=='EUR' && (
                <p className="text-xs text-zinc-400 -mt-2">≈ {FMT(parseFloat(invForm.amount_local)*(RATES[invForm.currency]??1))} au taux actuel</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date facture *</label><input required type="date" className={inp} value={invForm.invoice_date} onChange={e=>setInvForm(f=>({...f,invoice_date:e.target.value}))}/></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date paiement (si payée)</label><input type="date" className={inp} value={invForm.paid_at} onChange={e=>setInvForm(f=>({...f,paid_at:e.target.value}))}/></div>
              </div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))}/></div>
              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={()=>setShowInvForm(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
                <button type="submit" disabled={savingInv} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl disabled:opacity-50">{savingInv?'Enregistrement…':'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
