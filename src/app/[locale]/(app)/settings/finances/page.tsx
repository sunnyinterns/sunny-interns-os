'use client'
import { useEffect, useState } from 'react'

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-[#1a1918]'

type Founder = {
  id: string; name: string; email: string; role: string
  payout_pct: number; payout_basis: 'margin' | 'revenue'
  payment_method: string; wise_email: string; iban: string; notes: string
}

type FinanceSettings = {
  fiscal_year_start: string
  default_currency: string
  idr_eur_rate: number
  usd_eur_rate: number
  sgd_eur_rate: number
  auto_payout_calculation: boolean
  visa_cost_default_idr: number
  tva_default_pct: number
}

export default function FinanceSettingsPage() {
  const [founders, setFounders] = useState<Founder[]>([
    { id: 'sidney', name: 'Sidney Ruby', email: 'sidney.ruby@gmail.com', role: 'CEO & Fondateur',
      payout_pct: 15, payout_basis: 'margin', payment_method: 'Wise', wise_email: 'sidney.ruby@gmail.com', iban: '', notes: '' },
    { id: 'charly', name: 'Charly Gestede', email: 'charly@bali-interns.com', role: 'Co-fondateur',
      payout_pct: 85, payout_basis: 'margin', payment_method: 'Wise', wise_email: 'charly@bali-interns.com', iban: '', notes: '' },
  ])
  const [settings, setSettings] = useState<FinanceSettings>({
    fiscal_year_start: '01-01',
    default_currency: 'EUR',
    idr_eur_rate: 16500,
    usd_eur_rate: 0.92,
    sgd_eur_rate: 0.70,
    auto_payout_calculation: true,
    visa_cost_default_idr: 7500000,
    tva_default_pct: 0,
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'payouts'|'rates'|'fiscal'>('payouts')

  useEffect(() => {
    // Load from DB settings
    fetch('/api/settings/finance-config').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return
      if (d.settings) setSettings(s => ({ ...s, ...d.settings }))
      if (d.founders) setFounders(d.founders)
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings/finance-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, founders }),
    })
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalPct = founders.reduce((s, f) => s + f.payout_pct, 0)
  const validPct = Math.abs(totalPct - 100) < 0.1

  function updateFounder(id: string, key: keyof Founder, val: unknown) {
    setFounders(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f))
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Finance Settings</h1>
            <p className="text-sm text-zinc-400">Payout, taux de change, paramètres fiscaux</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50">
            {saving ? 'Sauvegarde…' : saved ? '✅ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mb-6">
          {([['payouts','💸 Payout fondateurs'],['rates','💱 Taux de change'],['fiscal','📅 Fiscal']] as const).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab===t?'bg-white shadow text-[#1a1918]':'text-zinc-500 hover:text-zinc-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── PAYOUT FONDATEURS ── */}
        {tab === 'payouts' && (
          <div className="space-y-4">
            <div className={`border rounded-2xl p-4 text-sm ${validPct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <strong>Total : {totalPct.toFixed(1)}%</strong>
              {validPct ? ' ✅ La répartition est équilibrée.' : ' ⚠️ La somme doit être égale à 100%.'}
            </div>

            {/* Visual bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {founders.map((f, i) => (
                <div key={f.id} style={{ width: `${f.payout_pct}%`, background: i===0 ? '#c8a96e' : '#1a1918' }}
                  className="flex items-center justify-center" title={`${f.name} — ${f.payout_pct}%`}/>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              {founders.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: i===0?'#c8a96e':'#1a1918' }}/>
                  {f.name} — {f.payout_pct}%
                </span>
              ))}
            </div>

            {founders.map(f => (
              <div key={f.id} className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: f.id==='sidney'?'linear-gradient(135deg,#F5A623,#E8930A)':'#1a1918' }}>
                    {f.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a1918]">{f.name}</p>
                    <p className="text-xs text-zinc-400">{f.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Part (%)</label>
                    <input type="number" min="0" max="100" step="0.5" className={inp}
                      value={f.payout_pct} onChange={e => updateFounder(f.id, 'payout_pct', parseFloat(e.target.value)||0)}/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Base de calcul</label>
                    <select className={inp} value={f.payout_basis}
                      onChange={e => updateFounder(f.id, 'payout_basis', e.target.value)}>
                      <option value="margin">% de la marge nette</option>
                      <option value="revenue">% du chiffre d'affaires</option>
                    </select>
                  </div>
                </div>

                <div className="bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-xl p-3 text-xs text-zinc-600">
                  {f.id === 'sidney'
                    ? `Sidney reçoit ${f.payout_pct}% de la marge nette (revenus − coûts directs − factures fournisseurs)`
                    : `Charly reçoit ${f.payout_pct}% de la marge nette — le solde après la part de Sidney`
                  }
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Mode de paiement</label>
                    <select className={inp} value={f.payment_method}
                      onChange={e => updateFounder(f.id, 'payment_method', e.target.value)}>
                      <option>Wise</option><option>Virement SEPA</option><option>PayPal</option><option>Crypto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Email Wise</label>
                    <input type="email" className={inp} value={f.wise_email}
                      onChange={e => updateFounder(f.id, 'wise_email', e.target.value)}/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">IBAN (virement)</label>
                  <input className={`${inp} font-mono text-xs`} value={f.iban} placeholder="FR76 3000 ..."
                    onChange={e => updateFounder(f.id, 'iban', e.target.value)}/>
                </div>
              </div>
            ))}

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs text-zinc-500">
              <p className="font-semibold text-zinc-600 mb-1">💡 Fonctionnement du payout</p>
              <p>Le calcul se fait sur la <strong>marge nette</strong> = Revenus stagiaires − Coûts directs (agent visa, etc.) − Factures fournisseurs importées.</p>
              <p className="mt-1">Sidney reçoit <strong>15%</strong> en priorité, Charly reçoit <strong>85%</strong> du solde restant. Les payouts sont tracés manuellement dans Finance → Suivi billings.</p>
            </div>
          </div>
        )}

        {/* ── TAUX DE CHANGE ── */}
        {tab === 'rates' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Taux de conversion → EUR</p>
              <p className="text-xs text-zinc-400 mb-4">Ces taux sont utilisés pour convertir les factures IDR/USD/SGD en EUR dans les KPIs financiers. Mettez-les à jour mensuellement.</p>

              {[
                { label: '🇮🇩 IDR → EUR', key: 'idr_eur_rate' as const, hint: '1 EUR = X IDR', placeholder: '16500' },
                { label: '🇺🇸 USD → EUR', key: 'usd_eur_rate' as const, hint: '1 USD = X EUR', placeholder: '0.92' },
                { label: '🇸🇬 SGD → EUR', key: 'sgd_eur_rate' as const, hint: '1 SGD = X EUR', placeholder: '0.70' },
              ].map(({ label, key, hint, placeholder }) => (
                <div key={key} className="flex items-center gap-4 py-3 border-b border-zinc-50 last:border-0">
                  <p className="text-sm font-medium text-[#1a1918] w-32">{label}</p>
                  <input type="number" step="0.0001" className={`${inp} w-40`}
                    value={settings[key]} placeholder={placeholder}
                    onChange={e => setSettings(s => ({ ...s, [key]: parseFloat(e.target.value)||0 }))}/>
                  <p className="text-xs text-zinc-400">{hint}</p>
                </div>
              ))}

              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Exemple avec les taux actuels :</p>
                <p>Facture BIBI : 45,000,000 IDR ÷ {settings.idr_eur_rate.toLocaleString()} = <strong>{(45000000 / settings.idr_eur_rate).toFixed(0)} €</strong></p>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Coût visa par défaut</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Coût agent visa (IDR) par stagiaire</label>
                <input type="number" className={inp} value={settings.visa_cost_default_idr}
                  onChange={e => setSettings(s => ({ ...s, visa_cost_default_idr: parseFloat(e.target.value)||0 }))}/>
                <p className="text-xs text-zinc-400 mt-1">
                  ≈ {(settings.visa_cost_default_idr / settings.idr_eur_rate).toFixed(0)} € au taux actuel · Utilisé pour calculer la marge des packages
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">TVA par défaut (%)</label>
                <select className={inp} value={settings.tva_default_pct}
                  onChange={e => setSettings(s => ({ ...s, tva_default_pct: parseFloat(e.target.value) }))}>
                  <option value={0}>0% — Exonérée (international)</option>
                  <option value={20}>20% — France</option>
                  <option value={11}>11% — Indonésie (PPN)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── FISCAL ── */}
        {tab === 'fiscal' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Exercice fiscal</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Début d'exercice</label>
                <select className={inp} value={settings.fiscal_year_start}
                  onChange={e => setSettings(s => ({ ...s, fiscal_year_start: e.target.value }))}>
                  <option value="01-01">1er Janvier</option>
                  <option value="04-01">1er Avril</option>
                  <option value="07-01">1er Juillet</option>
                  <option value="10-01">1er Octobre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Devise principale</label>
                <select className={inp} value={settings.default_currency}
                  onChange={e => setSettings(s => ({ ...s, default_currency: e.target.value }))}>
                  <option>EUR</option><option>USD</option><option>IDR</option>
                </select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">📋 Rappel légal</p>
              <p>Bali Interns opère depuis l'Indonésie (Bali). Les revenus perçus des stagiaires français peuvent être soumis à déclaration fiscale selon votre structure juridique. Consultez votre comptable pour la configuration TVA/PPN.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
