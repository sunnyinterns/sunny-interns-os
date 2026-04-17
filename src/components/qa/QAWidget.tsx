'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

type StepStatus = 'pending' | 'pass' | 'fail'
type BugStatus = 'idle' | 'submitting' | 'open' | 'fixing' | 'fixed'

const CASE_ID = '8ebc87da-3de7-4f8c-82fe-fdf60995a6d4'
const PORTAL_TOKEN = '9776c61e-152e-48fd-bc8b-f6faa13d8ed7'
const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://sunny-interns-os.vercel.app'

const STEPS = [
  { id:'rdv_booked', status:'rdv_booked', title:'1. Voir le dossier dans Candidats', action:'Va sur /fr/cases → cliquer "Test Stagiaire" → vérifier statut "RDV booké" + boutons dispo', expected:['Dossier visible dans Candidats','Statut "RDV booké" affiché','Boutons : ✅ Qualif faite + ❌ Pas intéressé'] },
  { id:'qualification_done', status:'qualification_done', title:'2. Qualification → Email portail', action:'Cliquer "✅ Qualif faite"', expected:['Statut → Qualification faite','📧 Email reçu : "Entretien validé" sur sidney.ruby@gmail.com','Portail accessible'], email:'Entretien validé', portal:`${BASE}/portal/${PORTAL_TOKEN}` },
  { id:'job_submitted', status:'job_submitted', title:'3. Proposer un job', action:'Onglet Jobs → choisir une offre → soumettre', expected:['Statut → Jobs proposés','Job submission créée'] },
  { id:'job_retained', status:'job_retained', title:'4. Job retenu', action:'Cliquer "🎉 Job retenu"', expected:['Statut → Job retenu','📧 Email : "Tu es pris chez..."'], email:'Tu es pris' },
  { id:'convention_signed', status:'convention_signed', title:'5. Convention signée', action:'Cliquer "📝 Convention signée"', expected:['Statut → Convention signée','📧 Email Partnership Agreement envoyé à l\'employeur','Bouton 📧 Demande paiement dans Facturation'] },
  { id:'payment_pending', status:'payment_pending', title:'6. Demande paiement', action:'Onglet Facturation → "📧 Envoyer demande paiement"', expected:['Statut → Paiement en attente','📧 Email paiement avec IBAN + 990€'], email:'Paiement de votre stage', portal:`${BASE}/portal/${PORTAL_TOKEN}` },
  { id:'payment_received', status:'payment_received', title:'7. Confirmer paiement', action:'Onglet Facturation → BillingForm → cocher "✅ Paiement reçu"', expected:['Statut → Payé','Billing entry +990€ créée','Finance → CA +990€','Portail : section Logement débloquée'], portal:`${BASE}/portal/${PORTAL_TOKEN}` },
  { id:'visa_docs', status:'payment_received', title:'8. Demander docs visa', action:'Cliquer "📋 Demander docs visa"', expected:['📧 Email "Documents visa requis" reçu','Portail /visa accessible'], email:'Documents visa requis', portal:`${BASE}/portal/${PORTAL_TOKEN}/visa` },
  { id:'visa_in_progress', status:'visa_in_progress', title:'9. Envoyer à l\'agent', action:'Onglet Visa → "Envoyer le dossier à l\'agent visa"', expected:['Statut → Visa en cours','📧 Email envoyé à BIBI CONSULTANT','Boutons : ✅ Visa reçu + ❌ Refusé'] },
  { id:'visa_received', status:'visa_received', title:'10. Visa reçu', action:'Cliquer "✅ Visa reçu"', expected:['Statut → Visa reçu','Admin notif créée'] },
  { id:'arrival_prep', status:'arrival_prep', title:'11. Prép. arrivée', action:'Cliquer "🛫 Préparer départ"', expected:['Statut → Prép. arrivée'] },
  { id:'active', status:'active', title:'12. Stage démarré', action:'Cliquer "🌴 Stage démarré"', expected:['Statut → En stage','📧 Welcome kit envoyé','Portail : carte stagiaire visible'], email:'Welcome Kit', portal:`${BASE}/portal/${PORTAL_TOKEN}/carte` },
  { id:'alumni', status:'alumni', title:'13. Alumni', action:'Cliquer "🎓 Stage terminé"', expected:['Statut → Alumni','Visible dans /fr/alumni'] },
] as const

