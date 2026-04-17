'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface BrandAsset {
  id: string; key: string; name: string; description: string | null
  url: string | null; svg_url: string | null
  category: string; format: string; dimensions: string | null
  usage: string[] | null; sort_order: number
}
interface FontAsset {
  id: string; key: string; name: string; description: string | null
  url: string | null; file_name: string | null; format: string
}

// ─── Brand constants ────────────────────────────────────────────────────────
const COLORS = [
  { name: 'Primary Yellow', hex: '#F5A623', rgb: '245, 166, 35', usage: 'Main brand color. Gradient start. All yellow backgrounds.' },
  { name: 'Orange', hex: '#E8930A', rgb: '232, 147, 10', usage: 'Gradient end. Hover states.' },
  { name: 'Dark', hex: '#1A1918', rgb: '26, 25, 24', usage: 'Email headers, main text, dark backgrounds.' },
  { name: 'Gold', hex: '#C8A96E', rgb: '200, 169, 110', usage: 'OS accent, links, CTAs, highlights.' },
  { name: 'Off-white', hex: '#FAF9F7', rgb: '250, 249, 247', usage: 'Page backgrounds, light card surfaces.' },
  { name: 'White', hex: '#FFFFFF', rgb: '255, 255, 255', usage: 'Logo on dark, clean backgrounds.' },
]

// Key → { bg, label, specs, formats, hint }
const LOGO_META: Record<string, {
  bg: string; label: string; specs: string; formats: string; hint: string
}> = {
  logo_landscape_white: {
    bg: '#1A1918', label: 'Landscape · White',
    specs: '1200 × 240 px @ 2× (600 × 120 display)',
    formats: 'PNG transparent + SVG',
    hint: 'Email headers, dark portal backgrounds, presentations'
  },
  logo_landscape_black: {
    bg: '#FAF9F7', label: 'Landscape · Black',
    specs: '1200 × 240 px @ 2× (600 × 120 display)',
    formats: 'PNG transparent + SVG',
    hint: 'PDF documents, contracts, light backgrounds'
  },
  logo_portrait_white: {
    bg: '#1A1918', label: 'Portrait · White',
    specs: '600 × 800 px @ 2× (300 × 400 display)',
    formats: 'PNG transparent + SVG',
    hint: 'Social media posts, posters, vertical formats'
  },
  logo_portrait_black: {
    bg: '#FAF9F7', label: 'Portrait · Black',
    specs: '600 × 800 px @ 2× (300 × 400 display)',
    formats: 'PNG transparent + SVG',
    hint: 'Print, legal documents, stamps'
  },
  logo_square_gradient: {
    bg: 'linear-gradient(135deg,#F5A623,#E8930A)', label: 'Square · Gradient',
    specs: '800 × 800 px (1× is fine)',
    formats: 'PNG',
    hint: 'Profile picture — Instagram, Facebook, LinkedIn, WhatsApp'
  },
  logo_square_white: {
    bg: '#1A1918', label: 'Square · White',
    specs: '500 × 500 px @ 2×',
    formats: 'PNG transparent',
    hint: 'App icons, alternative profile picture on dark'
  },
  logo_symbol_svg: {
    bg: '#FAF9F7', label: 'Symbol · SVG source',
    specs: 'Vector — any size',
    formats: 'SVG only',
    hint: 'Master source file. Never compress. Use for all derivations.'
  },
  logo_symbol_white: {
    bg: '#1A1918', label: 'Symbol · White',
    specs: '500 × 500 px @ 2×',
    formats: 'PNG transparent',
    hint: 'Watermark, favicon alt, icon badge'
  },
  logo_symbol_black: {
    bg: '#FAF9F7', label: 'Symbol · Black',
    specs: '500 × 500 px @ 2×',
    formats: 'PNG transparent',
    hint: 'Small formats, stamps, print'
  },
  favicon: {
    bg: '#F5A623', label: 'Favicon',
    specs: '64 × 64 px (also export 32 × 32 and 180 × 180 for Apple)',
    formats: 'PNG',
    hint: 'Browser tab. Yellow background. Export from the square logo.'
  },
  email_logo: {
    bg: '#1A1918', label: 'Email header logo',
    specs: '600 × 120 px @ 2× (300 × 60 display)',
    formats: 'PNG transparent',
    hint: 'Used in ALL email headers. Keep under 50 KB. Landscape white recommended.'
  },
  og_image: {
    bg: '#F5A623', label: 'OG Image (social sharing)',
    specs: '1200 × 630 px (1×)',
    formats: 'PNG or JPG',
    hint: 'Link preview on LinkedIn, WhatsApp, iMessage, Twitter/X. Include logo + tagline.'
  },
}

