'use client'
import { useEffect, useState } from 'react'

interface BrandAsset {
  id: string; key: string; name: string; description: string | null; url: string | null; file_name: string | null; usage: string[] | null
}

const USAGE_LABELS: Record<string, string> = {
  invoice: '🧾 Facture PDF',
  portal_employer: '🏢 Portail employeur',
  portal_header: '🌐 Header portails',
  email_header: '📧 En-tête email',
  email_footer: '📧 Pied de page email',
  email_signature: '✍️ Signature email Charly',
  browser_tab: '🌐 Onglet navigateur (favicon)',
  chauffeur_card: '🚗 Carte chauffeur WA',
}

export default function MediaKitPage() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editUrls, setEditUrls] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/brand-assets')
      .then(r => r.ok ? r.json() : [])
      .then((d: BrandAsset[]) => {
        setAssets(d)
        const urls: Record<string, string> = {}
        d.forEach(a => { if (a.url) urls[a.key] = a.url })
        setEditUrls(urls)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function uploadFile(key: string, file: File) {
    setUploading(key)
    const form = new FormData()
    form.append('file', file)
    form.append('key', key)
    try {
      const r = await fetch('/api/settings/brand-assets/upload', { method: 'POST', body: form })
      if (r.ok) {
        const d = await r.json() as { url: string }
        setAssets(prev => prev.map(a => a.key === key ? { ...a, url: d.url } : a))
        setEditUrls(prev => ({ ...prev, [key]: d.url }))
        setSaved(key)
        setTimeout(() => setSaved(null), 2000)
      }
    } finally {
      setUploading(null)
    }
  }

  async function saveUrl(key: string) {
    const asset = assets.find(a => a.key === key)
    if (!asset) return
    const r = await fetch(`/api/settings/brand-assets/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: editUrls[key] }),
    })
    if (r.ok) {
      setAssets(prev => prev.map(a => a.key === key ? { ...a, url: editUrls[key] } : a))
      setEditMode(null)
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">Media Kit — Assets de marque</h1>
        <p className="text-sm text-zinc-400 mt-1">Uploadez vos logos. Ils s&apos;affichent automatiquement sur les factures, portails candidats/employeurs, emails et la carte chauffeur.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-2xl mb-2">🎨</p>
          <p className="text-sm">Aucun asset configuré. Les assets sont créés automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map(asset => (
            <div key={asset.key} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-20 h-20 border border-zinc-200 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: asset.key.includes('white') ? '#1a1918' : '#f9f8f6' }}>
                  {asset.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-contain p-2" crossOrigin="anonymous" />
                  ) : (
                    <span className="text-2xl">🖼️</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-[#1a1918]">{asset.name}</p>
                    {saved === asset.key && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Sauvegardé</span>}
                  </div>
                  {asset.description && <p className="text-xs text-zinc-400 mb-2">{asset.description}</p>}
                  {/* Usage badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(asset.usage ?? []).map(u => (
                      <span key={u} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{USAGE_LABELS[u] ?? u}</span>
                    ))}
                  </div>
                  {/* Edit mode */}
                  {editMode === asset.key ? (
                    <div className="flex gap-2">
                      <input
                        value={editUrls[asset.key] ?? ''}
                        onChange={e => setEditUrls(p => ({ ...p, [asset.key]: e.target.value }))}
                        placeholder="https://..."
                        className={inp}
                      />
                      <button onClick={() => void saveUrl(asset.key)} className="px-3 py-1.5 bg-[#c8a96e] text-white text-xs rounded-lg font-medium whitespace-nowrap">OK</button>
                      <button onClick={() => setEditMode(null)} className="px-3 py-1.5 border border-zinc-200 text-xs rounded-lg">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <label className="cursor-pointer px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg font-medium text-zinc-700">
                        {uploading === asset.key ? '⏳ Upload…' : '📎 Uploader un fichier'}
                        <input type="file" accept="image/*,.svg,.png,.jpg,.jpeg,.webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(asset.key, f) }} />
                      </label>
                      <button onClick={() => setEditMode(asset.key)} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                        🔗 URL externe
                      </button>
                      {asset.url && (
                        <a href={asset.url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                          👁️ Voir
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guide upload */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-800 mb-2">📤 Fichiers recommandés à uploader</p>
        <div className="space-y-1 text-xs text-amber-700">
          <p>• <strong>Logo principal</strong> — PNG fond transparent, min. 400px large (sur fond blanc ou clair)</p>
          <p>• <strong>Logo blanc</strong> — PNG fond transparent blanc, pour les fonds sombres</p>
          <p>• <strong>Favicon</strong> — PNG carré 64×64px ou 128×128px</p>
          <p>• <strong>Logo signature</strong> — PNG horizontal compact, max 200px large</p>
        </div>
      </div>
    </div>
  )
}
