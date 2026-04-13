'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

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

const ADMIN_SECTIONS = [
  { href: 'packages',    icon: '📦', label: 'Packages',        desc: 'Packages visa Standard / Express / Visa Only' },
  { href: 'visa-types',  icon: '🛂', label: 'Types de visa',   desc: 'VOA, KITAS, types de visas Indonésie' },
  { href: 'visa-agents', icon: '🏢', label: 'Agents visa',     desc: 'Agents FAZZA et partenaires visa' },
  { href: 'schools',     icon: '🎓', label: 'Écoles',          desc: 'Universités et écoles partenaires' },
  { href: 'partners',    icon: '🤝', label: 'Partenaires',     desc: 'Partenaires logement, scooter, eSIM...' },
  { href: 'housing',     icon: '🏠', label: 'Logements',       desc: 'Options logement à Bali' },
  { href: 'finances',    icon: '💶', label: 'Finances',        desc: 'Suivi facturation et paiements' },
  { href: 'users',       icon: '👤', label: 'Utilisateurs',    desc: 'Gestion des accès et rôles' },
  { href: 'notifications', icon: '🔔', label: 'Notifications', desc: 'Configuration emails et alertes' },
  { href: 'templates',   icon: '📄', label: 'Templates',       desc: 'Modèles emails et documents' },
  { href: 'job-departments', icon: '💼', label: 'Métiers & Départements', desc: "Gérer les secteurs d'activité et métiers disponibles" },
]

export default function SettingsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">⚙️ Paramètres</h1>
        <p className="text-sm text-zinc-500 mt-1">Configuration de la plateforme Bali Interns OS</p>
      </div>

      {/* ── SECTION: Config générale ── */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Configuration générale</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />
          ) : settings.map(s => (
            <div key={s.key} className="bg-white border border-zinc-100 rounded-2xl p-4">
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
                  {saved === s.key ? '✓' : saving === s.key ? '...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ))}

          {/* Test WA */}
          {editValues.whatsapp_bali_interns && (
            <a
              href={`https://wa.me/${editValues.whatsapp_bali_interns.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25d366] text-white rounded-xl text-sm font-semibold hover:bg-[#1eb85a]"
            >
              💬 Tester WhatsApp → {editValues.whatsapp_bali_interns}
            </a>
          )}
        </div>
      </div>

      {/* ── SECTION: Admin sections ── */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Administration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADMIN_SECTIONS.map(s => (
            <Link
              key={s.href}
              href={`/${locale}/settings/${s.href}`}
              className="flex items-center gap-3 bg-white border border-zinc-100 rounded-2xl p-4 hover:border-[#c8a96e] hover:shadow-sm transition-all group"
            >
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1918] group-hover:text-[#c8a96e] transition-colors">{s.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{s.desc}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-300 group-hover:text-[#c8a96e] flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
