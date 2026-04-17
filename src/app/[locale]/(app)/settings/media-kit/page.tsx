'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface BrandAsset {
  id: string; key: string; name: string; description: string | null
  url: string | null; svg_url: string | null; download_url: string | null
  category: string; format: string; dimensions: string | null
  usage: string[] | null; sort_order: number
}
interface FontAsset {
  id: string; key: string; name: string; description: string | null
  url: string | null; file_name: string | null; format: string
}

const COLORS = [
  { name: 'Primary Yellow', hex: '#F5A623', usage: 'Main brand color. Gradient start. Backgrounds, CTAs.' },
  { name: 'Orange', hex: '#E8930A', usage: 'Gradient end. Hover states.' },
  { name: 'Dark', hex: '#1A1918', usage: 'Email headers, text, dark backgrounds.' },
  { name: 'Gold', hex: '#C8A96E', usage: 'OS accent color, links, highlights.' },
  { name: 'Off-white', hex: '#FAF9F7', usage: 'Page backgrounds, light surfaces.' },
  { name: 'White', hex: '#FFFFFF', usage: 'Logo on dark backgrounds.' },
]

const LOGO_BG: Record<string, string> = {
  logo_landscape_white: '#1A1918',
  logo_landscape_black: '#FAF9F7',
  logo_portrait_white: '#1A1918',
  logo_portrait_black: '#FAF9F7',
  logo_square_gradient: 'linear-gradient(135deg, #F5A623, #E8930A)',
  logo_square_white: '#1A1918',
  logo_symbol_svg: '#FAF9F7',
  logo_symbol_white: '#1A1918',
  logo_symbol_black: '#FAF9F7',
  favicon: '#F5A623',
  og_image: '#F9F9F9',
  email_logo: '#1A1918',
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-[10px] px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-500 transition-colors ml-1">
      {copied ? '✓' : 'copy'}
    </button>
  )
}

