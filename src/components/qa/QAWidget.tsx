'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type StepStatus = 'pending' | 'pass' | 'fail'

interface TestStep {
  id: string
  status: string
  title: string
  action: string
  expected: string[]
  email_expected?: string
  portal_url?: string
}

const CASE_ID = '8ebc87da-3de7-4f8c-82fe-fdf60995a6d4'
const PORTAL_TOKEN = '9776c61e-152e-48fd-bc8b-f6faa13d8ed7'
const BASE_URL = 'https://sunny-interns-os.vercel.app'

const STEPS: TestStep[] = [
  { id:'lead', status:'lead', title:'1. Voir le dossier Lead', action:'Va sur /fr/cases → cliquer "Test Stagiaire" → vérifier statut "Lead" + boutons dispo', expected:['Dossier visible dans la liste','Statut "Lead" affiché','Boutons : 📅 Booker RDV + ❌ Pas intéressé'] },
  { id:'rdv_booked', status:'rdv_booked', title:'2. Booker le RDV', action:'Cliquer "📅 Booker RDV"', expected:['Statut → RDV booké','Case log créé','Nouveau bouton : ✅ Qualif faite'] },
  { id:'qualification_done', status:'qualification_done', title:'3. Qualification → Email portail', action:'Cliquer "✅ Qualif faite"', expected:['Statut → Qualification faite','📧 Email : "Entretien validé — Accès à ton espace" sur sidney.ruby@gmail.com','Portail accessible'], email_expected:'Entretien validé', portal_url:`${BASE_URL}/portal/${PORTAL_TOKEN}` },
  { id:'job_submitted', status:'job_submitted', title:'4. Proposer un job', action:'Onglet Jobs → choisir une offre → "Proposer"', expected:['Statut → Jobs proposés','Job submission créée'] },
  { id:'job_retained', status:'job_retained', title:'5. Job retenu', action:'Cliquer "🎉 Job retenu"', expected:['Statut → Job retenu','📧 Email : "Tu es pris chez [entreprise]"'], email_expected:'Tu es pris' },
  { id:'convention_signed', status:'convention_signed', title:'6. Convention signée', action:'Cliquer "📝 Convention signée"', expected:['Statut → Convention signée','📧 Email Partnership Agreement envoyé à l\'employeur','Onglet Facturation : bouton 📧 Envoyer demande paiement'] },
  { id:'payment_pending', status:'payment_pending', title:'7. Envoyer demande paiement', action:'Onglet Facturation → "📧 Envoyer demande paiement"', expected:['Statut → Paiement en attente','📧 Email paiement avec IBAN + montant 990€'], email_expected:'Paiement de votre stage', portal_url:`${BASE_URL}/portal/${PORTAL_TOKEN}` },
  { id:'payment_received', status:'payment_received', title:'8. Confirmer paiement', action:'Onglet Facturation → BillingForm → cocher "✅ Paiement reçu"', expected:['Statut → Payé','Billing entry revenue 990€ créée en DB','Finance : CA +990€','Portail : section 🏠 Logement + Partenaires visible'], portal_url:`${BASE_URL}/portal/${PORTAL_TOKEN}` },
  { id:'visa_docs', status:'payment_received', title:'9. Demander docs visa', action:'Cliquer "📋 Demander docs visa"', expected:['📧 Email : "Documents visa requis" sur sidney.ruby@gmail.com'], email_expected:'Documents visa requis', portal_url:`${BASE_URL}/portal/${PORTAL_TOKEN}/visa` },
  { id:'visa_in_progress', status:'visa_in_progress', title:'10. Envoyer à l\'agent visa', action:'Onglet Visa → remplir les infos → "Envoyer le dossier à l\'agent visa"', expected:['Statut → Visa en cours','📧 Email envoyé à BIBI CONSULTANT','visa_agent_portal_access créé','Boutons : ✅ Visa reçu + ❌ Refusé'] },
  { id:'visa_received', status:'visa_received', title:'11. Visa reçu', action:'Cliquer "✅ Visa reçu"', expected:['Statut → Visa reçu','Admin notif créée'] },
  { id:'arrival_prep', status:'arrival_prep', title:'12. Préparer l\'arrivée', action:'Cliquer "🛫 Préparer départ"', expected:['Statut → Prép. arrivée'] },
  { id:'active', status:'active', title:'13. Stage démarré → Welcome kit', action:'Cliquer "🌴 Stage démarré"', expected:['Statut → En stage','📧 Welcome kit envoyé','Portail : carte stagiaire visible'], email_expected:'Welcome Kit', portal_url:`${BASE_URL}/portal/${PORTAL_TOKEN}/carte` },
  { id:'alumni', status:'alumni', title:'14. Stage terminé → Alumni', action:'Cliquer "🎓 Stage terminé"', expected:['Statut → Alumni','Visible dans /fr/alumni'] },
]

