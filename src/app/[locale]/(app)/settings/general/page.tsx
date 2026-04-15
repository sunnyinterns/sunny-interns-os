'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Setting {
  key: string
  value: string
  label: string | null
}

const SETTING_LABELS: Record<string, string> = {
  whatsapp_bali_interns: 'WhatsApp number (Bali Interns)',
  email_confirmation_from: 'Sender email (automated)',
  fillout_form_id: 'Fillout Form ID (RDV)',
}

export default function GeneralSettingsPage() {
  const router = useRouter()
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          ← Settings
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#1a1918]">General Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">WhatsApp, email sender and Fillout configuration</p>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
        {loading ? (
          <div className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />
        ) : settings.map(s => (
          <div key={s.key}>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {SETTING_LABELS[s.key] ?? s.label ?? s.key}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={editValues[s.key] ?? ''}
                onChange={e => setEditValues(v => ({ ...v, [s.key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && void saveSetting(s.key)}
                className="flex-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] font-mono"
              />
              <button
                onClick={() => void saveSetting(s.key)}
                disabled={saving === s.key || editValues[s.key] === s.value}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  saved === s.key ? 'bg-emerald-500 text-white'
                  : saving === s.key ? 'bg-zinc-100 text-zinc-400'
                  : editValues[s.key] !== s.value ? 'bg-[#c8a96e] text-white hover:bg-[#b8945a]'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {saved === s.key ? '✓' : saving === s.key ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
        {editValues.whatsapp_bali_interns && (
          <a
            href={`https://wa.me/${editValues.whatsapp_bali_interns.replace(/[^0-9]/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#25d366] text-white rounded-xl text-sm font-semibold hover:bg-[#1eb85a]"
          >
            Test WhatsApp → {editValues.whatsapp_bali_interns}
          </a>
        )}
      </div>
    </div>
  )
}