const LOGO_GROUPS = [
  { label: 'Landscape (horizontal)', keys: ['logo_landscape_white', 'logo_landscape_black'] },
  { label: 'Portrait (vertical)', keys: ['logo_portrait_white', 'logo_portrait_black'] },
  { label: 'Square', keys: ['logo_square_gradient', 'logo_square_white'] },
  { label: 'Symbol only', keys: ['logo_symbol_svg', 'logo_symbol_white', 'logo_symbol_black'] },
  { label: 'Digital exports', keys: ['favicon', 'email_logo', 'og_image'] },
]

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(value); setC(true); setTimeout(() => setC(false), 1500) }}
      className="text-[10px] px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-500 transition-colors shrink-0">
      {c ? '✓' : (label ?? 'copy')}
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
    form.append('file', file); form.append('key', key)
    const endpoint = isFont ? '/api/settings/font-assets/upload' : '/api/settings/brand-assets/upload'
    try {
      const r = await fetch(endpoint, { method: 'POST', body: form })
      if (r.ok) {
        const d = await r.json() as { url: string; file_name?: string }
        if (isFont) setFonts(prev => prev.map(f => f.key === key ? { ...f, url: d.url, file_name: d.file_name ?? null } : f))
        else setAssets(prev => prev.map(a => a.key === key ? { ...a, url: d.url } : a))
        setSaved(key); setTimeout(() => setSaved(null), 2500)
      }
    } finally { setUploading(null) }
  }

  // Inject @font-face when fonts load
  useEffect(() => {
    const bali = fonts.find(f => f.key === 'font_bali')
    const interns = fonts.find(f => f.key === 'font_interns')
    if (!bali?.url && !interns?.url) return
    const style = document.createElement('style')
    style.id = 'branding-kit-fonts'
    document.getElementById('branding-kit-fonts')?.remove()
    style.textContent = [
      bali?.url ? `@font-face{font-family:'BaliFont';src:url('${bali.url}');font-display:swap;}` : '',
      interns?.url ? `@font-face{font-family:'InternsFont';src:url('${interns.url}');font-display:swap;}` : '',
    ].join('')
    document.head.appendChild(style)
  }, [fonts])

  if (loading) return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse"/>)}</div>
    </div>
  )

  const emailLogoUrl = assets.find(a => a.key === 'email_logo')?.url ?? assets.find(a => a.key === 'logo_landscape_white')?.url

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700 mb-5 block">← Settings</button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1918]">🎨 Branding Kit</h1>
        <p className="text-sm text-zinc-500 mt-1">All brand assets — logos, fonts, colors, guidelines. Source of truth for emails, documents, site and social media.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['logos','typography','colors','guidelines'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'logos' ? '🖼️ Logos' : t === 'typography' ? '✏️ Typography' : t === 'colors' ? '🎨 Colors' : '📋 Guidelines'}
          </button>
        ))}
      </div>

      {/* ── LOGOS ── */}
      {tab === 'logos' && (
        <div className="space-y-8">
          {LOGO_GROUPS.map(group => {
            const groupAssets = group.keys.map(k => assets.find(a => a.key === k)).filter(Boolean) as BrandAsset[]
            return (
              <section key={group.label}>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{group.label}</h2>
                <div className={`grid gap-4 ${groupAssets.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {groupAssets.map(asset => {
                    const meta = LOGO_META[asset.key]
                    return (
                      <div key={asset.key} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden flex flex-col">
                        {/* ── Visual preview ── */}
                        <div className="relative h-32 flex items-center justify-center p-4"
                          style={{ background: meta?.bg ?? '#f9f8f7' }}>
                          {asset.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={asset.url} alt={asset.name}
                              className="max-h-full max-w-full object-contain"
                              crossOrigin="anonymous"/>
                          ) : (
                            <div className="text-center opacity-40">
                              <p className="text-xl mb-0.5">🖼️</p>
                              <p className="text-[10px] text-white">Not uploaded yet</p>
                            </div>
                          )}
                          {saved === asset.key && (
                            <span className="absolute top-2 right-2 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">✓ Saved</span>
                          )}
                        </div>

                        {/* ── Info + specs ── */}
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-sm font-bold text-[#1a1918] leading-tight mb-1">{meta?.label ?? asset.name}</p>

                          {/* Specs pill */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-mono">{meta?.specs}</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{meta?.formats}</span>
                          </div>

                          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3 flex-1">{meta?.hint}</p>

                          {/* Actions */}
                          <div className="flex gap-2 mt-auto">
                            <input
                              ref={el => { fileRefs.current[asset.key] = el }}
                              type="file"
                              accept={asset.format === 'svg' ? '.svg,image/svg+xml' : 'image/*,.svg,.png,.jpg,.webp'}
                              className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset(asset.key, f) }}/>
                            <button
                              onClick={() => fileRefs.current[asset.key]?.click()}
                              disabled={uploading === asset.key}
                              className="flex-1 py-1.5 text-xs font-semibold bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
                              {uploading === asset.key ? '⏳ Uploading…' : asset.url ? '↺ Replace' : '↑ Upload'}
                            </button>
                            {asset.url && (
                              <a href={asset.url} download
                                className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 flex items-center"
                                title="Download">
                                ↓
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Email header live preview */}
          <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Email header — live preview</h2>
            <div className="rounded-2xl overflow-hidden border border-zinc-100">
              <div className="bg-[#1a1918] px-8 py-5 flex items-center">
                {emailLogoUrl
                  ? <img src={emailLogoUrl} alt="Email header" style={{ height: '28px' }} crossOrigin="anonymous"/>
                  : <span className="text-white font-bold text-lg">BALI INTERNS</span>
                }
              </div>
              <div className="bg-white px-8 py-5">
                <p className="text-sm text-zinc-500">Body content appears here. Background: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">#FFFFFF</code> · Accent: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">#C8A96E</code></p>
              </div>
              <div className="bg-[#f4f3f1] px-8 py-3 text-center">
                <p className="text-xs text-zinc-400">Bali Interns — bali-interns.com — team@bali-interns.com</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── TYPOGRAPHY ── */}
      {tab === 'typography' && (
        <div className="space-y-4">
          {fonts.map(font => {
            const isBali = font.key === 'font_bali'
            const isInterns = font.key === 'font_interns'
            const fontFamily = isBali ? 'BaliFont' : isInterns ? 'InternsFont' : 'inherit'
            const letterSpacing = isBali ? '0.03em' : isInterns ? '0.10em' : 'normal'
            const previewText = isBali ? 'BALI' : isInterns ? 'INTERNS' : 'The quick brown fox'
            const previewSize = (isBali || isInterns) ? '56px' : '24px'

            return (
              <div key={font.key} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                {/* Live font preview */}
                <div className="bg-[#1a1918] h-32 flex items-center justify-center">
                  {font.url ? (
                    <span style={{
                      fontFamily, fontSize: previewSize, letterSpacing,
                      color: '#FFFFFF', lineHeight: 1,
                    }}>
                      {previewText}
                    </span>
                  ) : (
                    <div className="text-center opacity-40">
                      <p className="text-zinc-400 text-sm">Upload font to preview</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-bold text-[#1a1918]">{font.name}</p>
                      {font.description && <p className="text-xs text-zinc-400 mt-0.5">{font.description}</p>}
                    </div>
                    {saved === font.key && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Saved</span>}
                  </div>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {isBali && <>
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">Sapiens Bold — Hemphill Type</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Letter spacing 3%</span>
                    </>}
                    {isInterns && <>
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">Bebas Neue Pro Regular</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Letter spacing 10%</span>
                    </>}
                    {!isBali && !isInterns && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">WOFF2 / TTF / OTF</span>}
                    {font.file_name && <span className="text-[10px] font-mono bg-zinc-50 border border-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{font.file_name}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <input ref={el => { fileRefs.current[font.key] = el }}
                      type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAsset(font.key, f, true) }}/>
                    <button onClick={() => fileRefs.current[font.key]?.click()}
                      disabled={uploading === font.key}
                      className="flex-1 py-2 text-xs font-semibold bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
                      {uploading === font.key ? '⏳ Uploading…' : font.url ? '↺ Replace font' : '↑ Upload font'}
                    </button>
                    {font.url && (
                      <a href={font.url} download
                        className="px-4 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 flex items-center gap-1">
                        ↓ Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── COLORS ── */}
      {tab === 'colors' && (
        <div className="space-y-3">
          {/* Gradient preview */}
          <div className="rounded-2xl overflow-hidden border border-zinc-100">
            <div className="h-24 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F5A623, #E8930A)' }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'BaliFont', letterSpacing: '0.03em' }}>BALI INTERNS</span>
            </div>
            <div className="bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1a1918]">Primary gradient</p>
                <p className="text-xs text-zinc-400">linear-gradient(135deg, #F5A623, #E8930A)</p>
              </div>
              <CopyBtn value="linear-gradient(135deg, #F5A623, #E8930A)" label="copy CSS"/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLORS.map(c => (
              <div key={c.hex} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden flex">
                {/* Swatch */}
                <div className="w-20 flex-shrink-0 flex items-center justify-center"
                  style={{ background: c.hex }}>
                  <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition">
                    {c.hex}
                  </span>
                </div>
                {/* Info */}
                <div className="p-4 flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1918] mb-0.5">{c.name}</p>
                  <div className="flex items-center gap-1 mb-1">
                    <code className="text-xs font-mono text-zinc-500">{c.hex}</code>
                    <CopyBtn value={c.hex}/>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <code className="text-xs font-mono text-zinc-400">rgb({c.rgb})</code>
                    <CopyBtn value={`rgb(${c.rgb})`}/>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{c.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GUIDELINES ── */}
      {tab === 'guidelines' && (
        <div className="space-y-4">
          {[
            { emoji: '✅', title: 'Logo — Do', items: [
              'Use landscape white on dark (#1A1918) backgrounds — emails, portals',
              'Use landscape black on white/light (#FAF9F7) — PDFs, contracts, print',
              'Use square gradient as profile picture on ALL social platforms (Instagram, Facebook, LinkedIn, WhatsApp)',
              'Keep a minimum clear space equal to the height of the "B" in BALI on all sides',
              'Always use the supplied SVG or high-res PNG — never re-export from a screen capture',
            ]},
            { emoji: '❌', title: 'Logo — Don\'t', items: [
              'Never stretch, rotate, skew, or distort the logo in any way',
              'Never add drop shadows, gradients, or outlines to the logo',
              'Never place the logo on busy or coloured backgrounds without a solid container',
              'Never recreate the logo in a different font, weight, or layout',
              'Never use "Sunny Interns" — the only brand name is Bali Interns',
            ]},
            { emoji: '✏️', title: 'Typography', items: [
              '"BALI" — Sapiens Bold, letter-spacing 3%, uppercase',
              '"INTERNS" — Bebas Neue Pro Regular, letter-spacing 10%, uppercase',
              'Body text — Helvetica Neue, Arial, sans-serif (emails and OS)',
              'Documents — Georgia or Times New Roman for formal/legal content',
              'Never mix the two logo fonts in body text — they are for logo use only',
            ]},
            { emoji: '📧', title: 'Emails', items: [
              'Header: landscape white logo on #1A1918 dark strip (height 28px display)',
              'Body background: white #FFFFFF, text: #1A1918',
              'CTA buttons: #C8A96E gold, white text, 8px border-radius',
              'Info boxes: #F9F7F4 background, 4px left border #C8A96E',
              'Footer: #F4F3F1 background, small text "Bali Interns — bali-interns.com"',
              'From address: team@bali-interns.com — never use @sunny-interns or personal addresses',
            ]},
            { emoji: '📱', title: 'Social media', items: [
              'Profile picture: square gradient logo (800×800px) on all platforms',
              'Post accent color: yellow gradient #F5A623 → #E8930A',
              'Always mention "Bali Interns" — not "Bali Intern" or "BaliInterns"',
              'Hashtags: #BaliInterns #StageABali #InternshipBali #VIEBali',
              'Handle: @baliinterns (check and secure on each new platform)',
            ]},
            { emoji: '📄', title: 'Documents & PDFs', items: [
              'Landscape black logo on white, top-left corner',
              'Gold accent #C8A96E for section headers, borders, and table highlights',
              'Font: Times New Roman or Georgia for formal contracts and legal documents',
              'Footer: "Bali Interns — bali-interns.com — team@bali-interns.com"',
              'Company name in documents: "Bali Interns" (full entity name only when required by law)',
            ]},
          ].map(s => (
            <div key={s.title} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-[#1a1918] mb-3">{s.emoji} {s.title}</p>
              <ul className="space-y-1.5">
                {s.items.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-2.5">
                    <span className="text-zinc-300 flex-shrink-0 mt-0.5 font-bold">·</span>
                    <span>{item}</span>
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
