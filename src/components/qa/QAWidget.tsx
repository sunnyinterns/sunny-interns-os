'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

type StepStatus = 'pending' | 'pass' | 'fail' | 'checking'

interface TestStep {
  id: string
  status: string
  from: string
  title: string
  action: string
  expected: string[]
  email_expected?: string
  portal_check?: string
}

const CASE_ID = '8ebc87da-3de7-4f8c-82fe-fdf60995a6d4'
const PORTAL_TOKEN = '9776c61e-152e-48fd-bc8b-f6faa13d8ed7'

const WORKFLOW: TestStep[] = [
  { id:'lead', from:'start', status:'lead', title:'1. Dossier Lead', action:'Ouvre le dossier Test Stagiaire dans /fr/cases — vérifie le statut et les boutons disponibles', expected:['Statut "Lead" affiché','Boutons : 📅 Booker RDV + ❌ Pas intéressé','Aucun email attendu'] },
  { id:'rdv_booked', from:'lead', status:'rdv_booked', title:'2. Booker RDV', action:'Cliquer "📅 Booker RDV" dans le panneau d\'actions du dossier', expected:['Statut → "RDV booké"','Case log créé','Bouton : ✅ Qualif faite'] },
  { id:'qualification_done', from:'rdv_booked', status:'qualification_done', title:'3. Qualification → Email portail', action:'Cliquer "✅ Qualif faite"', expected:['Statut → "Qualification faite"','📧 Email reçu : "Entretien validé — Accès à ton espace"','Portail accessible : /portal/'+PORTAL_TOKEN], email_expected:'Entretien validé', portal_check:'/portal/'+PORTAL_TOKEN },
  { id:'job_submitted', from:'qualification_done', status:'job_submitted', title:'4. Proposer un job', action:'Cliquer "📋 Proposer un job" → onglet Jobs → choisir une offre et la soumettre', expected:['Statut → "Jobs proposés"','Job submission créée','Offre visible dans le portail intern /jobs'] },
  { id:'job_retained', from:'job_submitted', status:'job_retained', title:'5. Job retenu → Email intern', action:'Cliquer "🎉 Job retenu"', expected:['Statut → "Job retenu"','📧 Email : "Tu es pris chez [entreprise]"','Section "Ton stage" dans le portail'], email_expected:'Tu es pris' },
  { id:'convention_signed', from:'job_retained', status:'convention_signed', title:'6. Convention signée → Email employer', action:'Cliquer "📝 Convention signée"', expected:['Statut → "Convention signée"','📧 Partnership Agreement envoyé à l\'employeur','Admin notif créée','Onglet Facturation : bouton 📧 Envoyer demande paiement'] },
  { id:'payment_pending', from:'convention_signed', status:'payment_pending', title:'7. Demande paiement', action:'Onglet Facturation → cliquer "📧 Envoyer demande paiement"', expected:['Statut → "Paiement en attente"','📧 Email paiement avec IBAN SIDLYS LLC + montant 990€','Portail : section paiement visible'], email_expected:'Paiement de votre stage' },
  { id:'payment_received', from:'payment_pending', status:'payment_received', title:'8. Paiement confirmé → Billing auto', action:'Onglet Facturation → BillingForm → cocher "✅ Paiement reçu"', expected:['Statut → "Payé"','billing_entry revenue +990€ créée en DB','Finance dashboard : CA +990€','Portail : section 🏠 logement + partenaires débloqués','2 boutons : 📋 Demander docs visa + 🚀 Envoyer à l\'agent'], portal_check:'/portal/'+PORTAL_TOKEN },
  { id:'visa_docs', from:'payment_received', status:'payment_received', title:'9. Demande docs visa', action:'Cliquer "📋 Demander docs visa"', expected:['📧 Email : "Documents visa requis" avec lien portail /documents','Portail /visa : sections passeport, photo, relevé, billet accessibles'], email_expected:'Documents visa requis', portal_check:'/portal/'+PORTAL_TOKEN+'/visa' },
  { id:'visa_in_progress', from:'payment_received', status:'visa_in_progress', title:'10. Envoi dossier agent', action:'Onglet Visa → "Envoyer le dossier à l\'agent visa"', expected:['Statut → "Visa en cours"','📧 Email envoyé à BIBI CONSULTANT','visa_agent_portal_access créé en DB','Boutons : ✅ Visa reçu + ❌ Visa refusé'] },
  { id:'visa_received', from:'visa_in_progress', status:'visa_received', title:'11. Visa reçu', action:'Cliquer "✅ Visa reçu"', expected:['Statut → "Visa reçu"','Admin notif créée','Bouton : 🛫 Préparer départ'] },
  { id:'arrival_prep', from:'visa_received', status:'arrival_prep', title:'12. Prép. arrivée', action:'Cliquer "🛫 Préparer départ"', expected:['Statut → "Prép. arrivée"','Bouton : 🌴 Stage démarré'] },
  { id:'active', from:'arrival_prep', status:'active', title:'13. Stage démarré → Welcome kit', action:'Cliquer "🌴 Stage démarré"', expected:['Statut → "En stage"','📧 Welcome kit envoyé','Portail : carte stagiaire visible /carte'], email_expected:'Welcome Kit', portal_check:'/portal/'+PORTAL_TOKEN+'/carte' },
  { id:'alumni', from:'active', status:'alumni', title:'14. Stage terminé → Alumni', action:'Cliquer "🎓 Stage terminé"', expected:['Statut → "Alumni"','Admin notif créée','Visible dans /fr/alumni'] },
]

