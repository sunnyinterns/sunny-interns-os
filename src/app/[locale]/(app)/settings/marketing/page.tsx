'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'

interface MarketingSettings {
  id?: string
  instagram_connected?: boolean
  linkedin_connected?: boolean
  tiktok_connected?: boolean
  facebook_connected?: boolean
  webhook_url?: string | null
  primary_color?: string | null
  watermark_logo_url?: string | null
  updated_at?: string | null
}

const PLATFORMS: { key: Platform; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', desc: 'Meta Graph API — posts, stories, reels' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼', color: '#0077B5', desc: 'LinkedIn API — company posts' },
  { key: 'tiktok',    label: 'TikTok',    icon: '🎵', color: '#000000', desc: 'TikTok for Business — feed posts' },
  { key: 'facebook',  label: 'Facebook',  icon: '👥', color: '#1877F2', desc: 'Meta Graph API — page posts' },
]

export default function SettingsMarketingPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [settings, setSettings] = useState<MarketingSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/settings/marketing')
        if (res.ok) {
          const data = await res.json() as MarketingSettings
          setSettings(data ?? {})
        }
      } catch { /* ignore — la route peut ne pas encore exister */ }
      setLoading(false)
    })()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function save(patch: Partial<MarketingSettings>) {
    setSaving(true)
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      const res = await fetch('/api/settings/marketing', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) showToast('Sauvegardé ✓')
      else showToast('Erreur sauvegarde')
    } catch {
      showToast('Erreur réseau')
    }
    setSaving(false)
  }

  function togglePlatform(platform: Platform) {
    const key = `${platform}_connected` as const
    const isConnected = !!settings[key]
    if (isConnected) {
      // Déconnexion
      if (!confirm(`Déconnecter ${platform} ?`)) return
      void save({ [key]: false })
    } else {
      // Connexion — placeholder : pour l'instant on marque simplement connecté
      alert(`Connexion ${platform} via OAuth : fonctionnalité à venir. L'API ${platform} sera reliée dans une prochaine version.`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link href={`/${locale}/settings`} className="text-sm text-zinc-500 hover:text-[#c8a96e] transition-colors">
          ← Retour aux paramètres
        </Link>
        <h1 className="text-2xl font-bold text-[#1a1918] mt-2">Marketing & Réseaux sociaux</h1>
        <p className="text-sm text-zinc-500 mt-1">Connexions réseaux, auto-posting et branding des posts</p>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toast}
        </div>
      )}

      {/* Section : Connexions réseaux sociaux */}
      <section>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Connexions réseaux sociaux</h2>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {PLATFORMS.map(p => {
              const connected = !!settings[`${p.key}_connected` as keyof MarketingSettings]
              return (
                <div key={p.key} className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${p.color}15`, color: p.color }}>
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918]">{p.label}</p>
                    <p className="text-xs text-zinc-400 truncate">{p.desc}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${connected ? 'bg-green-50 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}>
                    {connected ? '🟢 Connecté' : '⚪ Déconnecté'}
                  </span>
                  <button
                    onClick={() => togglePlatform(p.key)}
                    disabled={saving}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${connected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#c8a96e] text-white hover:bg-[#b8945a]'}`}
                  >
                    {connected ? 'Déconnecter' : 'Connecter'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section : Auto-posting */}
      <section>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Auto-posting</h2>
        <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">URL Webhook (n8n / Buffer / Zapier)</label>
            <input
              type="url"
              defaultValue={settings.webhook_url ?? ''}
              onBlur={e => void save({ webhook_url: e.target.value.trim() || null })}
              placeholder="https://n8n.example.com/webhook/posts"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Les publications programmées seront POST envoyées à cette URL avec le payload &#123; job_id, platform, content, image_url, scheduled_for &#125;
            </p>
          </div>
        </div>
      </section>

      {/* Section : Branding */}
      <section>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Branding des posts</h2>
        <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Couleur primaire</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={settings.primary_color ?? '#c8a96e'}
                onBlur={e => void save({ primary_color: e.target.value })}
                className="w-10 h-10 border border-zinc-200 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                defaultValue={settings.primary_color ?? '#c8a96e'}
                onBlur={e => void save({ primary_color: e.target.value.trim() })}
                placeholder="#c8a96e"
                className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Couleur appliquée aux accents dans les posts générés</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">URL du logo (watermark)</label>
            <input
              type="url"
              defaultValue={settings.watermark_logo_url ?? ''}
              onBlur={e => void save({ watermark_logo_url: e.target.value.trim() || null })}
              placeholder="https://…/logo.png"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
            />
            {settings.watermark_logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={settings.watermark_logo_url} alt="" className="mt-2 h-12 w-auto object-contain rounded-lg border border-zinc-100 p-1 bg-white" />
            )}
            <p className="text-[11px] text-zinc-400 mt-1">Logo ajouté en filigrane sur les images générées</p>
          </div>
        </div>
      </section>

      <p className="text-xs text-zinc-400 text-center">
        Ces paramètres sont utilisés par le hub de contenu dans les fiches job — onglet 🖼 Image & Vidéo et ✍️ Posts.
      </p>
    </div>
  )
}
