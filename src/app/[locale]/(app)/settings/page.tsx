'use client'

import { useEffect, useState, useCallback } from 'react'

interface Setting {
  key: string
  value: string
  label: string | null
}

const SETTING_LABELS: Record<string, string> = {
  whatsapp_bali_interns: '💬 Numéro WhatsApp Bali Interns',
  email_confirmation_from: '📧 Email expéditeur automatique',
  fillout_form_id: '📅 ID Formulaire Fillout (RDV)',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json() as Setting[]
      setSettings(data)
      const vals: Record<string, string> = {}
      for (const s of data) vals[s.key] = s.value
      setEditValues(vals)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetchSettings() }, [fetchSettings])

  async function saveSetting(key: string) {
    setSaving(key)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValues[key] }),
    })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div className="p-8 text-zinc-400">Chargement...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#1a1918] mb-2">⚙️ Paramètres</h1>
      <p className="text-sm text-zinc-500 mb-8">Configuration générale de la plateforme Bali Interns OS</p>

      <div className="space-y-4">
        {settings.map(s => (
          <div key={s.key} className="bg-white border border-zinc-100 rounded-2xl p-5">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {SETTING_LABELS[s.key] ?? s.label ?? s.key}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editValues[s.key] ?? ''}
                onChange={e => setEditValues(v => ({ ...v, [s.key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && void saveSetting(s.key)}
                className="flex-1 text-sm border border-zinc-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#c8a96e] font-mono"
                placeholder={s.key}
              />
              <button
                onClick={() => void saveSetting(s.key)}
                disabled={saving === s.key || editValues[s.key] === s.value}
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  saved === s.key
                    ? 'bg-emerald-500 text-white'
                    : saving === s.key
                    ? 'bg-zinc-100 text-zinc-400'
                    : editValues[s.key] !== s.value
                    ? 'bg-[#c8a96e] text-white hover:bg-[#b8945a]'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {saved === s.key ? '✓ Sauvegardé' : saving === s.key ? '...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section WhatsApp Preview */}
      {editValues.whatsapp_bali_interns && (
        <div className="mt-6 bg-[#25d366]/10 border border-[#25d366]/30 rounded-2xl p-5">
          <p className="text-xs font-bold text-[#128c5e] uppercase tracking-wider mb-3">Test WhatsApp</p>
          <a
            href={`https://wa.me/${editValues.whatsapp_bali_interns.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25d366] text-white rounded-xl text-sm font-semibold hover:bg-[#1eb85a] transition-colors"
          >
            💬 Ouvrir WhatsApp → {editValues.whatsapp_bali_interns}
          </a>
        </div>
      )}
    </div>
  )
}
