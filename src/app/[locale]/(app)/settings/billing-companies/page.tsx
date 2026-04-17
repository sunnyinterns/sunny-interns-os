'use client'
import { useEffect, useState } from 'react'

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-[#1a1918]'

type BillingCompany = {
  id: string; name: string; legal_form: string|null; country: string
  address: string|null; tax_id: string|null; registration_number: string|null
  currency: string; stripe_link: string|null; bank_name: string|null
  bank_iban: string|null; bank_swift: string|null; bank_account_number: string|null
  bank_account_holder: string|null; billing_rule: string
  excluded_nationalities: string[]|null; included_nationalities: string[]|null
  is_default: boolean; is_active: boolean; notes: string|null
}

const EMPTY = {
  name:'', legal_form:'LLC', country:'USA', address:'', tax_id:'', registration_number:'',
  currency:'EUR', stripe_link:'', bank_name:'', bank_iban:'', bank_swift:'',
  bank_account_number:'', bank_account_holder:'',
  billing_rule:'all', excluded_nationalities_raw:'', included_nationalities_raw:'',
  is_default:false, is_active:true, notes:'',
}

const RULE_LABELS: Record<string,string> = {
  all: 'Tous les clients',
  exclude_nationality: 'Tous SAUF certaines nationalités',
  nationality_only: 'Uniquement certaines nationalités',
}

export default function BillingCompaniesPage() {
  const [companies, setCompanies] = useState<BillingCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BillingCompany|null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [tab, setTab] = useState<'general'|'banking'|'rules'>('general')
  const [confirmDelete, setConfirmDelete] = useState<BillingCompany|null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/billing-companies')
    setCompanies(r.ok ? await r.json() : [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function openEdit(c: BillingCompany) {
    setEditing(c)
    setForm({
      name: c.name, legal_form: c.legal_form ?? 'LLC', country: c.country,
      address: c.address ?? '', tax_id: c.tax_id ?? '', registration_number: c.registration_number ?? '',
      currency: c.currency, stripe_link: c.stripe_link ?? '',
      bank_name: c.bank_name ?? '', bank_iban: c.bank_iban ?? '',
      bank_swift: c.bank_swift ?? '', bank_account_number: c.bank_account_number ?? '',
      bank_account_holder: c.bank_account_holder ?? '',
      billing_rule: c.billing_rule,
      excluded_nationalities_raw: (c.excluded_nationalities ?? []).join(', '),
      included_nationalities_raw: (c.included_nationalities ?? []).join(', '),
      is_default: c.is_default, is_active: c.is_active, notes: c.notes ?? '',
    })
    setTab('general'); setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const body = {
      name: form.name, legal_form: form.legal_form || null, country: form.country,
      address: form.address || null, tax_id: form.tax_id || null,
      registration_number: form.registration_number || null,
      currency: form.currency, stripe_link: form.stripe_link || null,
      bank_name: form.bank_name || null, bank_iban: form.bank_iban || null,
      bank_swift: form.bank_swift || null, bank_account_number: form.bank_account_number || null,
      bank_account_holder: form.bank_account_holder || null,
      billing_rule: form.billing_rule,
      excluded_nationalities: form.excluded_nationalities_raw.split(',').map(s=>s.trim()).filter(Boolean),
      included_nationalities: form.included_nationalities_raw.split(',').map(s=>s.trim()).filter(Boolean),
      is_default: form.is_default, is_active: form.is_active, notes: form.notes || null,
    }
    const url = editing ? `/api/billing-companies/${editing.id}` : '/api/billing-companies'
    await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setShowModal(false); void load()
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await fetch(`/api/billing-companies/${confirmDelete.id}`, { method:'DELETE' })
    setCompanies(p => p.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null); void load()
  }

  const sf = (p: Partial<typeof EMPTY>) => setForm(prev => ({...prev, ...p}))

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Sociétés facturantes</h1>
            <p className="text-sm text-zinc-400">Configurez chaque entité légale et ses règles de facturation par nationalité</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({...EMPTY}); setTab('general'); setShowModal(true) }}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#c8a96e] text-white hover:bg-[#b8945a]">
            + Nouvelle société
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-4">
            {companies.map(c => (
              <div key={c.id} className={`bg-white border rounded-2xl p-5 ${!c.is_active?'opacity-60':''} ${c.is_default?'border-[#c8a96e]/40':'border-zinc-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold text-[#1a1918]">{c.name}</p>
                      {c.legal_form && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{c.legal_form}</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">🌍 {c.country}</span>
                      {c.is_default && <span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] font-medium">Par défaut</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active?'bg-green-100 text-[#0d9e75]':'bg-zinc-100 text-zinc-500'}`}>
                        {c.is_active?'Active':'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">
                      📋 {RULE_LABELS[c.billing_rule] ?? c.billing_rule}
                      {c.billing_rule==='exclude_nationality' && c.excluded_nationalities?.length ? ` — sauf ${c.excluded_nationalities.join(', ')}` : ''}
                      {c.billing_rule==='nationality_only' && c.included_nationalities?.length ? ` : ${c.included_nationalities.join(', ')}` : ''}
                    </p>
                    {c.bank_name && (
                      <p className="text-xs font-mono text-zinc-400">🏦 {c.bank_name} · {c.bank_iban || c.bank_account_number || '—'}</p>
                    )}
                    {c.stripe_link && (
                      <a href={c.stripe_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#635BFF] hover:underline">⚡ Stripe configuré</a>
                    )}
                    {c.notes && <p className="text-xs text-zinc-400 mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => openEdit(c)} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">Modifier</button>
                    <button onClick={() => setConfirmDelete(c)} className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONFIRM DELETE */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
              <p className="text-3xl mb-3">🏢</p>
              <h3 className="font-bold text-[#1a1918] mb-1">Supprimer {confirmDelete.name} ?</h3>
              <p className="text-xs text-zinc-400 mb-5">Les dossiers associés seront dissociés de cette société.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600">Annuler</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target===e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col max-h-[92vh]">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? 'Modifier société' : 'Nouvelle société'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 text-xl">×</button>
              </div>
              <div className="flex gap-1 px-6 pt-3 shrink-0">
                {([['general','🏢 Général'],['banking','🏦 Paiement'],['rules','📋 Règles']] as const).map(([t,l]) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${tab===t?'bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]':'text-zinc-500 hover:bg-zinc-100'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSave} className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                {tab==='general' && <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la société *</label>
                    <input required className={inp} value={form.name} onChange={e=>sf({name:e.target.value})} placeholder="SIDLYS INTERNATIONAL LLC"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Forme juridique</label>
                      <input className={inp} value={form.legal_form} onChange={e=>sf({legal_form:e.target.value})} placeholder="LLC, SAS, PT…"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Pays</label>
                      <input className={inp} value={form.country} onChange={e=>sf({country:e.target.value})}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse</label>
                    <input className={inp} value={form.address} onChange={e=>sf({address:e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° fiscal / EIN / SIRET</label>
                      <input className={`${inp} font-mono text-xs`} value={form.tax_id} onChange={e=>sf({tax_id:e.target.value})} placeholder="XX-XXXXXXX"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° enregistrement</label>
                      <input className={`${inp} font-mono text-xs`} value={form.registration_number} onChange={e=>sf({registration_number:e.target.value})}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Devise de facturation</label>
                    <select className={inp} value={form.currency} onChange={e=>sf({currency:e.target.value})}>
                      <option>EUR</option><option>USD</option><option>IDR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notes internes</label>
                    <textarea className={inp} rows={2} value={form.notes} onChange={e=>sf({notes:e.target.value})}/>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                      <input type="checkbox" checked={form.is_active} onChange={e=>sf({is_active:e.target.checked})}/> Active
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                      <input type="checkbox" checked={form.is_default} onChange={e=>sf({is_default:e.target.checked})}/> Par défaut
                    </label>
                  </div>
                </>}

                {tab==='banking' && <>
                  <div className="bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl p-3 text-xs text-[#635BFF]">
                    ⚡ Stripe — lien de paiement pour cette entité
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Lien Stripe / Page de paiement</label>
                    <input className={inp} value={form.stripe_link} onChange={e=>sf({stripe_link:e.target.value})} placeholder="https://buy.stripe.com/…"/>
                  </div>
                  <div className="border-t border-zinc-100 pt-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Virement bancaire</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Banque</label>
                    <input className={inp} value={form.bank_name} onChange={e=>sf({bank_name:e.target.value})} placeholder="Wise, Mercury, BNP…"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">IBAN</label>
                    <input className={`${inp} font-mono text-xs`} value={form.bank_iban} onChange={e=>sf({bank_iban:e.target.value})} placeholder="FR76 3000 …"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Numéro de compte</label>
                      <input className={`${inp} font-mono text-xs`} value={form.bank_account_number} onChange={e=>sf({bank_account_number:e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">SWIFT / BIC</label>
                      <input className={`${inp} font-mono uppercase text-xs`} value={form.bank_swift} onChange={e=>sf({bank_swift:e.target.value.toUpperCase()})}/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Titulaire du compte</label>
                    <input className={inp} value={form.bank_account_holder} onChange={e=>sf({bank_account_holder:e.target.value})}/>
                  </div>
                </>}

                {tab==='rules' && <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mb-2">
                    Définissez quels clients cette société facture selon la nationalité du stagiaire. Si aucune règle ne correspond, la société par défaut est utilisée.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Règle de sélection</label>
                    <select className={inp} value={form.billing_rule} onChange={e=>sf({billing_rule:e.target.value})}>
                      <option value="all">Tous les clients</option>
                      <option value="exclude_nationality">Tous SAUF certaines nationalités</option>
                      <option value="nationality_only">Uniquement certaines nationalités</option>
                    </select>
                  </div>
                  {form.billing_rule==='exclude_nationality' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Nationalités exclues (séparées par virgule)</label>
                      <input className={inp} value={form.excluded_nationalities_raw} onChange={e=>sf({excluded_nationalities_raw:e.target.value})} placeholder="American, US Citizen"/>
                      <p className="text-xs text-zinc-400 mt-1">Ex: SIDLYS LLC facture TOUT LE MONDE sauf les Américains</p>
                    </div>
                  )}
                  {form.billing_rule==='nationality_only' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Nationalités concernées (séparées par virgule)</label>
                      <input className={inp} value={form.included_nationalities_raw} onChange={e=>sf({included_nationalities_raw:e.target.value})} placeholder="American, US Citizen"/>
                      <p className="text-xs text-zinc-400 mt-1">Ex: Bali Interns facture UNIQUEMENT les Américains</p>
                    </div>
                  )}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs text-zinc-600">
                    <p className="font-semibold mb-1">💡 Configuration recommandée</p>
                    <p>· <strong>SIDLYS INTERNATIONAL LLC</strong> → Tous SAUF American / US Citizen</p>
                    <p>· <strong>Bali Interns</strong> → Uniquement American / US Citizen</p>
                  </div>
                </>}

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