const LS_KEY = 'qa_mode'
const LS_STEP_KEY = 'qa_step'
const LS_STATUS_KEY = 'qa_statuses'

export function QAWidget() {
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(true)
  const [stepIdx, setStepIdx] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({})
  const [checking, setChecking] = useState(false)
  const [dbResult, setDbResult] = useState<null | { ok: boolean; text: string; details?: Record<string, unknown> }>(null)
  const [notes, setNotes] = useState('')

  // Activer via ?qa=1 et persister en localStorage
  useEffect(() => {
    if (searchParams.get('qa') === '1') {
      localStorage.setItem(LS_KEY, '1')
    }
    const stored = localStorage.getItem(LS_KEY)
    if (stored === '1') setActive(true)
    const storedStep = localStorage.getItem(LS_STEP_KEY)
    if (storedStep) setStepIdx(parseInt(storedStep))
    const storedStatuses = localStorage.getItem(LS_STATUS_KEY)
    if (storedStatuses) { try { setStatuses(JSON.parse(storedStatuses) as Record<string, StepStatus>) } catch { /* ignore */ } }
  }, [searchParams])

  function setStep(i: number) {
    setStepIdx(i)
    setDbResult(null)
    setNotes('')
    localStorage.setItem(LS_STEP_KEY, String(i))
  }

  function markStatus(s: StepStatus) {
    const next = { ...statuses, [STEPS[stepIdx].id]: s }
    setStatuses(next)
    localStorage.setItem(LS_STATUS_KEY, JSON.stringify(next))
    if (s === 'pass' && stepIdx < STEPS.length - 1) setStep(stepIdx + 1)
  }

  function quit() {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_STEP_KEY)
    localStorage.removeItem(LS_STATUS_KEY)
    setActive(false)
  }

  async function checkDB() {
    setChecking(true)
    setDbResult(null)
    try {
      const step = STEPS[stepIdx]
      const r = await fetch(`/api/qa/check?case_id=${CASE_ID}&expected_status=${step.status}`)
      const d = await r.json() as { status: string; match: boolean; details: Record<string, unknown> }
      setDbResult({
        ok: d.match,
        text: d.match ? `✅ Statut DB : "${d.status}"` : `❌ DB: "${d.status}" ≠ attendu "${step.status}"`,
        details: d.details,
      })
    } catch { setDbResult({ ok: false, text: '⚠️ Erreur connexion DB' }) }
    setChecking(false)
  }

  if (!active) return null

  const step = STEPS[stepIdx]
  const passed = Object.values(statuses).filter(s => s === 'pass').length
  const failed = Object.values(statuses).filter(s => s === 'fail').length

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-[9999] bg-[#1a1918] text-[#c8a96e] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-[#c8a96e]/30 flex items-center gap-2">
      🧪 QA {passed}/{STEPS.length}
      {failed > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{failed}</span>}
    </button>
  )

  return (
    <div className="fixed top-0 right-0 z-[9999] w-[380px] h-screen bg-[#111110] border-l border-zinc-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1918] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#c8a96e]">🧪 QA Mode</span>
          <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{passed}/{STEPS.length} ✅</span>
          {failed > 0 && <span className="text-[11px] bg-red-900/60 text-red-400 px-2 py-0.5 rounded-full">{failed} bug{failed>1?'s':''}</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-sm px-1">—</button>
          <button onClick={quit} className="text-zinc-500 hover:text-red-400 text-sm px-1" title="Quitter QA mode">✕</button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-zinc-800 shrink-0">
        <div className="h-full bg-[#c8a96e] transition-all duration-300" style={{ width: `${(passed/STEPS.length)*100}%` }} />
      </div>

      {/* Steps mini-nav */}
      <div className="flex overflow-x-auto gap-1 px-3 py-2.5 border-b border-zinc-800 shrink-0">
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`flex-shrink-0 w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
              statuses[s.id] === 'pass' ? 'bg-green-800 text-green-300' :
              statuses[s.id] === 'fail' ? 'bg-red-900 text-red-300' :
              i === stepIdx ? 'bg-[#c8a96e] text-black' :
              'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}>{i+1}</button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Étape {stepIdx+1}/{STEPS.length}</p>
          <h2 className="text-sm font-bold text-white leading-snug">{step.title}</h2>
        </div>

        {/* Action */}
        <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/20 rounded-xl p-3">
          <p className="text-[10px] font-bold text-[#c8a96e] uppercase tracking-wider mb-1.5">👆 Fais ça</p>
          <p className="text-xs text-white leading-relaxed">{step.action}</p>
          <a href={`/fr/cases/${CASE_ID}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[#c8a96e]/70 hover:text-[#c8a96e] mt-2 block">
            → Ouvrir le dossier test ↗
          </a>
        </div>

        {/* Expected */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">✅ Ce qui doit se passer</p>
          <div className="space-y-1">
            {step.expected.map((e, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-zinc-300 leading-relaxed">
                <span className="text-zinc-600 mt-0.5 shrink-0">·</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email */}
        {step.email_expected && (
          <div className="bg-blue-950/60 border border-blue-800/40 rounded-xl p-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">📧 Email attendu</p>
            <p className="text-[11px] text-blue-300">Objet contient : <strong>"{step.email_expected}"</strong></p>
            <p className="text-[10px] text-blue-500 mt-0.5">Vérifie : sidney.ruby@gmail.com</p>
          </div>
        )}

        {/* Portal */}
        {step.portal_url && (
          <a href={step.portal_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-purple-950/50 border border-purple-800/40 rounded-xl p-3 hover:bg-purple-950/80 transition-colors">
            <span className="text-sm">🌐</span>
            <div>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Portail à vérifier</p>
              <p className="text-[11px] text-purple-300 truncate">{step.portal_url.replace('https://sunny-interns-os.vercel.app','')}</p>
            </div>
            <span className="text-purple-400 ml-auto">↗</span>
          </a>
        )}

        {/* DB Check */}
        <button onClick={checkDB} disabled={checking}
          className="w-full py-2 text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
          {checking
            ? <><div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"/>Vérification DB…</>
            : '🔍 Vérifier l\'état en DB'}
        </button>

        {dbResult && (
          <div className={`rounded-xl p-3 text-[11px] ${dbResult.ok ? 'bg-green-950/60 border border-green-800/40 text-green-300' : 'bg-red-950/60 border border-red-800/40 text-red-300'}`}>
            <p className="font-semibold mb-1">{dbResult.text}</p>
            {dbResult.details && (
              <div className="space-y-0.5 text-[10px] opacity-80">
                {Object.entries(dbResult.details).map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-400">{k}</span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes / bug observé…"
          rows={2}
          className="w-full px-3 py-2 text-[11px] bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2 shrink-0">
        <div className="flex gap-2">
          <button onClick={() => markStatus('fail')}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 transition-colors">
            ❌ Bug
          </button>
          <button onClick={() => markStatus('pass')}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-green-900/30 text-green-400 border border-green-800/40 hover:bg-green-900/50 transition-colors">
            ✅ OK → Suivant
          </button>
        </div>
        <div className="flex gap-2">
          {stepIdx > 0 && (
            <button onClick={() => setStep(stepIdx-1)}
              className="flex-1 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl transition-colors">
              ← Précédent
            </button>
          )}
          <a href={`/fr/cases?qa=1`}
            className="flex-1 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl transition-colors text-center">
            → Cas test ↗
          </a>
        </div>
      </div>
    </div>
  )
}