export function QAWidget() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
  const [checking, setChecking] = useState(false)
  const [dbStatus, setDbStatus] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [bugsFound, setBugsFound] = useState<string[]>([])

  const isQA = searchParams.get('qa') === '1'
  if (!isQA) return null

  const step = WORKFLOW[currentStepIdx]
  const progress = Math.round((currentStepIdx / WORKFLOW.length) * 100)

  async function checkDB() {
    setChecking(true)
    setDbStatus(null)
    try {
      const r = await fetch(`/api/qa/check?case_id=${CASE_ID}&expected_status=${step.status}`)
      const d = await r.json() as { status: string; match: boolean; details: string }
      setDbStatus(d.match
        ? `✅ DB OK — statut: ${d.status}`
        : `❌ DB: statut="${d.status}" (attendu: "${step.status}")`)
    } catch {
      setDbStatus('⚠️ Erreur vérification DB')
    }
    setChecking(false)
  }

  function markStep(result: 'pass' | 'fail') {
    setStepStatuses(p => ({ ...p, [step.id]: result }))
    if (result === 'fail' && notes) {
      setBugsFound(p => [...p, `[${step.title}] ${notes}`])
    }
    if (result === 'pass' && currentStepIdx < WORKFLOW.length - 1) {
      setCurrentStepIdx(i => i + 1)
      setDbStatus(null)
      setNotes('')
    }
  }

  const passed = Object.values(stepStatuses).filter(s => s === 'pass').length
  const failed = Object.values(stepStatuses).filter(s => s === 'fail').length

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-[9999] bg-[#1a1918] text-[#c8a96e] px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl border border-[#c8a96e]/30">
      🧪 QA Mode — {passed}/{WORKFLOW.length}
    </button>
  )

  return (
    <div className="fixed top-0 right-0 z-[9999] w-96 h-screen bg-[#111110] border-l border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#1a1918]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#c8a96e]">🧪 QA Mode</span>
          <span className="text-xs bg-[#c8a96e]/20 text-[#c8a96e] px-2 py-0.5 rounded-full">{passed}/{WORKFLOW.length}</span>
          {failed > 0 && <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">{failed} bug{failed>1?'s':''}</span>}
        </div>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-lg">×</button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800">
        <div className="h-full bg-[#c8a96e] transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Steps nav */}
      <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-zinc-800">
        {WORKFLOW.map((s, i) => (
          <button key={s.id} onClick={() => { setCurrentStepIdx(i); setDbStatus(null) }}
            className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold transition-all ${
              stepStatuses[s.id] === 'pass' ? 'bg-green-900 text-green-400' :
              stepStatuses[s.id] === 'fail' ? 'bg-red-900 text-red-400' :
              i === currentStepIdx ? 'bg-[#c8a96e] text-[#1a1918]' :
              'bg-zinc-800 text-zinc-500'
            }`}>{i+1}</button>
        ))}
      </div>

      {/* Current step */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Étape {currentStepIdx+1}/{WORKFLOW.length}</p>
          <h2 className="text-sm font-bold text-white">{step.title}</h2>
        </div>

        {/* Action */}
        <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-xl p-3">
          <p className="text-[10px] font-bold text-[#c8a96e] uppercase tracking-wider mb-1.5">👆 Action à faire</p>
          <p className="text-sm text-white leading-relaxed">{step.action}</p>
        </div>

        {/* Expected */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">✅ Ce qui doit se passer</p>
          <div className="space-y-1.5">
            {step.expected.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <span className="text-zinc-600 mt-0.5 flex-shrink-0">·</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email expected */}
        {step.email_expected && (
          <div className="bg-blue-950 border border-blue-800/50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">📧 Email attendu</p>
            <p className="text-xs text-blue-300">Objet contient : "{step.email_expected}"</p>
            <p className="text-[10px] text-blue-500 mt-1">→ Vérifie sidney.ruby@gmail.com</p>
          </div>
        )}

        {/* Portal check */}
        {step.portal_check && (
          <div className="bg-purple-950 border border-purple-800/50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">🌐 Portail à vérifier</p>
            <a href={step.portal_check} target="_blank" rel="noopener noreferrer"
              className="text-xs text-purple-300 hover:text-purple-200 underline break-all">
              {window.location.hostname}{step.portal_check}
            </a>
          </div>
        )}

        {/* DB Check */}
        <div>
          <button onClick={checkDB} disabled={checking}
            className="w-full py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {checking ? <><div className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"/>Vérification…</> : '🔍 Vérifier DB'}
          </button>
          {dbStatus && (
            <p className={`text-xs mt-2 px-3 py-2 rounded-lg ${dbStatus.startsWith('✅') ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
              {dbStatus}
            </p>
          )}
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes / bug observé…"
          rows={2}
          className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <button onClick={() => markStep('fail')}
            className="flex-1 py-2.5 text-xs font-bold bg-red-900/40 text-red-400 border border-red-800/50 rounded-xl hover:bg-red-900/60">
            ❌ Bug trouvé
          </button>
          <button onClick={() => markStep('pass')}
            className="flex-1 py-2.5 text-xs font-bold bg-green-900/40 text-green-400 border border-green-800/50 rounded-xl hover:bg-green-900/60">
            ✅ Validé →
          </button>
        </div>
        <div className="flex gap-2">
          {currentStepIdx > 0 && (
            <button onClick={() => { setCurrentStepIdx(i => i-1); setDbStatus(null) }}
              className="flex-1 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl">
              ← Précédent
            </button>
          )}
          {bugsFound.length > 0 && (
            <button onClick={() => {
              const report = `# QA Report — Bali Interns OS\n\n${passed} étapes OK, ${failed} bugs\n\n## Bugs\n${bugsFound.map(b=>`- ${b}`).join('\n')}`
              navigator.clipboard.writeText(report)
              alert('Rapport copié !')
            }} className="flex-1 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl">
              📋 Copier rapport
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
