'use client'
import { useEffect, useState } from 'react'

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-[#1a1918]'

type Founder = { id:string; name:string; email:string; role:string; payout_pct:number; payout_basis:string; payment_method:string; wise_email:string; iban:string }
type FinSettings = { fiscal_year_start:string; default_currency:string; idr_eur_rate:number; usd_eur_rate:number; sgd_eur_rate:number; driver_cost_idr:number }

const DEFAULTS: Founder[] = [
  { id:'sidney', name:'Sidney Ruby',    email:'sidney.ruby@gmail.com', role:'CEO & Fondateur', payout_pct:15, payout_basis:'margin', payment_method:'Wise', wise_email:'sidney.ruby@gmail.com', iban:'' },
  { id:'charly', name:'Charly Gestede', email:'charly@bali-interns.com', role:'Co-fondateur',   payout_pct:85, payout_basis:'margin', payment_method:'Wise', wise_email:'charly@bali-interns.com', iban:'' },
]
const SETTINGS_DEF: FinSettings = { fiscal_year_start:'01-01', default_currency:'EUR', idr_eur_rate:16500, usd_eur_rate:0.92, sgd_eur_rate:0.70, driver_cost_idr:400000 }

export default function FinanceSettingsPage() {
  const [founders, setFounders] = useState<Founder[]>(DEFAULTS)
  const [settings, setSettings] = useState<FinSettings>(SETTINGS_DEF)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'payouts'|'rates'|'fiscal'>('payouts')

  useEffect(() => {
    fetch('/api/settings/finance-config').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return
      if (d.settings) setSettings(s => ({ ...s, ...d.settings }))
      if (d.founders && d.founders.length >= 2) setFounders(d.founders)
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings/finance-config', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ settings, founders }),
    })
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalPct = founders.reduce((s,f) => s + (f.payout_pct || 0), 0)
  const valid = Math.abs(totalPct - 100) < 0.1
  const f = (id:string, k:keyof Founder, v:unknown) => setFounders(prev => prev.map(fo => fo.id===id ? {...fo,[k]:v} : fo))

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finance Settings</h1>
            <p className="text-sm text-zinc-400">Payout · Taux de change · Configuration fiscale</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50">
            {saving ? 'Sauvegarde…' : saved ? '✅ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mb-6">
          {([['payouts','💸 Payout'],['rates','💱 Taux & Coûts'],['fiscal','🏢 Sociétés']] as const).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab===t?'bg-white shadow text-[#1a1918]':'text-zinc-500 hover:text-zinc-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* PAYOUT */}
        {tab==='payouts' && (
          <div className="space-y-4">
            <div className={`border rounded-2xl p-3 text-sm font-medium ${valid?'bg-green-50 border-green-200 text-green-800':'bg-red-50 border-red-200 text-red-700'}`}>
              Total : {totalPct.toFixed(1)}% {valid ? '✅ Répartition valide' : '⚠️ La somme doit être 100%'}
            </div>
            <div className="h-2.5 flex rounded-full overflow-hidden gap-0.5">
              {founders.map((fo,i) => (
                <div key={fo.id} style={{ width:`${fo.payout_pct||0}%`, background:i===0?'#c8a96e':'#1a1918' }} title={`${fo.name} — ${fo.payout_pct}%`}/>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              {founders.map((fo,i) => (
                <span key={fo.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background:i===0?'#c8a96e':'#1a1918' }}/>
                  {fo.name} — {fo.payout_pct}%
                </span>
              ))}
            </div>

            {founders.map((fo,i) => (
              <div key={fo.id} className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background:i===0?'linear-gradient(135deg,#F5A623,#E8930A)':'#1a1918' }}>
                    {fo.name[0]}
                  </div>
                  <div><p className="font-semibold text-[#1a1918]">{fo.name}</p><p className="text-xs text-zinc-400">{fo.role}</p></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Part (%)</label>
                    <input type="number" min="0" max="100" step="0.5" className={inp}
                      value={fo.payout_pct} onChange={e => f(fo.id,'payout_pct',parseFloat(e.target.value)||0)}/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Base de calcul</label>
                    <select className={inp} value={fo.payout_basis} onChange={e => f(fo.id,'payout_basis',e.target.value)}>
                      <option value="margin">% de la marge nette</option>
                      <option value="revenue">% du chiffre d'affaires</option>
                    </select>
                  </div>
                </div>

                <div className="bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-xl p-3 text-xs text-zinc-600">
                  {i===0 ? `${fo.name} reçoit ${fo.payout_pct}% de la marge nette en priorité`
                         : `${fo.name} reçoit ${fo.payout_pct}% — le solde après la part de ${founders[0]?.name ?? 'Sidney'}`}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Mode paiement</label>
                    <select className={inp} value={fo.payment_method} onChange={e => f(fo.id,'payment_method',e.target.value)}>
                      <option>Wise</option><option>Virement SEPA</option><option>PayPal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Email Wise</label>
                    <input type="email" className={inp} value={fo.wise_email} onChange={e => f(fo.id,'wise_email',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">IBAN</label>
                  <input className={`${inp} font-mono text-xs`} placeholder="FR76 3000 …" value={fo.iban} onChange={e => f(fo.id,'iban',e.target.value)}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RATES */}
        {tab==='rates' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Taux de conversion → EUR</p>
              {([
                { label:'🇮🇩 IDR → EUR', key:'idr_eur_rate' as const, hint:'1 EUR = X IDR', ph:'16500' },
                { label:'🇺🇸 USD → EUR', key:'usd_eur_rate' as const, hint:'1 USD = X EUR', ph:'0.92' },
                { label:'🇸🇬 SGD → EUR', key:'sgd_eur_rate' as const, hint:'1 SGD = X EUR', ph:'0.70' },
              ]).map(({ label, key, hint, ph }) => (
                <div key={key} className="flex items-center gap-4 py-3 border-b border-zinc-50 last:border-0">
                  <p className="text-sm font-medium text-[#1a1918] w-36 shrink-0">{label}</p>
                  <input type="number" step="0.0001" className={`${inp} w-40`} placeholder={ph}
                    value={settings[key]}
                    onChange={e => setSettings(s => ({...s, [key]: parseFloat(e.target.value)||0}))}/>
                  <p className="text-xs text-zinc-400">{hint}</p>
                </div>
              ))}
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Facture BIBI : 45 000 000 IDR ÷ {settings.idr_eur_rate.toLocaleString()} = <strong>{(45000000/settings.idr_eur_rate).toFixed(0)} €</strong>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Coût chauffeur arrivée</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Tarif par réservation (IDR)</label>
                <input type="number" className={inp} value={settings.driver_cost_idr}
                  onChange={e => setSettings(s => ({...s, driver_cost_idr: parseFloat(e.target.value)||0}))}/>
                <p className="text-xs text-zinc-400 mt-1">
                  ≈ {(settings.driver_cost_idr/settings.idr_eur_rate).toFixed(0)} € · Compté automatiquement dans les charges à venir sur le dashboard finance
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FISCAL / SOCIÉTÉS */}
        {tab==='fiscal' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">📋 Configuration des sociétés facturantes</p>
              <p>Configurez ici chaque entité légale qui facture vos clients. La sélection de la société se fait automatiquement selon la nationalité du stagiaire au moment de la création du dossier.</p>
            </div>
            <a href="/fr/settings/billing-companies"
              className="flex items-center justify-between bg-white border border-zinc-100 rounded-2xl p-5 hover:border-[#c8a96e] transition-colors group">
              <div>
                <p className="font-semibold text-[#1a1918]">Gérer les sociétés facturantes</p>
                <p className="text-xs text-zinc-400 mt-0.5">SIDLYS INTERNATIONAL LLC · Bali Interns · + Ajouter</p>
              </div>
              <span className="text-zinc-300 group-hover:text-[#c8a96e] text-xl">→</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
