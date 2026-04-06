'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  role: string
}

interface BillingEntity {
  id: string
  name: string
  is_active: boolean
}

interface VisaAgent {
  id: string
  name: string
  email: string
  phone: string
}

interface RetroDelays {
  billet: number
  paiement: number
  visa_soumis: number
  visa_recu: number
  chauffeur_notif: number
}

interface NotificationSettings {
  email_new_lead: boolean
  email_payment_received: boolean
  web_push_enabled: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'generales', label: 'Générales' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'entites', label: 'Entités légales' },
  { id: 'agents-visa', label: 'Agents visa' },
  { id: 'retroplanning', label: 'Rétro-planning' },
  { id: 'tva', label: 'TVA' },
  { id: 'notifications', label: 'Notifications' },
]

function roleBadge(role: string) {
  if (role === 'admin') return { label: 'Admin', bg: 'bg-amber-100', text: 'text-amber-800' }
  if (role === 'manager') return { label: 'Manager', bg: 'bg-blue-100', text: 'text-blue-700' }
  return { label: 'Viewer', bg: 'bg-zinc-100', text: 'text-zinc-600' }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('generales')

  // scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <div className="flex min-h-screen bg-[#fafaf7]">
      {/* Left nav */}
      <nav className="w-52 shrink-0 sticky top-0 h-screen overflow-y-auto pt-8 pl-6 pr-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Paramètres</p>
        <ul className="space-y-1">
          {SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => scrollTo(id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  activeSection === id
                    ? 'bg-[#c8a96e]/15 text-[#c8a96e] font-medium'
                    : 'text-[#1a1918] hover:bg-zinc-100'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-2xl py-8 px-6 space-y-16">
        <SectionGenerales />
        <SectionUtilisateurs />
        <SectionEntites />
        <SectionAgentsVisa />
        <SectionRetroPlanning />
        <SectionTVA />
        <SectionNotifications />
      </main>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-base font-semibold text-[#1a1918] mb-5 pb-2 border-b border-zinc-200">{title}</h2>
      {children}
    </section>
  )
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
    >
      {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé ✓' : 'Enregistrer'}
    </button>
  )
}

// ─── 1. Générales ─────────────────────────────────────────────────────────────

function SectionGenerales() {
  const [timezone, setTimezone] = useState('Asia/Makassar')
  const [locale, setLocale] = useState('fr')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/general')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const v = (data as { value: unknown }).value
          if (v && typeof v === 'object') {
            const val = v as Record<string, unknown>
            if (typeof val.timezone === 'string') setTimezone(val.timezone)
            if (typeof val.default_locale === 'string') setLocale(val.default_locale)
          }
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { app_name: 'Sunny Interns OS', timezone, default_locale: locale } }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="generales" title="Générales">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1">Nom de l&apos;application</label>
          <input
            value="Sunny Interns OS"
            readOnly
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-1">Fuseau horaire</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white text-[#1a1918]"
          >
            <option value="Asia/Makassar">Asia/Makassar (WITA, UTC+8)</option>
            <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
            <option value="Europe/Paris">Europe/Paris (CET, UTC+1)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1918] mb-2">Langue par défaut</label>
          <div className="flex gap-4">
            {(['fr', 'en'] as const).map((l) => (
              <label key={l} className="flex items-center gap-2 cursor-pointer text-sm text-[#1a1918]">
                <input
                  type="radio"
                  name="locale"
                  value={l}
                  checked={locale === l}
                  onChange={() => setLocale(l)}
                  className="accent-[#c8a96e]"
                />
                {l === 'fr' ? 'Français' : 'English'}
              </label>
            ))}
          </div>
        </div>
        <SaveButton onClick={handleSave} saving={saving} saved={saved} />
      </div>
    </Section>
  )
}

// ─── 2. Utilisateurs ─────────────────────────────────────────────────────────