export default function BrandingKitPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [fonts, setFonts] = useState<FontAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [tab, setTab] = useState<'logos' | 'typography' | 'colors' | 'guidelines'>('logos')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/brand-assets').then(r => r.ok ? r.json() : []),
      fetch('/api/settings/font-assets').then(r => r.ok ? r.json() : []),
    ]).then(([a, f]) => {
      setAssets((a as BrandAsset[]).sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)))
      setFonts(f as FontAsset[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function uploadAsset(key: string, file: File, isFont = false) {
    setUploading(key)
    const form = new FormData()
    form.append('file', file)
    form.append('key', key)
    const endpoint = isFont ? '/api/settings/font-assets/upload' : '/api/settings/brand-assets/upload'
    try {
      const r = await fetch(endpoint, { method: 'POST', body: form })
      if (r.ok) {
        const d = await r.json() as { url: string; file_name?: string }
        if (isFont) {
          setFonts(prev => prev.map(f => f.key === key ? { ...f, url: d.url, file_name: d.file_name ?? null } : f))
        } else {
          setAssets(prev => prev.map(a => a.key === key ? { ...a, url: d.url } : a))
        }
        setSaved(key)
        setTimeout(() => setSaved(null), 2000)
      }
    } finally { setUploading(null) }
  }

  const logoGroups = [
    { label: 'Landscape (horizontal)', keys: ['logo_landscape_white', 'logo_landscape_black'] },
    { label: 'Portrait (vertical)', keys: ['logo_portrait_white', 'logo_portrait_black'] },
    { label: 'Square', keys: ['logo_square_gradient', 'logo_square_white'] },
    { label: 'Symbol only', keys: ['logo_symbol_svg', 'logo_symbol_white', 'logo_symbol_black'] },
    { label: 'Digital assets', keys: ['favicon', 'email_logo', 'og_image'] },
  ]

  if (loading) return <div className="max-w-4xl mx-auto py-12 px-6"><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse"/>)}</div></div>

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700 mb-6 block">← Settings</button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">🎨 Branding Kit</h1>
          <p className="text-sm text-zinc-500 mt-0.5">All brand assets — logos, fonts, colors, guidelines. Everything needed to build emails, documents, social media, and the website.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['logos', 'typography', 'colors', 'guidelines'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${tab === t ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'logos' ? '🖼️ Logos' : t === 'typography' ? '✏️ Typography' : t === 'colors' ? '🎨 Colors' : '📋 Guidelines'}
          </button>
        ))}
      </div>

      {/* ── LOGOS TAB ── */}
      {tab === 'logos' && (
        <div className="space-y-8">
          {logoGroups.map(group => {
            const groupAssets = group.keys.map(k => assets.find(a => a.key === k)).filter(Boolean) as BrandAsset[]
            return (
              <div key={group.label}>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{group.label}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groupAssets.map(asset => (
                    <div key={asset.key} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                      {/* Preview area */}
                      <div className="h-28 flex items-center justify-center p-4" style={{ background: LOGO_BG[asset.key] ?? '#f9f8f7' }}>
                        {asset.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.url} alt={asset.name} className="max-h-full max-w-full object-contain" crossOrigin="anonymous"/>
                        ) : (
                          <div className="text-center">
                            <p className="text-2xl mb-1">🖼️</p>
                            <p className="text-xs text-zinc-400 opacity-60">Not uploaded yet</p>
                          </div>
                        )}
                      </div>
                      {/* Info + actions */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-[#1a1918] leading-tight">{asset.name}</p>
                          {saved === asset.key && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">✓ Saved</span>}
                        </div>
                        {asset.dimensions && <p className="text-[11px] text-zinc-400 mb-1">{asset.dimensions}</p>}
                        {asset.description && <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">{asset.description}</p>}
                        <div className="flex gap-2">
                          <input ref={el => { fileRefs.current[asset.key] = el }} type="file"
                            accept={asset.format === 'svg' ? '.svg,image/svg+xml' : 'image/*,.svg,.png,.jpg,.webp'}
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset(asset.key, f) }}/>
                          <button onClick={() => fileRefs.current[asset.key]?.click()}
                            disabled={uploading === asset.key}
                            className="flex-1 py-1.5 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
                            {uploading === asset.key ? 'Uploading…' : asset.url ? '↺ Replace' : '↑ Upload'}
                          </button>
                          {asset.url && (
                            <a href={asset.url} download target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                              ↓
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Email preview */}
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Email header preview</h2>
            <div className="bg-[#1a1918] rounded-2xl p-6 flex items-center gap-4">
              {assets.find(a => a.key === 'email_logo')?.url || assets.find(a => a.key === 'logo_landscape_white')?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assets.find(a => a.key === 'email_logo')?.url ?? assets.find(a => a.key === 'logo_landscape_white')?.url ?? ''} alt="Email header" style={{ height: '28px' }} crossOrigin="anonymous"/>
              ) : (
                <span className="text-white text-sm font-bold">BALI INTERNS</span>
              )}
              <p className="text-zinc-500 text-xs">← This is how your logo appears in all email headers</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TYPOGRAPHY TAB ── */}
      {tab === 'typography' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
            Upload WOFF2, TTF, or OTF font files. They will be available for download and referenced across the OS, email templates, and PDF generation.
          </div>
          {fonts.map(font => (
            <div key={font.key} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">✏️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-[#1a1918]">{font.name}</p>
                    {saved === font.key && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Saved</span>}
                  </div>
                  {font.description && <p className="text-xs text-zinc-400 mb-2">{font.description}</p>}
                  {font.url && (
                    <p className="text-[11px] text-zinc-400 mb-2 font-mono truncate">{font.file_name ?? font.url}</p>
                  )}
                  <div className="flex gap-2">
                    <input ref={el => { fileRefs.current[font.key] = el }} type="file"
                      accept=".woff2,.woff,.ttf,.otf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset(font.key, f, true) }}/>
                    <button onClick={() => fileRefs.current[font.key]?.click()}
                      disabled={uploading === font.key}
                      className="px-4 py-1.5 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50">
                      {uploading === font.key ? 'Uploading…' : font.url ? '↺ Replace font' : '↑ Upload font'}
                    </button>
                    {font.url && (
                      <a href={font.url} download target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                        ↓ Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COLORS TAB ── */}
      {tab === 'colors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLORS.map(c => (
              <div key={c.hex} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden flex">
                <div className="w-16 flex-shrink-0" style={{ background: c.hex }}/>
                <div className="p-4 flex-1">
                  <p className="text-sm font-bold text-[#1a1918] mb-0.5">{c.name}</p>
                  <p className="text-xs font-mono text-zinc-500 mb-1">
                    {c.hex}<CopyBtn value={c.hex}/>
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{c.usage}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gradient preview */}
          <div className="rounded-2xl overflow-hidden">
            <div className="h-20" style={{ background: 'linear-gradient(135deg, #F5A623, #E8930A)' }}/>
            <div className="bg-white border border-t-0 border-zinc-100 p-4">
              <p className="text-sm font-bold text-[#1a1918]">Primary gradient</p>
              <p className="text-xs font-mono text-zinc-500">linear-gradient(135deg, #F5A623, #E8930A)<CopyBtn value="linear-gradient(135deg, #F5A623, #E8930A)"/></p>
            </div>
          </div>
        </div>
      )}

      {/* ── GUIDELINES TAB ── */}
      {tab === 'guidelines' && (
        <div className="space-y-4">
          {[
            {
              title: '✅ Logo usage — Do',
              items: [
                'Use landscape white on dark (#1A1918) backgrounds',
                'Use landscape black on white or light (#FAF9F7) backgrounds',
                'Use square gradient as profile picture on all social platforms',
                'Keep clear space around the logo equal to the height of the "B" in BALI',
                'Use SVG format for print and large formats',
              ]
            },
            {
              title: '❌ Logo usage — Don\'t',
              items: [
                'Don\'t stretch, rotate, or distort the logo',
                'Don\'t add drop shadows or outlines',
                'Don\'t use the logo on busy backgrounds without a solid container',
                'Don\'t recreate the logo in another font or color',
                'Don\'t use "Sunny Interns" — the brand is Bali Interns',
              ]
            },
            {
              title: '📧 Emails',
              items: [
                'Header: landscape white logo on #1A1918 dark background',
                'Footer: plain text — "Bali Interns — bali-interns.com — team@bali-interns.com"',
                'All emails sent from team@bali-interns.com',
                'Accent color for CTAs: #C8A96E (gold)',
                'Body font: Helvetica Neue, Arial, sans-serif',
              ]
            },
            {
              title: '📱 Social media',
              items: [
                'Profile picture: square gradient logo (400×400px)',
                'Brand color in all posts: yellow gradient #F5A623 → #E8930A',
                'Hashtags: #BaliInterns #StageABali #InternshipBali',
                'Tone: warm, adventurous, professional but accessible',
                'Tag: @baliinterns (Instagram, TikTok, LinkedIn)',
              ]
            },
            {
              title: '📄 Documents (PDF, contracts)',
              items: [
                'Use landscape black logo on white backgrounds',
                'Accent color: #C8A96E (gold) for borders and highlights',
                'Font: Times New Roman or Georgia for formal/legal documents',
                'Company name always: "Bali Interns" (not "Bali Interns Ltd" unless entity-specific)',
              ]
            },
          ].map(section => (
            <div key={section.title} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-[#1a1918] mb-3">{section.title}</p>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                    <span className="text-zinc-300 flex-shrink-0 mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
