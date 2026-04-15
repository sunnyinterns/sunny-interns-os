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

type SectionItem = { href: string; icon: string; label: string; desc: string; external?: boolean }

const SECTIONS: Record<string, { title: string; items: SectionItem[] }> = {
  administratif: {
    title: '🗂️ Administratif',
    items: [
      { href: 'job-departments', icon: '💼', label: 'Métiers & Départements', desc: "Secteurs d'activité et métiers disponibles" },
      { href: 'internship-cities', icon: '📍', label: 'Villes de stage', desc: 'Canggu, Seminyak, Ubud...' },
      { href: 'company-types', icon: '🏛️', label: 'Types de sociétés', desc: 'PT, CV, SARL, SAS... infos légales' },
      { href: 'packages', icon: '📦', label: 'Packages', desc: 'Packages Standard, Express, Visa Only' },
      { href: 'visa-types', icon: '🛂', label: 'Types de visa', desc: 'VOA, KITAS, visa touristique' },
      { href: 'visa-agents', icon: '🏢', label: 'Agents', desc: 'FAZZA et autres agents partenaires' },
      { href: 'sponsors', icon: '🏛️', label: 'Sponsors PT', desc: 'PT locales pour parrainer les PT PMA' },
      { href: 'templates', icon: '📄', label: 'Templates', desc: 'Modèles emails et templates de jobs' },
    ],
  },
  documents: {
    title: '📋 Documents & Marque',
    items: [
      { href: 'contact-templates', icon: '📄', label: 'Templates documents', desc: 'Lettre engagement, Agreement Letter, Contrat Sponsor' },
      { href: 'email-templates', icon: '✉️', label: 'Templates emails', desc: 'Emails automatiques organisés par étape' },
      { href: 'media-kit', icon: '🎨', label: 'Media Kit', desc: 'Logos Bali Interns pour portails, factures, emails' },
    ],
  },
  partenaires: {
    title: '🤝 Partenaires',
    items: [
      { href: 'partners', icon: '🌐', label: 'Partenaires officiels', desc: 'eSIM, restaurants, deals avant/après' },
      { href: 'housing', icon: '🏠', label: 'Logements', desc: 'Villas, colocations, résidences à Bali' },
      { href: 'scooters', icon: '🛵', label: 'Scooters', desc: 'Location scooter partenaires' },
      { href: 'transport', icon: '🚗', label: 'Chauffeurs', desc: 'Sociétés de chauffeur + message WA préformaté' },
    ],
  },
  equipe: {
    title: '👥 Équipe & Accès',
    items: [
      { href: 'users', icon: '👤', label: 'Utilisateurs', desc: 'Gestion des accès et rôles équipe' },
    ],
  },
}

function SettingsSection({ title, items, locale }: { title: string; items: SectionItem[]; locale: string }) {
  return (
    <div>
      <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.external ? `/${locale}/${item.href.replace('../', '')}` : `/${locale}/settings/${item.href}`}
            className="bg-white border border-zinc-100 rounded-2xl p-4 hover:border-[#c8a96e] hover:shadow-sm transition-all group flex items-center gap-3"
          >
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1a1918] group-hover:text-[#c8a96e] transition-colors">{item.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [showConfig, setShowConfig] = useState(false)

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

      {/* ── Config générale en accordéon ── */}
      <div className="border border-zinc-100 rounded-2xl overflow-hidden bg-white">
        <button
          onClick={() => setShowConfig(c => !c)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔧</span>
            <div className="text-left">
              <p className="text-sm font-bold text-[#1a1918]">Configuration générale</p>
              <p className="text-xs text-zinc-400">WhatsApp, email, Fillout ID</p>
            </div>
          </div>
          <span className="text-zinc-400 text-sm">{showConfig ? '▲' : '▼'}</span>
        </button>
        {showConfig && (
          <div className="px-5 pb-5 border-t border-zinc-100 pt-4 space-y-3">
            {loading ? (
              <div className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />
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
                    {saved === s.key ? '✓' : saving === s.key ? '...' : 'Sauvegarder'}
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
                💬 Tester WhatsApp → {editValues.whatsapp_bali_interns}
              </a>
            )}
          </div>
        )}
      </div>

      <SettingsSection title={SECTIONS.administratif.title} items={SECTIONS.administratif.items} locale={locale} />
      <SettingsSection title={SECTIONS.documents.title} items={SECTIONS.documents.items} locale={locale} />
      <SettingsSection title={SECTIONS.partenaires.title} items={SECTIONS.partenaires.items} locale={locale} />
      <SettingsSection title={SECTIONS.equipe.title} items={SECTIONS.equipe.items} locale={locale} />
    </div>
  )
}
