'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const FMT = (v: number) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(v)
const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'
const COLORS = ['#c8a96e','#1a1918','#0d9e75','#e8930a','#ef4444','#6366f1','#06b6d4']
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

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
type Config = { idr_eur_rate:number; usd_eur_rate:number; founders:{name:string;payout_pct:number;wise_email:string}[] }

type DriverInvoice = {
  id:string; invoice_ref:string|null; invoice_date:string; total_amount_idr:number|null; total_amount_eur:number|null
  paid_at:string|null; notes:string|null
  driver_suppliers?:{name:string}|null
  driver_invoice_lines?:{id:string;intern_name:string|null;transfer_date:string|null;amount_idr:number|null;amount_eur:number|null}[]
}
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
const EXPENSE_CATEGORIES = ['visa_agent','transport','accommodation','marketing','software','tax','salaire','commission','frais_bancaires','other']
const tInfo = (t:string) => SUPPLIER_TYPES.find(s=>s.v===t) ?? SUPPLIER_TYPES[SUPPLIER_TYPES.length-1]

export default function FinancesPage() {
  const [tab, setTab] = useState<'dashboard'|'invoices'|'billing'|'ops'>('dashboard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billing, setBilling] = useState<BillingEntry[]>([])
  const [config, setConfig] = useState<Config>({ idr_eur_rate:16500, usd_eur_rate:0.92, founders:[] })
  const [loading, setLoading] = useState(true)
  const [driverInvoices, setDriverInvoices] = useState<DriverInvoice[]>([])

  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState<number|null>(null)

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

  // Manual ops modals
  const [showExpense, setShowExpense] = useState(false)
  const [showRevenue, setShowRevenue] = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const [savingOp, setSavingOp] = useState(false)
  const [expForm, setExpForm] = useState({ label:'', category:'other', amount_eur:'', date:new Date().toISOString().slice(0,10), notes:'' })
  const [revForm, setRevForm] = useState({ label:'', category:'package', amount_eur:'', date:new Date().toISOString().slice(0,10), notes:'', paid:true })
  const [payForm, setPayForm] = useState({ founder_name:'', amount_eur:'', date:new Date().toISOString().slice(0,10), method:'Wise', ref:'', notes:'' })
  const [deleteEntry, setDeleteEntry] = useState<BillingEntry|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [invR, bilR, cfgR, drvR] = await Promise.all([
      fetch('/api/finances/invoices'),
      fetch('/api/finances/billing-entries'),
      fetch('/api/settings/finance-config'),
      fetch('/api/driver-invoices'),
    ])
    setInvoices(invR.ok ? await invR.json() as Invoice[] : [])
    setBilling(bilR.ok ? await bilR.json() as BillingEntry[] : [])
    setDriverInvoices(drvR.ok ? await drvR.json() as DriverInvoice[] : [])
    if (cfgR.ok) {
      const d = await cfgR.json() as { settings:Record<string,number>; founders:Config['founders'] }
      setConfig({ idr_eur_rate:d.settings?.idr_eur_rate??16500, usd_eur_rate:d.settings?.usd_eur_rate??0.92, founders:d.founders??[] })
    }
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  const RATES: Record<string,number> = { EUR:1, USD:config.usd_eur_rate, IDR:1/config.idr_eur_rate }
  const toEur = (amt:number|null, cur:string) => (amt??0)*(RATES[cur]??1)
  const inPeriod = (d:string) => { const dt=new Date(d); return dt.getFullYear()===selYear && (selMonth===null||dt.getMonth()===selMonth) }

  const filtInv = invoices.filter(i=>!i.deleted_at&&inPeriod(i.invoice_date))
  const filtBil = billing.filter(b=>inPeriod(b.recorded_at))

  const revenue       = filtBil.filter(b=>b.type==='revenue').reduce((s,b)=>s+b.amount_eur,0)
  const directCosts   = filtBil.filter(b=>b.type==='cost').reduce((s,b)=>s+b.amount_eur,0)
  const supplierTotal = filtInv.reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
  const supplierUnpaid= filtInv.filter(i=>!i.paid_at).reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
  // Driver invoices (notas chauffeurs)
  const filtDriver = driverInvoices.filter(i=>inPeriod(i.invoice_date))
  const driverTotal = filtDriver.reduce((s,i)=>s+(i.total_amount_eur??0),0)
  const driverUnpaid= filtDriver.filter(i=>!i.paid_at).reduce((s,i)=>s+(i.total_amount_eur??0),0)
  // Combined supplier + driver
  const allCostsTotal = supplierTotal + driverTotal
  const allCostsUnpaid= supplierUnpaid + driverUnpaid
  const grossMargin   = revenue-directCosts
  const netMargin     = grossMargin-allCostsTotal
  const grossPct      = revenue>0?(grossMargin/revenue)*100:0
  const netPct        = revenue>0?(netMargin/revenue)*100:0
  const payouts       = filtBil.filter(b=>b.category==='payout_fondateur')
  const totalPayouts  = payouts.reduce((s,b)=>s+b.amount_eur,0)

  const foundersPayouts = config.founders.map(f=>({...f,amount:(netMargin*f.payout_pct)/100}))

  const monthlyData = Array.from({length:12},(_,mi)=>{
    const rev=billing.filter(b=>b.type==='revenue'&&new Date(b.recorded_at).getFullYear()===selYear&&new Date(b.recorded_at).getMonth()===mi).reduce((s,b)=>s+b.amount_eur,0)
    const inv=invoices.filter(i=>!i.deleted_at&&new Date(i.invoice_date).getFullYear()===selYear&&new Date(i.invoice_date).getMonth()===mi).reduce((s,i)=>s+toEur(i.amount_eur,'EUR'),0)
    return {month:MONTHS_FR[mi],revenue:rev,invoices:inv,margin:rev-inv}
  })
  const pieData=SUPPLIER_TYPES.map(t=>({name:t.l,value:filtInv.filter(i=>i.supplier_type===t.v).reduce((s,i)=>s+(i.amount_eur??0),0)})).filter(d=>d.value>0)

  // ── Invoice upload
  async function handleUpload(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file)return
    setUploading(true); setExtraction(null); setUploadDone(false)
    const fd=new FormData(); fd.append('file',file)
    const r=await fetch('/api/finances/invoices/upload',{method:'POST',body:fd})
    if(r.ok){const d=await r.json() as {file_path:string;pdf_url:string;extracted:Extraction;category:string;confidence:string};setFilePath(d.file_path);setPdfUrl(d.pdf_url);setExtraction(d.extracted);setExtractConf(d.confidence);setInvForm(f=>({...f,invoice_number:d.extracted.invoice_number??f.invoice_number,supplier_name:d.extracted.supplier_name??f.supplier_name,invoice_date:d.extracted.invoice_date??f.invoice_date,due_date:d.extracted.due_date??f.due_date,amount_eur:d.extracted.amount_eur??f.amount_eur,amount_local:d.extracted.amount_total??f.amount_local,currency:d.extracted.currency??f.currency,notes:d.extracted.description??f.notes,supplier_type:d.category||f.supplier_type}));setUploadDone(true)}
    setUploading(false)
  }
  async function handleSaveInv(e:React.FormEvent){e.preventDefault();setSavingInv(true);await fetch('/api/finances/invoices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...invForm,file_path:filePath||null,pdf_url:pdfUrl||null,extracted_by_ai:!!extraction,extraction_confidence:extractConf,amount_eur:invForm.amount_eur?parseFloat(invForm.amount_eur):null,amount_local:invForm.amount_local?parseFloat(invForm.amount_local):null})});setSavingInv(false);setShowInvForm(false);setExtraction(null);setUploadDone(false);setInvForm({invoice_number:'',supplier_name:'',supplier_type:'visa_agent',amount_eur:'',amount_local:'',currency:'IDR',invoice_date:new Date().toISOString().slice(0,10),due_date:'',paid_at:'',notes:''});void load()}
  async function markInvPaid(id:string){await fetch(`/api/finances/invoices/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({paid_at:new Date().toISOString()})});void load()}
  async function handleDeleteInv(){if(!deleteInv)return;await fetch(`/api/finances/invoices/${deleteInv.id}`,{method:'DELETE'});setInvoices(p=>p.filter(i=>i.id!==deleteInv.id));setDeleteInv(null)}

  // ── Manual ops
  async function saveExpense(e:React.FormEvent){
    e.preventDefault();setSavingOp(true)
    await fetch('/api/finances/billing-entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'cost',category:expForm.category,label:expForm.label,amount_eur:parseFloat(expForm.amount_eur)||0,recorded_at:expForm.date,notes:expForm.notes||null,paid_at:expForm.date})})
    setSavingOp(false);setShowExpense(false);setExpForm({label:'',category:'other',amount_eur:'',date:new Date().toISOString().slice(0,10),notes:''});void load()
  }
  async function saveRevenue(e:React.FormEvent){
    e.preventDefault();setSavingOp(true)
    await fetch('/api/finances/billing-entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'revenue',category:revForm.category,label:revForm.label,amount_eur:parseFloat(revForm.amount_eur)||0,recorded_at:revForm.date,notes:revForm.notes||null,paid_at:revForm.paid?revForm.date:null})})
    setSavingOp(false);setShowRevenue(false);setRevForm({label:'',category:'package',amount_eur:'',date:new Date().toISOString().slice(0,10),notes:'',paid:true});void load()
  }
  async function savePayout(e:React.FormEvent){
    e.preventDefault();setSavingOp(true)
    await fetch('/api/finances/billing-entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'cost',category:'payout_fondateur',label:`Payout ${payForm.founder_name}${payForm.ref?' — '+payForm.ref:''}`,amount_eur:parseFloat(payForm.amount_eur)||0,recorded_at:payForm.date,notes:payForm.notes||null,paid_at:payForm.date,payment_method:payForm.method})})
    setSavingOp(false);setShowPayout(false);setPayForm({founder_name:'',amount_eur:'',date:new Date().toISOString().slice(0,10),method:'Wise',ref:'',notes:''});void load()
  }
  async function handleDeleteEntry(){
    if(!deleteEntry)return
    await fetch(`/api/finances/billing-entries/${deleteEntry.id}`,{method:'DELETE'})
    setBilling(p=>p.filter(b=>b.id!==deleteEntry.id));setDeleteEntry(null)
  }

  const confBadge=(c:string|null)=>c==='high'?'bg-green-100 text-green-700':c==='medium'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'
  const years=[now.getFullYear(),now.getFullYear()-1,now.getFullYear()-2]

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
            <p className="text-sm text-zinc-400">Revenus · Charges · Marges · Opérations manuelles</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))} className="text-sm border border-zinc-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selMonth??''} onChange={e=>setSelMonth(e.target.value===''?null:parseInt(e.target.value))} className="text-sm border border-zinc-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              <option value="">Toute l'année</option>
              {MONTHS_FR.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <a href="/fr/settings/finances" className="px-3 py-2 text-xs border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">⚙️ Config</a>
            {/* Quick actions */}
            <button onClick={()=>setShowExpense(true)} className="px-3 py-2 text-xs font-semibold border border-red-200 text-red-500 rounded-xl hover:bg-red-50">− Dépense</button>
            <button onClick={()=>setShowRevenue(true)} className="px-3 py-2 text-xs font-semibold border border-green-200 text-green-600 rounded-xl hover:bg-green-50">+ Revenu</button>
            <button onClick={()=>setShowPayout(true)} className="px-3 py-2 text-xs font-semibold bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800">💸 Payout</button>
            <button onClick={()=>setShowInvForm(true)} className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]">+ Facture</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            {l:'CA',v:FMT(revenue),c:'text-[#1a1918]',sub:`${filtBil.filter(b=>b.type==='revenue').length} encaissements`},
            {l:'Marge brute',v:FMT(grossMargin),c:grossMargin>=0?'text-[#0d9e75]':'text-red-500',sub:`${grossPct.toFixed(1)}%`},
            {l:'Marge nette',v:FMT(netMargin),c:netMargin>=0?'text-[#0d9e75]':'text-red-500',sub:`${netPct.toFixed(1)}%`},
            {l:'Fournisseurs impayés',v:FMT(allCostsUnpaid),c:allCostsUnpaid>0?'text-amber-600':'text-zinc-400',sub:`${filtInv.filter(i=>!i.paid_at).length+filtDriver.filter(i=>!i.paid_at).length} facture(s)`},
            {l:'Payouts versés',v:FMT(totalPayouts),c:'text-[#c8a96e]',sub:`${payouts.length} virement(s)`},
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
            <div><p className="text-xs text-zinc-400 mb-1">Marge nette disponible</p><p className="text-2xl font-bold text-white">{FMT(netMargin)}</p></div>
            <div className="flex-1 flex gap-4 flex-wrap">
              {foundersPayouts.map((f,i)=>(
                <div key={f.name} className="bg-white/10 rounded-xl px-4 py-3 flex-1 min-w-28">
                  <p className="text-xs text-zinc-400">{f.name} · {f.payout_pct}%</p>
                  <p className={`text-xl font-bold ${i===0?'text-[#c8a96e]':'text-white'}`}>{FMT(f.amount)}</p>
                  <button onClick={()=>{setPayForm(p=>({...p,founder_name:f.name,amount_eur:f.amount.toFixed(2)}));setShowPayout(true)}}
                    className="text-[10px] text-zinc-400 hover:text-[#c8a96e] mt-1 block">Verser →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid warning */}
        {allCostsUnpaid>0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 mb-0.5">⚠️ Factures fournisseurs impayées</p>
              <p className="text-sm text-amber-800 font-semibold">{FMT(allCostsUnpaid)} à régler · {filtInv.filter(i=>!i.paid_at).length+filtDriver.filter(i=>!i.paid_at).length} facture(s) · dont {FMT(driverUnpaid)} chauffeurs</p>
            </div>
            <button onClick={()=>setTab('invoices')} className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-xl font-semibold">Voir →</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-6">
          {([['dashboard','📊 Dashboard'],['invoices','🧾 Factures'],['billing','💳 Billings'],['ops','⚡ Opérations']] as const).map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab===t?'bg-white shadow text-[#1a1918]':'text-zinc-500 hover:text-zinc-700'}`}>{l}</button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab==='dashboard' && (
          <div className="space-y-5">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Évolution {selYear}</p>
              {loading?<div className="h-52 bg-zinc-50 rounded-xl animate-pulse"/>:(
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
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">CA vs Charges</p>
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
              </div>
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Charges par catégorie</p>
                {pieData.length===0?<div className="h-40 flex items-center justify-center text-zinc-300 text-sm">Aucune facture</div>:(
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>{pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v:number)=>FMT(v)}/></PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {pieData.map((d,i)=>(
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{background:COLORS[i%COLORS.length]}}/><span className="text-zinc-600 truncate max-w-[90px]">{d.name.replace(/^\S+\s/,'')}</span></span>
                          <span className="font-semibold text-[#1a1918]">{FMT(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {foundersPayouts.length>0&&(
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Répartition fondateurs</p>
                  <button onClick={()=>setShowPayout(true)} className="text-xs px-3 py-1.5 bg-[#1a1918] text-[#c8a96e] rounded-xl font-semibold">💸 Verser un payout</button>
                </div>
                {foundersPayouts.map((f,i)=>(
                  <div key={f.name} className="flex items-center gap-4 mb-4 last:mb-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{background:i===0?'linear-gradient(135deg,#F5A623,#E8930A)':'#1a1918'}}>{f.name[0]}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-sm font-medium text-[#1a1918]">{f.name}</span><span className="text-sm font-bold text-[#1a1918]">{FMT(f.amount)}</span></div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${f.payout_pct}%`,background:i===0?'#c8a96e':'#1a1918'}}/></div>
                      <p className="text-xs text-zinc-400 mt-0.5">{f.payout_pct}% de {FMT(netMargin)} · {f.wise_email}</p>
                    </div>
                  </div>
                ))}
                {payouts.length>0&&<div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-400">Déjà versé cette période : <strong className="text-[#1a1918]">{FMT(totalPayouts)}</strong> en {payouts.length} virement(s)</div>}
              </div>
            )}
          </div>
        )}

        {/* FACTURES */}
        {tab==='invoices' && (
          <div className="space-y-3">
            <div className="flex gap-4 pb-3 border-b border-zinc-100 text-xs flex-wrap">
              <span>Total : <strong>{FMT(supplierTotal)}</strong></span>
              <span className="text-amber-600">Impayé : <strong>{FMT(supplierUnpaid)}</strong></span>
              <span className="text-[#0d9e75]">Réglé : <strong>{FMT(supplierTotal-supplierUnpaid)}</strong></span>
            </div>
            {['visa_agent','other'].map(section=>{
              const list=section==='visa_agent'?filtInv.filter(i=>i.supplier_type==='visa_agent'):filtInv.filter(i=>i.supplier_type!=='visa_agent')
              if(!list.length)return null
              return(
                <div key={section}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{section==='visa_agent'?'🛂 Agent Visa':'📦 Autres fournisseurs'}</p>
                  {list.map(inv=>{const ti=tInfo(inv.supplier_type);return(
                    <div key={inv.id} className={`bg-white border rounded-xl p-4 mb-2 ${inv.paid_at?'border-zinc-100':'border-amber-100'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ti.c}`}>{ti.l}</span>
                            {inv.extracted_by_ai&&<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confBadge(inv.extraction_confidence)}`}>🤖 {inv.extraction_confidence}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid_at?'bg-green-50 text-[#0d9e75]':'bg-amber-50 text-amber-700'}`}>{inv.paid_at?`✅ ${new Date(inv.paid_at).toLocaleDateString('fr-FR')}`:`⏳ Éch. ${inv.due_date?new Date(inv.due_date).toLocaleDateString('fr-FR'):'—'}`}</span>
                          </div>
                          <p className="text-sm font-semibold text-[#1a1918]">{inv.supplier_name}</p>
                          <p className="text-xs text-zinc-400">{inv.invoice_number?`N°${inv.invoice_number} · `:''}{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                          {inv.notes&&<p className="text-xs text-zinc-400 truncate">{inv.notes}</p>}
                          {inv.visa_agent_invoice_lines?.map(l=><div key={l.id} className="text-xs text-zinc-500 mt-0.5">· {l.intern_name} {l.visa_type?`(${l.visa_type})`:''} — {l.amount_eur?FMT(l.amount_eur):'—'}</div>)}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-[#1a1918]">{inv.amount_eur?FMT(inv.amount_eur):'—'}</p>
                          {inv.amount_local&&inv.currency!=='EUR'&&<p className="text-xs text-zinc-400">{Number(inv.amount_local).toLocaleString()} {inv.currency}</p>}
                          <div className="flex gap-2 mt-1.5 justify-end">
                            {inv.pdf_url&&<a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e]">📄</a>}
                            {!inv.paid_at&&<button onClick={()=>markInvPaid(inv.id)} className="text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg">✓ Régler</button>}
                            <button onClick={()=>setDeleteInv(inv)} className="text-xs px-2.5 py-1 border border-red-100 text-red-400 rounded-lg hover:bg-red-50">🗑</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )
            })}

            {/* 🚗 NOTAS CHAUFFEURS */}
            {driverInvoices.filter(i=>inPeriod(i.invoice_date)).length>0&&(
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">🚗 Notas Chauffeurs</p>
                {driverInvoices.filter(i=>inPeriod(i.invoice_date)).map(inv=>(
                  <div key={inv.id} className={`bg-white border rounded-xl p-4 mb-2 ${inv.paid_at?'border-zinc-100':'border-amber-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">🚗 Transport</span>
                          <span className="text-xs text-zinc-400">{inv.driver_suppliers?.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid_at?'bg-green-50 text-[#0d9e75]':'bg-amber-50 text-amber-700'}`}>{inv.paid_at?'✅ Payée':'⏳ À payer'}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#1a1918]">{inv.invoice_ref??`Nota ${new Date(inv.invoice_date).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}`}</p>
                        <p className="text-xs text-zinc-400">{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                        {inv.driver_invoice_lines?.map(l=>(
                          <div key={l.id} className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                            <span className="text-zinc-300">·</span>
                            {l.transfer_date&&<span>{new Date(l.transfer_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</span>}
                            <span className="font-medium">{l.intern_name??'—'}</span>
                            <span className="ml-auto">{l.amount_idr?new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(l.amount_idr):'—'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-[#1a1918]">{inv.total_amount_idr?new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(inv.total_amount_idr):'—'}</p>
                        {inv.total_amount_eur&&<p className="text-xs text-zinc-400">≈ {FMT(inv.total_amount_eur)}</p>}
                        <a href="/fr/settings/drivers" className="text-xs text-[#c8a96e] mt-1 block">Gérer →</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filtInv.length===0&&driverInvoices.filter(i=>inPeriod(i.invoice_date)).length===0&&<div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">🧾</p><p>Aucune facture sur cette période</p></div>}
          </div>
        )}

        {/* BILLING */}
        {tab==='billing'&&(
          <div className="space-y-2">
            {filtBil.map(b=>(
              <div key={b.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.type==='revenue'?'bg-green-100 text-[#0d9e75]':'bg-red-100 text-red-600'}`}>{b.type==='revenue'?'Entrée':'Sortie'}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{b.category}</span>
                    {b.paid_at&&<span className="text-xs text-[#0d9e75]">✅</span>}
                    {b.category==='payout_fondateur'&&<span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Payout</span>}
                  </div>
                  <p className="text-sm font-medium text-[#1a1918] truncate">{b.label}</p>
                  {b.cases?.interns&&<p className="text-xs text-zinc-400">{b.cases.interns.first_name} {b.cases.interns.last_name}</p>}
                  <p className="text-xs text-zinc-400">{new Date(b.recorded_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className={`text-lg font-bold ${b.type==='revenue'?'text-[#0d9e75]':'text-red-500'}`}>{b.type==='revenue'?'+':'-'}{FMT(b.amount_eur)}</p>
                  <button onClick={()=>setDeleteEntry(b)} className="text-xs text-zinc-300 hover:text-red-400">🗑</button>
                </div>
              </div>
            ))}
            {filtBil.length===0&&<div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">💳</p><p>Aucun flux sur cette période</p></div>}
          </div>
        )}

        {/* OPS — Opérations manuelles */}
        {tab==='ops'&&(
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={()=>setShowExpense(true)} className="bg-white border border-red-100 rounded-2xl p-5 text-left hover:border-red-300 transition-colors group">
                <p className="text-2xl mb-2">➖</p>
                <p className="font-semibold text-[#1a1918]">Ajouter une dépense</p>
                <p className="text-xs text-zinc-400 mt-1">Coût opérationnel, frais, charge diverses</p>
              </button>
              <button onClick={()=>setShowRevenue(true)} className="bg-white border border-green-100 rounded-2xl p-5 text-left hover:border-green-300 transition-colors group">
                <p className="text-2xl mb-2">➕</p>
                <p className="font-semibold text-[#1a1918]">Enregistrer un revenu</p>
                <p className="text-xs text-zinc-400 mt-1">Paiement client, commission, autre entrée</p>
              </button>
              <button onClick={()=>setShowPayout(true)} className="bg-white border border-[#c8a96e]/30 rounded-2xl p-5 text-left hover:border-[#c8a96e] transition-colors group">
                <p className="text-2xl mb-2">💸</p>
                <p className="font-semibold text-[#1a1918]">Verser un payout fondateur</p>
                <p className="text-xs text-zinc-400 mt-1">Virement Sidney ou Charly — tracé dans les billings</p>
              </button>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Dernières opérations manuelles</p>
              {billing.filter(b=>!b.cases&&['payout_fondateur','salaire','commission','frais_bancaires'].includes(b.category)).slice(0,10).map(b=>(
                <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-zinc-50 last:border-0">
                  <div>
                    <p className="text-sm text-[#1a1918]">{b.label}</p>
                    <p className="text-xs text-zinc-400">{new Date(b.recorded_at).toLocaleDateString('fr-FR')} · {b.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-bold ${b.type==='revenue'?'text-[#0d9e75]':'text-red-500'}`}>{b.type==='revenue'?'+':'-'}{FMT(b.amount_eur)}</p>
                    <button onClick={()=>setDeleteEntry(b)} className="text-zinc-200 hover:text-red-400 text-xs">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* DÉPENSE */}
      {showExpense&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowExpense(false)}}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1a1918]">➖ Ajouter une dépense</h2>
            <button onClick={()=>setShowExpense(false)} className="text-zinc-400 text-xl">×</button>
          </div>
          <form onSubmit={saveExpense} className="px-6 py-5 space-y-3">
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Description *</label><input required className={inp} placeholder="Ex: Abonnement Notion, Frais bancaires…" value={expForm.label} onChange={e=>setExpForm(p=>({...p,label:e.target.value}))}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                <select className={inp} value={expForm.category} onChange={e=>setExpForm(p=>({...p,category:e.target.value}))}>
                  {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant (EUR) *</label><input required type="number" step="0.01" className={inp} value={expForm.amount_eur} onChange={e=>setExpForm(p=>({...p,amount_eur:e.target.value}))}/></div>
            </div>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date</label><input type="date" className={inp} value={expForm.date} onChange={e=>setExpForm(p=>({...p,date:e.target.value}))}/></div>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={expForm.notes} onChange={e=>setExpForm(p=>({...p,notes:e.target.value}))}/></div>
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={()=>setShowExpense(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
              <button type="submit" disabled={savingOp} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl">{savingOp?'Enregistrement…':'Enregistrer la dépense'}</button>
            </div>
          </form>
        </div>
      </div>}

      {/* REVENU */}
      {showRevenue&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowRevenue(false)}}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1a1918]">➕ Enregistrer un revenu</h2>
            <button onClick={()=>setShowRevenue(false)} className="text-zinc-400 text-xl">×</button>
          </div>
          <form onSubmit={saveRevenue} className="px-6 py-5 space-y-3">
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Description *</label><input required className={inp} placeholder="Ex: Paiement package C22B — Dupont Marie" value={revForm.label} onChange={e=>setRevForm(p=>({...p,label:e.target.value}))}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                <select className={inp} value={revForm.category} onChange={e=>setRevForm(p=>({...p,category:e.target.value}))}>
                  {['package','commission','direct_client','referral','other'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant (EUR) *</label><input required type="number" step="0.01" className={inp} value={revForm.amount_eur} onChange={e=>setRevForm(p=>({...p,amount_eur:e.target.value}))}/></div>
            </div>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date</label><input type="date" className={inp} value={revForm.date} onChange={e=>setRevForm(p=>({...p,date:e.target.value}))}/></div>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="checkbox" checked={revForm.paid} onChange={e=>setRevForm(p=>({...p,paid:e.target.checked}))}/> Déjà encaissé
            </label>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={revForm.notes} onChange={e=>setRevForm(p=>({...p,notes:e.target.value}))}/></div>
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={()=>setShowRevenue(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
              <button type="submit" disabled={savingOp} className="flex-1 py-2.5 bg-[#0d9e75] text-white text-sm font-bold rounded-xl">{savingOp?'Enregistrement…':'Enregistrer le revenu'}</button>
            </div>
          </form>
        </div>
      </div>}

      {/* PAYOUT */}
      {showPayout&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowPayout(false)}}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1a1918]">💸 Verser un payout fondateur</h2>
            <button onClick={()=>setShowPayout(false)} className="text-zinc-400 text-xl">×</button>
          </div>
          <form onSubmit={savePayout} className="px-6 py-5 space-y-3">
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Fondateur *</label>
              <select required className={inp} value={payForm.founder_name} onChange={e=>setPayForm(p=>({...p,founder_name:e.target.value}))}>
                <option value="">— Choisir —</option>
                {config.founders.map(f=>(
                  <option key={f.name} value={f.name}>{f.name} ({f.payout_pct}% · {FMT((netMargin*f.payout_pct)/100)} théorique)</option>
                ))}
                <option value="Sidney Ruby">Sidney Ruby</option>
                <option value="Charly Gestede">Charly Gestede</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant (EUR) *</label><input required type="number" step="0.01" className={inp} value={payForm.amount_eur} onChange={e=>setPayForm(p=>({...p,amount_eur:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date</label><input type="date" className={inp} value={payForm.date} onChange={e=>setPayForm(p=>({...p,date:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Méthode</label>
                <select className={inp} value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))}>
                  <option>Wise</option><option>Virement SEPA</option><option>PayPal</option><option>Crypto</option><option>Espèces</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Référence</label><input className={inp} placeholder="TX-XXXX" value={payForm.ref} onChange={e=>setPayForm(p=>({...p,ref:e.target.value}))}/></div>
            </div>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))}/></div>
            {payForm.founder_name&&payForm.amount_eur&&(
              <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/20 rounded-xl p-3 text-xs text-zinc-600">
                Enregistré comme dépense "Payout {payForm.founder_name}" · {FMT(parseFloat(payForm.amount_eur)||0)} · {new Date(payForm.date).toLocaleDateString('fr-FR')} · {payForm.method}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={()=>setShowPayout(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
              <button type="submit" disabled={savingOp} className="flex-1 py-2.5 bg-[#1a1918] text-[#c8a96e] text-sm font-bold rounded-xl">{savingOp?'Enregistrement…':'Confirmer le payout'}</button>
            </div>
          </form>
        </div>
      </div>}

      {/* DELETE ENTRY */}
      {deleteEntry&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">🗑</p>
          <h3 className="font-bold text-[#1a1918] mb-1">Supprimer cette entrée ?</h3>
          <p className="text-sm text-zinc-500 mb-5">{deleteEntry.label} · {FMT(deleteEntry.amount_eur)}</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteEntry(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm">Annuler</button>
            <button onClick={handleDeleteEntry} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl">Supprimer</button>
          </div>
        </div>
      </div>}

      {/* DELETE INVOICE */}
      {deleteInv&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
          <p className="text-3xl mb-3">🗑</p>
          <p className="font-bold text-[#1a1918] mb-1">Supprimer cette facture ?</p>
          <p className="text-sm text-zinc-500 mb-1">{deleteInv.supplier_name}</p>
          <p className="text-xs font-mono text-zinc-400 mb-5">{deleteInv.invoice_number} · {deleteInv.amount_eur?FMT(deleteInv.amount_eur):'—'}</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteInv(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm">Annuler</button>
            <button onClick={handleDeleteInv} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl">Supprimer</button>
          </div>
        </div>
      </div>}

      {/* IMPORT FACTURE */}
      {showInvForm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowInvForm(false)}}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h2 className="text-base font-semibold text-[#1a1918]">📄 Importer une facture</h2>
            <button onClick={()=>setShowInvForm(false)} className="text-zinc-400 text-xl">×</button>
          </div>
          <form onSubmit={handleSaveInv} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${uploadDone?'border-[#0d9e75] bg-green-50':'border-zinc-200 hover:border-[#c8a96e]'}`}>
              {uploading?<div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/><p className="text-sm text-zinc-500">Claude analyse…</p></div>
                :uploadDone?<div><p className="text-2xl mb-1">✅</p><p className="text-sm font-semibold text-[#0d9e75]">Extrait</p><span className={`text-xs font-medium ${confBadge(extractConf)} px-2 py-0.5 rounded-full inline-block mt-1`}>Confiance {extractConf}</span></div>
                :<div><p className="text-3xl mb-2">📄</p><p className="text-sm font-semibold text-zinc-600">Déposer facture PDF / image</p><p className="text-xs text-zinc-400 mt-1">🤖 Claude extrait automatiquement</p></div>}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload}/>
            </div>
            <div className="flex flex-wrap gap-2">{SUPPLIER_TYPES.map(t=><button key={t.v} type="button" onClick={()=>setInvForm(f=>({...f,supplier_type:t.v}))} className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${invForm.supplier_type===t.v?'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]':'border-zinc-200 text-zinc-600'}`}>{t.l}</button>)}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Fournisseur *</label><input required className={inp} value={invForm.supplier_name} onChange={e=>setInvForm(f=>({...f,supplier_name:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">N° facture</label><input className={inp} value={invForm.invoice_number} onChange={e=>setInvForm(f=>({...f,invoice_number:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant EUR</label><input type="number" step="0.01" className={inp} value={invForm.amount_eur} onChange={e=>setInvForm(f=>({...f,amount_eur:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Montant local</label><input type="number" className={inp} value={invForm.amount_local} onChange={e=>setInvForm(f=>({...f,amount_local:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Devise</label><select className={inp} value={invForm.currency} onChange={e=>setInvForm(f=>({...f,currency:e.target.value}))}><option>IDR</option><option>EUR</option><option>USD</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date *</label><input required type="date" className={inp} value={invForm.invoice_date} onChange={e=>setInvForm(f=>({...f,invoice_date:e.target.value}))}/></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Payée le (si déjà réglée)</label><input type="date" className={inp} value={invForm.paid_at} onChange={e=>setInvForm(f=>({...f,paid_at:e.target.value}))}/></div>
            </div>
            <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))}/></div>
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={()=>setShowInvForm(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
              <button type="submit" disabled={savingInv} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl">{savingInv?'Enregistrement…':'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  )
}
