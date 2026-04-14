'use client'
import { useState } from 'react'

interface EditInternModalProps {
  caseId: string
  internId: string
  initialData: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    whatsapp?: string | null
    school_name?: string | null
    desired_start_date?: string | null
    desired_duration_months?: number | null
  }
  onClose: () => void
  onSuccess: () => void
}

export function EditInternModal({ caseId, internId, initialData, onClose, onSuccess }: EditInternModalProps) {
  const [form, setForm] = useState({
    first_name: initialData.first_name ?? '',
    last_name: initialData.last_name ?? '',
    email: initialData.email ?? '',
    whatsapp: initialData.whatsapp ?? '',
    school_name: initialData.school_name ?? '',
    desired_start_date: initialData.desired_start_date?.slice(0, 10) ?? '',
    desired_duration_months: initialData.desired_duration_months?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/cases/${caseId}/intern`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          email: form.email || undefined,
          whatsapp: form.whatsapp || undefined,
          school_name: form.school_name || undefined,
          desired_start_date: form.desired_start_date || undefined,
          desired_duration_months: form.desired_duration_months ? parseInt(form.desired_duration_months) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="text-xs font-medium text-zinc-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a1918]">Modifier le candidat</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field('Prénom', 'first_name')}
          {field('Nom', 'last_name')}
        </div>
        {field('Email', 'email', 'email')}
        {field('WhatsApp', 'whatsapp')}
        {field('École', 'school_name')}
        <div className="grid grid-cols-2 gap-3">
          {field('Date de début souhaitée', 'desired_start_date', 'date')}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Durée (mois)</label>
            <select
              value={form.desired_duration_months}
              onChange={e => setForm(f => ({ ...f, desired_duration_months: e.target.value }))}
              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]"
            >
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{m} mois</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-xl">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-sm font-bold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
