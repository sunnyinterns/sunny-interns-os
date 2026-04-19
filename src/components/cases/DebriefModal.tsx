'use client'
import { useState } from 'react'

interface Props {
  caseId: string
  internName?: string
  onClose: () => void
  onSaved: (newStatus: string, recontactMonth?: string) => void
}

const OUTCOMES = [
  { value: 'qualification_done', label: '✅ Qualifié — passer au staffing', color: '#16a34a', desc: 'Le candidat est qualifié, on passe à la recherche de job.' },
  { value: 'to_recontact', label: '📅 À recontacter — pas encore prêt', color: '#c8a96e', desc: 'Candidat intéressant mais pas disponible maintenant. Choisir un mois de relance.' },
  { value: 'not_qualified', label: '❌ Non qualifié — pas le bon profil', color: '#dc2626', desc: 'Le candidat ne correspond pas au profil recherché.' },
  { value: 'not_interested', label: '🚫 Désintéressé — ne souhaite plus postuler', color: '#6b7280', desc: 'Le candidat s\'est désisté.' },
]

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + i + 1)
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  }
})

export function DebriefModal({ caseId, internName, onClose, onSaved }: Props) {
  const [outcome, setOutcome] = useState<string>('')
  const [recontactMonth, setRecontactMonth] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!outcome) { setError('Choisis une issue d\'entretien'); return }
    if (outcome === 'to_recontact' && !recontactMonth) { setError('Choisis un mois de relance'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/cases/${caseId}/debrief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, recontact_month: recontactMonth || null, notes }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      onSaved(outcome, recontactMonth || undefined)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1a1918]">Débrief entretien</h2>
            {internName && <p className="text-xs text-zinc-400">{internName}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Issue de l'entretien */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Issue de l'entretien
            </label>
            <div className="space-y-2">
              {OUTCOMES.map(o => (
                <button key={o.value} onClick={() => { setOutcome(o.value); setError(null) }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    outcome === o.value
                      ? 'border-[#c8a96e] bg-[#c8a96e]/5'
                      : 'border-zinc-100 hover:border-zinc-200 bg-white'
                  }`}>
                  <p className="text-sm font-semibold text-[#1a1918]">{o.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mois de relance — visible seulement si to_recontact */}
          {outcome === 'to_recontact' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-700">
                📅 Mois de relance *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map(m => (
                  <button key={m.value} onClick={() => setRecontactMonth(m.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      recontactMonth === m.value
                        ? 'bg-[#c8a96e] text-white border-[#c8a96e]'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-[#c8a96e]'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                Une alerte To-Do sera créée au début de ce mois pour relancer le candidat.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Notes de l'entretien (facultatif)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Points forts, faiblesses, contexte, raison du recontact…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-600">Annuler</button>
          <button onClick={() => void handleSave()} disabled={saving || !outcome}
            className="px-5 py-2 text-sm font-bold bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800 disabled:opacity-40 transition-colors">
            {saving ? 'Enregistrement…' : 'Enregistrer le débrief →'}
          </button>
        </div>
      </div>
    </div>
  )
}
