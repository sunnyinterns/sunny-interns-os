'use client'
import { useEffect, useState } from 'react'

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-[#1a1918]'
const IDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
const EUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

type Supplier = { id: string; name: string; whatsapp: string|null; phone: string|null; bank_name: string|null; bank_account_number: string|null; bank_account_holder: string|null; notes: string|null; is_active: boolean; is_default: boolean }
type Invoice = {
  id: string; invoice_ref: string|null; invoice_date: string; total_amount_idr: number|null; total_amount_eur: number|null
  paid_at: string|null; notes: string|null
  driver_suppliers?: { name: string }|null
  driver_invoice_lines?: { id: string; intern_name: string|null; transfer_date: string|null; amount_idr: number|null; amount_eur: number|null; cases?: { id: string; interns?: { first_name: string; last_name: string }|null }|null }[]
}
type Line = { intern_name: string; transfer_date: string; amount_idr: string; case_id: string }

const EMPTY_LINE: Line = { intern_name: '', transfer_date: new Date().toISOString().slice(0, 10), amount_idr: '400000', case_id: '' }

export default function DriversPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [idrRate, setIdrRate] = useState(16500)
  const [loading, setLoading] = useState(true)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier|null>(null)
  const [showInvModal, setShowInvModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const [savingS, setSavingS] = useState(false)
  const [savingI, setSavingI] = useState(false)

  const [sForm, setSForm] = useState({ name:'', whatsapp:'', phone:'', bank_name:'', bank_account_number:'', bank_account_holder:'', notes:'', is_default:false, is_active:true })
  const [iForm, setIForm] = useState({ driver_supplier_id:'', invoice_ref:'', invoice_date: new Date().toISOString().slice(0,10), notes:'', lines:[{...EMPTY_LINE}] as Line[] })

  async function load() {
    setLoading(true)
    const [sR, iR, cfgR] = await Promise.all([
      fetch('/api/driver-suppliers'),
      fetch('/api/driver-invoices'),
      fetch('/api/settings/finance-config'),
    ])
    setSuppliers(sR.ok ? await sR.json() : [])
    setInvoices(iR.ok ? await iR.json() : [])
    if (cfgR.ok) { const d = await cfgR.json() as { settings?: { idr_eur_rate?: number } }; if (d.settings?.idr_eur_rate) setIdrRate(d.settings.idr_eur_rate) }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function openEditSupplier(s: Supplier) {
    setEditingSupplier(s)
    setSForm({ name:s.name, whatsapp:s.whatsapp??'', phone:s.phone??'', bank_name:s.bank_name??'', bank_account_number:s.bank_account_number??'', bank_account_holder:s.bank_account_holder??'', notes:s.notes??'', is_default:s.is_default, is_active:s.is_active })
    setShowSupplierModal(true)
  }

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault(); setSavingS(true)
    const url = editingSupplier ? `/api/driver-suppliers/${editingSupplier.id}` : '/api/driver-suppliers'
    await fetch(url, { method: editingSupplier?'PATCH':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...sForm, whatsapp:sForm.whatsapp||null, phone:sForm.phone||null, bank_name:sForm.bank_name||null, bank_account_number:sForm.bank_account_number||null, bank_account_holder:sForm.bank_account_holder||null, notes:sForm.notes||null }) })
    setSavingS(false); setShowSupplierModal(false); setEditingSupplier(null); void load()
  }

  async function deleteSupplier() {
    if (!confirmDelete) return
    await fetch(`/api/driver-suppliers/${confirmDelete}`, { method:'DELETE' })
    setConfirmDelete(null); void load()
  }

  function addLine() { setIForm(f => ({...f, lines: [...f.lines, {...EMPTY_LINE}]})) }
  function removeLine(i: number) { setIForm(f => ({...f, lines: f.lines.filter((_,j)=>j!==i)})) }
  function updateLine(i: number, k: keyof Line, v: string) { setIForm(f => ({...f, lines: f.lines.map((l,j)=>j===i?{...l,[k]:v}:l)})) }

  const totalIdr = iForm.lines.reduce((s,l)=>s+(parseFloat(l.amount_idr)||0), 0)

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault(); setSavingI(true)
    const lines = iForm.lines.filter(l=>l.intern_name||l.amount_idr).map(l => ({
      intern_name: l.intern_name || null,
      transfer_date: l.transfer_date || null,
      amount_idr: parseFloat(l.amount_idr) || null,
      amount_eur: l.amount_idr ? parseFloat(l.amount_idr) / idrRate : null,
      case_id: l.case_id || null,
    }))
    const total_idr = lines.reduce((s, l) => s + (l.amount_idr ?? 0), 0)
    await fetch('/api/driver-invoices', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        driver_supplier_id: iForm.driver_supplier_id || null,
        invoice_ref: iForm.invoice_ref || null,
        invoice_date: iForm.invoice_date,
        total_amount_idr: total_idr,
        total_amount_eur: total_idr / idrRate,
        notes: iForm.notes || null,
        lines,
      }),
    })
    setSavingI(false); setShowInvModal(false)
    setIForm({ driver_supplier_id:'', invoice_ref:'', invoice_date: new Date().toISOString().slice(0,10), notes:'', lines:[{...EMPTY_LINE}] })
    void load()
  }

  async function markPaid(id: string) {
    await fetch(`/api/driver-invoices/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ paid_at: new Date().toISOString() }) })
    void load()
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Chauffeurs</h1>
            <p className="text-sm text-zinc-400">Prestataires de transfert aéroport · Factures liées aux dossiers clients</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditingSupplier(null); setSForm({name:'',whatsapp:'',phone:'',bank_name:'',bank_account_number:'',bank_account_holder:'',notes:'',is_default:false,is_active:true}); setShowSupplierModal(true) }}
              className="px-3 py-2 text-xs border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">+ Prestataire</button>
            <button onClick={() => setShowInvModal(true)}
              className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]">+ Importer nota</button>
          </div>
        </div>

        {/* Prestataires */}
        <div className="mb-6">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Prestataires chauffeurs</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suppliers.map(s => (
              <div key={s.id} className="bg-white border border-zinc-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#1a1918] text-sm">🚗 {s.name}</p>
                      {s.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Défaut</span>}
                    </div>
                    {s.whatsapp && <p className="text-xs text-zinc-400">💬 {s.whatsapp}</p>}
                    {s.bank_name && <p className="text-xs font-mono text-zinc-400">🏦 {s.bank_name} · {s.bank_account_number}</p>}
                    {s.notes && <p className="text-xs text-zinc-400 italic mt-1">{s.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditSupplier(s)} className="text-xs px-2 py-1 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">✏️</button>
                    <button onClick={() => setConfirmDelete(s.id)} className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Notas / Factures reçues</p>
          {loading ? <div className="h-20 bg-zinc-100 rounded-xl animate-pulse"/> : invoices.length === 0 ? (
            <div className="text-center py-12 text-zinc-400"><p className="text-3xl mb-2">🚗</p><p>Aucune nota importée</p></div>
          ) : invoices.map(inv => (
            <div key={inv.id} className={`bg-white border rounded-xl p-4 mb-3 ${inv.paid_at?'border-zinc-100':'border-amber-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-[#1a1918] text-sm">{inv.invoice_ref ?? `Nota ${new Date(inv.invoice_date).toLocaleDateString('fr-FR', {month:'long',year:'numeric'})}`}</p>
                    <span className="text-xs text-zinc-400">{inv.driver_suppliers?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inv.paid_at?'bg-green-50 text-[#0d9e75]':'bg-amber-50 text-amber-700'}`}>{inv.paid_at?'✅ Payée':'⏳ À payer'}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</p>
                  {inv.driver_invoice_lines?.map(l => (
                    <div key={l.id} className="text-xs text-zinc-500 flex items-center gap-2 py-0.5">
                      <span className="text-zinc-300">·</span>
                      {l.transfer_date && <span>{new Date(l.transfer_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</span>}
                      <span className="font-medium text-[#1a1918]">{l.intern_name ?? l.cases?.interns ? `${l.cases?.interns?.first_name} ${l.cases?.interns?.last_name}` : '—'}</span>
                      <span className="ml-auto font-semibold">{l.amount_idr ? IDR(l.amount_idr) : '—'}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-[#1a1918]">{inv.total_amount_idr ? IDR(inv.total_amount_idr) : '—'}</p>
                  {inv.total_amount_eur && <p className="text-xs text-zinc-400">≈ {EUR(inv.total_amount_eur)}</p>}
                  {!inv.paid_at && (
                    <button onClick={() => markPaid(inv.id)} className="mt-2 text-xs px-2.5 py-1 bg-[#0d9e75] text-white rounded-lg block">✓ Régler</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUPPLIER MODAL */}
        {showSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowSupplierModal(false)}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editingSupplier?'Modifier prestataire':'Nouveau prestataire'}</h2>
                <button onClick={()=>setShowSupplierModal(false)} className="text-zinc-400 text-xl">×</button>
              </div>
              <form onSubmit={saveSupplier} className="px-6 py-4 space-y-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label><input required className={inp} value={sForm.name} onChange={e=>setSForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Ahmad Chauffeur Bali"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label><input className={inp} value={sForm.whatsapp} onChange={e=>setSForm(p=>({...p,whatsapp:e.target.value}))} placeholder="+62 812…"/></div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label><input className={inp} value={sForm.phone} onChange={e=>setSForm(p=>({...p,phone:e.target.value}))}/></div>
                </div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Banque</label><input className={inp} value={sForm.bank_name} onChange={e=>setSForm(p=>({...p,bank_name:e.target.value}))}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">N° compte</label><input className={`${inp} font-mono text-xs`} value={sForm.bank_account_number} onChange={e=>setSForm(p=>({...p,bank_account_number:e.target.value}))}/></div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Titulaire</label><input className={inp} value={sForm.bank_account_holder} onChange={e=>setSForm(p=>({...p,bank_account_holder:e.target.value}))}/></div>
                </div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={sForm.notes} onChange={e=>setSForm(p=>({...p,notes:e.target.value}))}/></div>
                <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                  <input type="checkbox" checked={sForm.is_default} onChange={e=>setSForm(p=>({...p,is_default:e.target.checked}))}/> Prestataire par défaut
                </label>
                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <button type="button" onClick={()=>setShowSupplierModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
                  <button type="submit" disabled={savingS} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl disabled:opacity-50">{savingS?'Sauvegarde…':'Sauvegarder'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVOICE MODAL */}
        {showInvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e=>{if(e.target===e.currentTarget)setShowInvModal(false)}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold text-[#1a1918]">🚗 Importer une nota chauffeur</h2>
                <button onClick={()=>setShowInvModal(false)} className="text-zinc-400 text-xl">×</button>
              </div>
              <form onSubmit={saveInvoice} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Prestataire</label>
                    <select className={inp} value={iForm.driver_supplier_id} onChange={e=>setIForm(p=>({...p,driver_supplier_id:e.target.value}))}>
                      <option value="">— Choisir —</option>
                      {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Référence nota</label>
                    <input className={inp} value={iForm.invoice_ref} onChange={e=>setIForm(p=>({...p,invoice_ref:e.target.value}))} placeholder="Ex: Nota Sep 2025"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
                    <input type="date" className={inp} value={iForm.invoice_date} onChange={e=>setIForm(p=>({...p,invoice_date:e.target.value}))}/>
                  </div>
                </div>

                {/* Lignes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Transferts</p>
                    <button type="button" onClick={addLine} className="text-xs text-[#c8a96e] hover:underline">+ Ligne</button>
                  </div>
                  <div className="border border-zinc-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-zinc-400 font-medium">Date</th>
                          <th className="px-3 py-2 text-left text-zinc-400 font-medium">Nom stagiaire</th>
                          <th className="px-3 py-2 text-right text-zinc-400 font-medium">Montant IDR</th>
                          <th className="px-3 py-2 text-right text-zinc-400 font-medium">≈ EUR</th>
                          <th className="w-8"/>
                        </tr>
                      </thead>
                      <tbody>
                        {iForm.lines.map((l, i) => (
                          <tr key={i} className="border-t border-zinc-50">
                            <td className="px-2 py-1.5"><input type="date" className="w-full text-xs px-2 py-1 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c8a96e]" value={l.transfer_date} onChange={e=>updateLine(i,'transfer_date',e.target.value)}/></td>
                            <td className="px-2 py-1.5"><input className="w-full text-xs px-2 py-1 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c8a96e]" placeholder="Prénom Nom" value={l.intern_name} onChange={e=>updateLine(i,'intern_name',e.target.value)}/></td>
                            <td className="px-2 py-1.5"><input type="number" className="w-full text-xs px-2 py-1 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c8a96e] text-right font-mono" value={l.amount_idr} onChange={e=>updateLine(i,'amount_idr',e.target.value)}/></td>
                            <td className="px-3 py-1.5 text-right text-zinc-400">{l.amount_idr ? EUR(parseFloat(l.amount_idr)/idrRate) : '—'}</td>
                            <td className="px-2 py-1.5 text-center"><button type="button" onClick={()=>removeLine(i)} className="text-zinc-300 hover:text-red-400">×</button></td>
                          </tr>
                        ))}
                        {/* Total */}
                        <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                          <td colSpan={2} className="px-3 py-2 font-bold text-zinc-600 text-xs">Total</td>
                          <td className="px-3 py-2 text-right font-bold text-[#1a1918] font-mono">{IDR(totalIdr)}</td>
                          <td className="px-3 py-2 text-right font-bold text-[#c8a96e]">{EUR(totalIdr/idrRate)}</td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Taux : 1 EUR = {idrRate.toLocaleString()} IDR</p>
                </div>

                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label><textarea className={inp} rows={2} value={iForm.notes} onChange={e=>setIForm(p=>({...p,notes:e.target.value}))}/></div>

                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <button type="button" onClick={()=>setShowInvModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
                  <button type="submit" disabled={savingI} className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl disabled:opacity-50">{savingI?'Enregistrement…':'Sauvegarder la nota'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
              <p className="text-3xl mb-3">🗑</p>
              <h3 className="font-bold text-[#1a1918] mb-4">Supprimer ce prestataire ?</h3>
              <div className="flex gap-3">
                <button onClick={()=>setConfirmDelete(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm">Annuler</button>
                <button onClick={deleteSupplier} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