const LS_ACTIVE = 'qa_active'
const LS_STEP = 'qa_step'
const LS_STATUSES = 'qa_statuses'
const LS_BUGID = 'qa_bug_id'

export function QAWidget() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(true)
  const [stepIdx, setStepIdx] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({})
  const [notes, setNotes] = useState('')
  const [checking, setChecking] = useState(false)
  const [dbResult, setDbResult] = useState<null | { ok: boolean; text: string; details?: Record<string, unknown> }>(null)
  const [bugStatus, setBugStatus] = useState<BugStatus>('idle')
  const [bugId, setBugId] = useState<string | null>(null)
  const [fixDescription, setFixDescription] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
    if (searchParams.get('qa') === '1') localStorage.setItem(LS_ACTIVE, '1')
    if (localStorage.getItem(LS_ACTIVE) === '1') setActive(true)
    const s = localStorage.getItem(LS_STEP); if (s) setStepIdx(parseInt(s))
    const st = localStorage.getItem(LS_STATUSES); if (st) { try { setStatuses(JSON.parse(st) as Record<string, StepStatus>) } catch { /* ignore */ } }
    const bid = localStorage.getItem(LS_BUGID); if (bid) { setBugId(bid); setBugStatus('open') }
  }, [searchParams])

  // Poll pour vérifier si le fix est déployé
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/qa/status?bug_id=${id}`)
        const d = await r.json() as { status: string; fix_description: string }
        if (d.status === 'fixing') setBugStatus('fixing')
        if (d.status === 'fixed') {
          setBugStatus('fixed')
          setFixDescription(d.fix_description)
          if (pollRef.current) clearInterval(pollRef.current)
          localStorage.removeItem(LS_BUGID)
        }
      } catch { /* ignore */ }
    }, 4000)
  }, [])

  useEffect(() => {
    if (bugId && (bugStatus === 'open' || bugStatus === 'fixing')) startPolling(bugId)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [bugId, bugStatus, startPolling])

  function goToStep(i: number) {
    setStepIdx(i); setDbResult(null); setNotes('')
    setBugStatus('idle'); setFixDescription(null)
    localStorage.setItem(LS_STEP, String(i))
  }

  function saveStatus(s: StepStatus) {
    const next = { ...statuses, [STEPS[stepIdx].id]: s }
    setStatuses(next)
    localStorage.setItem(LS_STATUSES, JSON.stringify(next))
  }

  async function submitBug() {
    if (!notes.trim()) { alert('Décris le bug avant d\'envoyer'); return }
    setBugStatus('submitting')
    // First check DB state for context
    let dbState: Record<string, unknown> = {}
    try {
      const r = await fetch(`/api/qa/check?case_id=${CASE_ID}&expected_status=${STEPS[stepIdx].status}`)
      dbState = await r.json() as Record<string, unknown>
    } catch { /* ignore */ }

    const r = await fetch('/api/qa/bug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_id: STEPS[stepIdx].id,
        step_title: STEPS[stepIdx].title,
        notes,
        expected: STEPS[stepIdx].expected,
        db_state: dbState,
      }),
    })
    if (r.ok) {
      const d = await r.json() as { id: string }
      setBugId(d.id)
      setBugStatus('open')
      saveStatus('fail')
      localStorage.setItem(LS_BUGID, d.id)
    } else {
      setBugStatus('idle')
    }
  }

  function resumeAfterFix() {
    setBugStatus('idle')
    setFixDescription(null)
    setNotes('')
    setBugId(null)
    localStorage.removeItem(LS_BUGID)
    // Re-check DB
    setDbResult(null)
  }

  async function checkDB() {
    setChecking(true); setDbResult(null)
    try {
      const r = await fetch(`/api/qa/check?case_id=${CASE_ID}&expected_status=${STEPS[stepIdx].status}`)
      const d = await r.json() as { status: string; match: boolean; details: Record<string, unknown> }
      setDbResult({ ok: d.match, text: d.match ? `✅ DB: statut "${d.status}"` : `❌ DB: "${d.status}" ≠ attendu "${STEPS[stepIdx].status}"`, details: d.details })
    } catch { setDbResult({ ok: false, text: '⚠️ Erreur DB' }) }
    setChecking(false)
  }

  function quit() {
    localStorage.removeItem(LS_ACTIVE); localStorage.removeItem(LS_STEP)
    localStorage.removeItem(LS_STATUSES); localStorage.removeItem(LS_BUGID)
    setActive(false)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  if (!mounted || !active) return null

  const step = STEPS[stepIdx]
  const passed = Object.values(statuses).filter(s => s === 'pass').length
  const failed = Object.values(statuses).filter(s => s === 'fail').length
  const isPaused = bugStatus === 'open' || bugStatus === 'fixing'

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className={`fixed bottom-4 right-4 z-[9999] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 ${isPaused ? 'bg-amber-900 text-amber-300 border border-amber-700 animate-pulse' : 'bg-[#1a1918] text-[#c8a96e] border border-[#c8a96e]/30'}`}>
      {isPaused ? '🔧 Fix en cours...' : `🧪 QA ${passed}/${STEPS.length}`}
      {failed > 0 && !isPaused && <span className="bg-red-500 text-white rounded-full px-1.5 text-[10px]">{failed}</span>}
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
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 px-1">—</button>
          <button onClick={quit} className="text-zinc-500 hover:text-red-400 px-1" title="Quitter">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800 shrink-0">
        <div className="h-full bg-[#c8a96e] transition-all" style={{ width: `${(passed/STEPS.length)*100}%` }} />
      </div>

      {/* Steps nav */}
      <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-zinc-800 shrink-0">
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => goToStep(i)}
            className={`shrink-0 w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
              statuses[s.id] === 'pass' ? 'bg-green-800 text-green-300' :
              statuses[s.id] === 'fail' ? 'bg-red-900 text-red-300' :
              i === stepIdx ? 'bg-[#c8a96e] text-black' :
              'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}>{i+1}</button>
        ))}
      </div>

      {/* ── MODE NORMAL ── */}
      {!isPaused && bugStatus !== 'fixed' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Étape {stepIdx+1}/{STEPS.length}</p>
            <h2 className="text-sm font-bold text-white">{step.title}</h2>
          </div>

          {/* Action */}
          <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/20 rounded-xl p-3">
            <p className="text-[10px] font-bold text-[#c8a96e] uppercase tracking-wider mb-1.5">👆 Fais ça</p>
            <p className="text-xs text-white leading-relaxed">{step.action}</p>
            <a href={`/fr/cases/${CASE_ID}`} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-[#c8a96e]/60 hover:text-[#c8a96e]">
              → Ouvrir le dossier test ↗
            </a>
          </div>

          {/* Expected */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">✅ Ce qui doit se passer</p>
            <div className="space-y-1">
              {step.expected.map((e, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-600 mt-0.5 shrink-0">·</span><span>{e}</span>
                </div>
              ))}
            </div>
          </div>

          {'email' in step && step.email && (
            <div className="bg-blue-950/60 border border-blue-800/40 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">📧 Email attendu</p>
              <p className="text-[11px] text-blue-300">Objet contient : <strong>"{step.email}"</strong></p>
              <p className="text-[10px] text-blue-500 mt-0.5">→ sidney.ruby@gmail.com</p>
            </div>
          )}

          {'portal' in step && step.portal && (
            <a href={step.portal} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-purple-950/40 border border-purple-800/30 rounded-xl p-3 hover:bg-purple-950/70 transition-colors">
              <span>🌐</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-purple-400 uppercase">Portail à vérifier</p>
                <p className="text-[10px] text-purple-300 truncate">{(step.portal as string).replace('https://sunny-interns-os.vercel.app','')}</p>
              </div>
              <span className="text-purple-400 shrink-0">↗</span>
            </a>
          )}

          {/* DB check */}
          <button onClick={checkDB} disabled={checking}
            className="w-full py-2 text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
            {checking ? <><div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"/>Vérification…</> : '🔍 Vérifier DB'}
          </button>

          {dbResult && (
            <div className={`rounded-xl p-3 text-[11px] ${dbResult.ok ? 'bg-green-950/60 border border-green-800/40 text-green-300' : 'bg-red-950/60 border border-red-800/40 text-red-300'}`}>
              <p className="font-semibold mb-1">{dbResult.text}</p>
              {dbResult.details && (
                <div className="space-y-0.5 opacity-70">
                  {Object.entries(dbResult.details).slice(0,8).map(([k,v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-zinc-500">{k}</span>
                      <span className="font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1.5">Notes / description du bug :</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Décris ce qui s'est passé, l'écran, le message d'erreur…"
              rows={3}
              className="w-full px-3 py-2 text-[11px] bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
          </div>
        </div>
      )}

      {/* ── MODE BUG EN COURS ── */}
      {isPaused && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-900/40 border border-amber-700/50 flex items-center justify-center text-2xl">
            {bugStatus === 'fixing' ? '🔧' : '✅'}
          </div>
          <div>
            <p className="text-sm font-bold text-amber-300">
              {bugStatus === 'fixing' ? 'Fix en cours…' : 'Bug enregistré !'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              {bugStatus === 'fixing'
                ? 'Je suis en train de corriger. Le widget se mettra à jour automatiquement dès le déploiement.'
                : 'Bug sauvegardé en base.'}
            </p>
          </div>

          {/* Call to action clair */}
          {bugStatus === 'open' && (
            <div className="w-full bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-[#c8a96e]">👆 Ce que tu fais maintenant :</p>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Reviens dans le <strong className="text-white">chat Claude</strong> et écris simplement :
              </p>
              <div className="bg-zinc-900 rounded-lg px-3 py-2 font-mono text-xs text-[#c8a96e]">
                bug
              </div>
              <p className="text-[10px] text-zinc-500">
                Je lirai le contexte complet depuis la DB et je corrigerai en direct.
                Le widget se mettra à jour automatiquement.
              </p>
            </div>
          )}

          {bugStatus === 'fixing' && (
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODE FIX DÉPLOYÉ ── */}
      {bugStatus === 'fixed' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-900/40 border border-green-700/50 flex items-center justify-center text-2xl">✅</div>
          <div>
            <p className="text-sm font-bold text-green-300">Fix déployé !</p>
            {fixDescription && (
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-left">
                {fixDescription}
              </p>
            )}
          </div>
          <button onClick={resumeAfterFix}
            className="w-full py-3 text-sm font-bold bg-green-800/40 text-green-300 border border-green-700/50 rounded-xl hover:bg-green-800/60 transition-colors">
            ▶️ Reprendre le test
          </button>
        </div>
      )}

      {/* Actions bas */}
      {!isPaused && bugStatus !== 'fixed' && (
        <div className="px-4 py-3 border-t border-zinc-800 space-y-2 shrink-0">
          <div className="flex gap-2">
            <button onClick={() => { void submitBug() }} disabled={bugStatus === 'submitting' || !notes.trim()}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-900/30 text-red-400 border border-red-800/40 hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {bugStatus === 'submitting' ? '⏳ Envoi…' : '❌ Bug — m\'envoyer'}
            </button>
            <button onClick={() => { saveStatus('pass'); if (stepIdx < STEPS.length - 1) goToStep(stepIdx + 1) }}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-green-900/30 text-green-400 border border-green-800/40 hover:bg-green-900/50 transition-colors">
              ✅ OK → Suivant
            </button>
          </div>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button onClick={() => goToStep(stepIdx-1)}
                className="flex-1 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl">
                ← Précédent
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