function SectionUtilisateurs() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setUsers(data as User[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      setInviteMsg(data.message ?? data.error ?? 'Envoyé')
      if (res.ok) setInviteEmail('')
    } catch {
      setInviteMsg('Erreur réseau')
    } finally {
      setInviting(false)
    }
  }

  return (
    <Section id="utilisateurs" title="Utilisateurs">
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-10 bg-zinc-100 rounded-lg" />)}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = roleBadge(u.role)
                return (
                  <tr key={u.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 text-[#1a1918]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm font-medium text-[#1a1918] mb-3">Inviter un utilisateur</p>
      <div className="flex gap-2 flex-wrap">
        <input
          type="email"
          placeholder="email@exemple.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
        >
          {inviting ? 'Envoi…' : 'Envoyer invitation'}
        </button>
      </div>
      {inviteMsg && (
        <p className="mt-2 text-sm text-[#0d9e75]">{inviteMsg}</p>
      )}
    </Section>
  )
}

// ─── 3. Entités légales ───────────────────────────────────────────────────────

function SectionEntites() {
  const [entities, setEntities] = useState<BillingEntity[]>([])

  useEffect(() => {
    fetch('/api/billing-entities')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setEntities(data as BillingEntity[])
      })
      .catch(() => {})
  }, [])

  function toggle(entity: BillingEntity) {
    console.log('[BILLING_ENTITY_TOGGLE]', entity.id, !entity.is_active)
    setEntities((prev) =>
      prev.map((e) => (e.id === entity.id ? { ...e, is_active: !e.is_active } : e))
    )
  }

  return (
    <Section id="entites" title="Entités légales">
      {entities.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune entité trouvée.</p>
      ) : (
        <div className="space-y-3">
          {entities.map((entity) => {
            const isAbundance = entity.name.toUpperCase().includes('ABUNDANCE GUILD')
            return (
              <div key={entity.id} className="border border-zinc-200 rounded-xl p-4">
                {isAbundance && (
                  <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
                    ⚠ PT THE ABUNDANCE GUILD — entité inactive. Vérifiez avant utilisation.
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#1a1918]">{entity.name}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entity.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-[#dc2626]'
                      }`}
                    >
                      {entity.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggle(entity)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[#1a1918] transition-colors"
                  >
                    {entity.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── 4. Agents visa ───────────────────────────────────────────────────────────

const DEFAULT_AGENTS: VisaAgent[] = [
  { id: '1', name: 'Bali Visa Center', email: 'contact@balivisa.com', phone: '+62 361 000 001' },
  { id: '2', name: 'Indo Visa Services', email: 'info@indovisa.co.id', phone: '+62 361 000 002' },
]

function SectionAgentsVisa() {
  const [agents, setAgents] = useState<VisaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [newAgent, setNewAgent] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    fetch('/api/settings/visa_agents')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const v = (data as { value: unknown }).value
          if (Array.isArray(v) && v.length > 0) {
            setAgents(v as VisaAgent[])
            return
          }
        }
        setAgents(DEFAULT_AGENTS)
      })
      .catch(() => setAgents(DEFAULT_AGENTS))
      .finally(() => setLoading(false))
  }, [])

  function saveAgents(updated: VisaAgent[]) {
    fetch('/api/settings/visa_agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: updated }),
    }).catch(() => {})
  }

  function remove(id: string) {
    const updated = agents.filter((a) => a.id !== id)
    setAgents(updated)
    saveAgents(updated)
  }

  function add() {
    if (!newAgent.name.trim()) return
    const updated = [...agents, { ...newAgent, id: Date.now().toString() }]
    setAgents(updated)
    saveAgents(updated)
    setNewAgent({ name: '', email: '', phone: '' })
  }

  return (
    <Section id="agents-visa" title="Agents visa">
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-zinc-100 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1918]">{agent.name}</p>
                <p className="text-xs text-zinc-500">{agent.email} · {agent.phone}</p>
              </div>
              <button
                onClick={() => remove(agent.id)}
                className="text-xs text-[#dc2626] hover:underline"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-[#1a1918] mb-3">Ajouter un agent</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          placeholder="Nom"
          value={newAgent.name}
          onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Email"
          value={newAgent.email}
          onChange={(e) => setNewAgent((p) => ({ ...p, email: e.target.value }))}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Téléphone"
          value={newAgent.phone}
          onChange={(e) => setNewAgent((p) => ({ ...p, phone: e.target.value }))}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={add}
        className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors"
      >
        + Ajouter
      </button>
    </Section>
  )
}

// ─── 5. Rétro-planning ────────────────────────────────────────────────────────

const RETRO_FIELDS: { key: keyof RetroDelays; label: string; min: number; max: number; default: number }[] = [
  { key: 'billet', label: 'Billet confirmé', min: 20, max: 60, default: 40 },
  { key: 'paiement', label: 'Paiement reçu', min: 15, max: 45, default: 30 },
  { key: 'visa_soumis', label: 'Visa soumis agent', min: 15, max: 45, default: 30 },
  { key: 'visa_recu', label: 'Visa reçu', min: 3, max: 14, default: 7 },
  { key: 'chauffeur_notif', label: 'Chauffeur notifié', min: 1, max: 5, default: 2 },
]

function SectionRetroPlanning() {
  const [delays, setDelays] = useState<RetroDelays>({
    billet: 40,
    paiement: 30,
    visa_soumis: 30,
    visa_recu: 7,
    chauffeur_notif: 2,
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/settings/retroplanning_delays')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const v = (data as { value: unknown }).value
          if (v && typeof v === 'object') setDelays(v as RetroDelays)
        }
      })
      .catch(() => {})
  }, [])

  const saveDelays = useCallback((updated: RetroDelays) => {
    fetch('/api/settings/retroplanning_delays', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: updated }),
    }).catch(() => {})
  }, [])

  function handleChange(key: keyof RetroDelays, value: number) {
    const updated = { ...delays, [key]: value }
    setDelays(updated)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveDelays(updated), 800)
  }

  return (
    <Section id="retroplanning" title="Rétro-planning">
      <div className="space-y-5">
        {RETRO_FIELDS.map(({ key, label, min, max }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[#1a1918]">{label}</label>
              <span className="text-sm font-semibold text-[#c8a96e]">J-{delays[key]}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={delays[key]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-full accent-[#c8a96e]"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
              <span>J-{min}</span>
              <span>J-{max}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-400">Sauvegarde automatique après modification.</p>
    </Section>
  )
}

// ─── 6. TVA ───────────────────────────────────────────────────────────────────

function SectionTVA() {
  const [rate, setRate] = useState(20)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/vat_rate')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const v = (data as { value: unknown }).value
          if (typeof v === 'number') setRate(v)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings/vat_rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: rate }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="tva" title="TVA">
      <div>
        <label className="block text-sm font-medium text-[#1a1918] mb-1">Taux TVA (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-32 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-[#d97706]">
          ⚠ Applicable aux futures factures uniquement — les factures existantes ne sont pas modifiées.
        </p>
        <SaveButton onClick={handleSave} saving={saving} saved={saved} />
      </div>
    </Section>
  )
}

// ─── 7. Notifications ─────────────────────────────────────────────────────────

function SectionNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_new_lead: true,
    email_payment_received: true,
    web_push_enabled: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const v = (data as { value: unknown }).value
          if (v && typeof v === 'object') setSettings(v as NotificationSettings)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: settings }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const TOGGLES: { key: keyof NotificationSettings; label: string }[] = [
    { key: 'email_new_lead', label: 'Email à chaque nouveau lead' },
    { key: 'email_payment_received', label: 'Email à chaque paiement reçu' },
    { key: 'web_push_enabled', label: 'Notifications Web Push' },
  ]

  return (
    <Section id="notifications" title="Notifications">
      <div className="space-y-3">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.checked }))}
              className="w-4 h-4 accent-[#c8a96e]"
            />
            <span className="text-sm text-[#1a1918]">{label}</span>
          </label>
        ))}
      </div>
      <SaveButton onClick={handleSave} saving={saving} saved={saved} />
    </Section>
  )
}
