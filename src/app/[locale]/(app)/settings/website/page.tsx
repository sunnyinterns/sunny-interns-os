'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Types
interface Page { id: string; slug: string; title_en: string; title_fr: string | null; enabled: boolean; seo_title_en: string | null; seo_title_fr: string | null }
interface Section { id: string; page_slug: string; section_type: string; display_order: number; enabled: boolean; config: Record<string, unknown>; }
interface Translation { id: string; key: string; en: string; fr: string; context: string | null; [lang: string]: string | null }
interface ContentItem { id: string; section_key: string; content_type: string; value: string; label: string | null; description: string | null }

const SECTION_LABELS: Record<string, { icon: string; name: string; desc: string }> = {
  hero: { icon: '🏔️', name: 'Hero', desc: 'Video/photo background + headline + CTA' },
  trust: { icon: '🛡️', name: 'Trust', desc: 'Proof cards + school logos carousel' },
  stats_bar: { icon: '📊', name: 'Stats Bar', desc: 'Animated counters (370, 54, 22...)' },
  top_roles: { icon: '📣', name: 'Top Roles', desc: 'Marketing / Communication / Business Dev' },
  employer_types: { icon: '🏢', name: 'Employer Types', desc: '6 industry categories' },
  process: { icon: '🚀', name: 'Process', desc: '4 steps: Apply → Call → Agreement → Arrive' },
  gallery: { icon: '🖼️', name: 'Bali Gallery', desc: '6 photos linked to blog articles' },
  testimonials: { icon: '💬', name: 'Testimonials', desc: 'Rotating quote carousel' },
  video_testimonials: { icon: '🎬', name: 'Video Testimonials', desc: '3 video cards' },
  simulator_teaser: { icon: '🧭', name: 'Simulator Teaser', desc: 'Dark CTA section → simulator' },
  sectors: { icon: '🏭', name: 'Industry Sectors', desc: '8 sectors with company counts' },
  schools: { icon: '🎓', name: 'Schools', desc: 'Schools represented with intern counts' },
  nationalities: { icon: '🌍', name: 'Nationalities', desc: '20 flags + counts' },
  success_callout: { icon: '🏆', name: 'Success Callout', desc: 'Dark banner → success stories' },
  pricing: { icon: '💰', name: 'Pricing', desc: '€990 spotlight card' },
  faq_teaser: { icon: '❓', name: 'FAQ Teaser', desc: '6 inline questions' },
  blog_featured: { icon: '📝', name: 'Blog Featured', desc: '3 latest blog posts' },
  newsletter: { icon: '📧', name: 'Newsletter', desc: 'Email capture form' },
  cta_final: { icon: '🎯', name: 'Final CTA', desc: 'Closing call to action' },
}

const LANGS = [
  { code: 'en', flag: '🇬🇧', name: 'English' }, { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish' }, { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'pt', flag: '🇵🇹', name: 'Portuguese' }, { code: 'it', flag: '🇮🇹', name: 'Italian' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch' }, { code: 'pl', flag: '🇵🇱', name: 'Polish' },
  { code: 'sv', flag: '🇸🇪', name: 'Swedish' }, { code: 'da', flag: '🇩🇰', name: 'Danish' },
  { code: 'ro', flag: '🇷🇴', name: 'Romanian' }, { code: 'cs', flag: '🇨🇿', name: 'Czech' },
  { code: 'hu', flag: '🇭🇺', name: 'Hungarian' }, { code: 'el', flag: '🇬🇷', name: 'Greek' },
  { code: 'bg', flag: '🇧🇬', name: 'Bulgarian' }, { code: 'hr', flag: '🇭🇷', name: 'Croatian' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovak' }, { code: 'fi', flag: '🇫🇮', name: 'Finnish' },
  { code: 'no', flag: '🇳🇴', name: 'Norwegian' }, { code: 'lt', flag: '🇱🇹', name: 'Lithuanian' },
  { code: 'lv', flag: '🇱🇻', name: 'Latvian' }, { code: 'et', flag: '🇪🇪', name: 'Estonian' },
  { code: 'sl', flag: '🇸🇮', name: 'Slovenian' },
]

const AVAILABLE_BLOCKS = Object.keys(SECTION_LABELS)

type Tab = 'sections' | 'pages' | 'translations' | 'media'

export default function WebsiteCMSPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [tab, setTab] = useState<Tab>('sections')
  const [pages, setPages] = useState<Page[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [translations, setTranslations] = useState<Translation[]>([])
  const [media, setMedia] = useState<ContentItem[]>([])
  const [selectedPage, setSelectedPage] = useState('/')
  const [loading, setLoading] = useState(true)
  const [activeLangs, setActiveLangs] = useState<Set<string>>(new Set(['en', 'fr', 'es', 'de', 'it']))
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [pRes, sRes, tRes, mRes] = await Promise.all([
      fetch('/api/website-pages'),
      fetch(`/api/website-sections?page=${encodeURIComponent(selectedPage)}`),
      fetch('/api/website-translations'),
      fetch('/api/website-content'),
    ])
    if (pRes.status === 401) { router.push('/auth/login'); return }
    setPages(pRes.ok ? await pRes.json() : [])
    setSections(sRes.ok ? await sRes.json() : [])
    setTranslations(tRes.ok ? await tRes.json() : [])
    setMedia(mRes.ok ? await mRes.json() : [])
    setLoading(false)
  }, [selectedPage, router])

  useEffect(() => { fetchAll() }, [fetchAll])

  function flash(id: string) { setSaved(id); setTimeout(() => setSaved(null), 2000) }

  async function toggleSection(s: Section) {
    setSaving(s.id)
    await fetch('/api/website-sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, enabled: !s.enabled }) })
    flash(s.id); setSaving(null); fetchAll()
  }

  async function moveSection(s: Section, dir: -1 | 1) {
    const sorted = [...sections].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(x => x.id === s.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      fetch('/api/website-sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, display_order: other.display_order }) }),
      fetch('/api/website-sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: other.id, display_order: s.display_order }) }),
    ])
    fetchAll()
  }

  async function addBlock(type: string) {
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.display_order), 0)
    await fetch('/api/website-sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page_slug: selectedPage, section_type: type, display_order: maxOrder + 1, enabled: true, config: {} }) })
    fetchAll()
  }

  async function removeSection(s: Section) {
    if (!confirm(`Remove "${SECTION_LABELS[s.section_type]?.name || s.section_type}" from this page?`)) return
    await fetch('/api/website-sections', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
    fetchAll()
  }

  async function togglePage(p: Page) {
    await fetch('/api/website-pages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, enabled: !p.enabled }) })
    flash(p.id); fetchAll()
  }

  async function saveTranslation(t: Translation, field: string, value: string) {
    setSaving(t.id)
    await fetch('/api/website-translations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, [field]: value }) })
    flash(t.id); setSaving(null); fetchAll()
  }

  async function saveMedia(key: string, value: string) {
    setSaving(key)
    await fetch('/api/website-content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section_key: key, value }) })
    flash(key); setSaving(null); fetchAll()
  }

  async function uploadMediaFile(key: string, file: File) {
    setSaving(key)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const fileName = `${key.replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('website-assets').upload(fileName, file, { upsert: true })
    if (error) { alert('Upload failed: ' + error.message); setSaving(null); return }
    const { data: urlData } = supabase.storage.from('website-assets').getPublicUrl(fileName)
    await fetch('/api/website-content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section_key: key, value: urlData.publicUrl }) })
    flash(key); setSaving(null); fetchAll()
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-400">Loading CMS...</div>

  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: 'sections', icon: '🧱', label: 'Sections' },
    { key: 'pages', icon: '📄', label: 'Pages' },
    { key: 'translations', icon: '🌍', label: 'Translations' },
    { key: 'media', icon: '📁', label: 'Media & Assets' },
  ]

  const visibleLangs = LANGS.filter(l => activeLangs.has(l.code))
  const toggleLang = (code: string) => setActiveLangs(prev => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n })

  const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order)
  const usedTypes = new Set(sections.map(s => s.section_type))
  const availableToAdd = AVAILABLE_BLOCKS.filter(t => !usedTypes.has(t))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Website CMS</h1>
          <p className="text-sm text-zinc-500 mt-1">Full control over bali-interns.com</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/settings/website/blog`} className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl hover:border-[#c8a96e] transition-colors no-underline">📝 Blog</Link>
          <a href="https://bali-interns-website.vercel.app" target="_blank" rel="noopener" className="text-xs font-bold bg-[#c8a96e] text-white px-4 py-2 rounded-xl hover:bg-[#b8994e] transition-colors no-underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Preview site
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-2xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all border-none cursor-pointer ${tab === t.key ? 'bg-white text-[#1a1918] shadow-sm' : 'bg-transparent text-zinc-400 hover:text-zinc-600'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ==================== SECTIONS TAB ==================== */}
      {tab === 'sections' && (
        <div className="space-y-4">
          {/* Page selector */}
          <div className="flex gap-2 flex-wrap">
            {pages.filter(p => p.enabled).map(p => (
              <button key={p.slug} onClick={() => setSelectedPage(p.slug)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${selectedPage === p.slug ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-500 border-zinc-200 hover:border-[#c8a96e]'}`}>
                {p.title_en} <span className="text-[10px] opacity-60">{p.slug}</span>
              </button>
            ))}
          </div>

          {/* Section list */}
          <div className="space-y-2">
            {sortedSections.map((s, i) => {
              const meta = SECTION_LABELS[s.section_type] || { icon: '📦', name: s.section_type, desc: 'Custom block' }
              return (
                <div key={s.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all ${s.enabled ? 'border-zinc-100' : 'border-zinc-100 opacity-50'}`}>
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(s, -1)} disabled={i === 0} className="text-[10px] w-6 h-5 rounded bg-zinc-100 hover:bg-zinc-200 disabled:opacity-20 border-none cursor-pointer">▲</button>
                    <span className="text-[10px] text-zinc-300 text-center">{s.display_order}</span>
                    <button onClick={() => moveSection(s, 1)} disabled={i === sortedSections.length - 1} className="text-[10px] w-6 h-5 rounded bg-zinc-100 hover:bg-zinc-200 disabled:opacity-20 border-none cursor-pointer">▼</button>
                  </div>
                  {/* Icon + info */}
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1a1918]">{meta.name}</p>
                    <p className="text-[11px] text-zinc-400">{meta.desc}</p>
                  </div>
                  {/* Toggle */}
                  <button onClick={() => toggleSection(s)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${s.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>
                    {saving === s.id ? '...' : s.enabled ? '● ON' : '○ OFF'}
                  </button>
                  {/* Remove */}
                  <button onClick={() => removeSection(s)} className="text-xs text-zinc-300 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors">✕</button>
                  {saved === s.id && <span className="text-[10px] text-green-600 font-bold">✓</span>}
                </div>
              )
            })}
          </div>

          {/* Add block */}
          {availableToAdd.length > 0 && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">+ Add a section</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableToAdd.map(type => {
                  const meta = SECTION_LABELS[type] || { icon: '📦', name: type, desc: '' }
                  return (
                    <button key={type} onClick={() => addBlock(type)}
                      className="text-left bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-3 hover:border-[#c8a96e] hover:bg-amber-50/30 transition-all cursor-pointer">
                      <span className="text-lg">{meta.icon}</span>
                      <p className="text-xs font-bold text-zinc-600 mt-1">{meta.name}</p>
                      <p className="text-[10px] text-zinc-400">{meta.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== PAGES TAB ==================== */}
      {tab === 'pages' && (
        <div className="space-y-2">
          {pages.map(p => (
            <div key={p.id} className={`bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4 ${!p.enabled ? 'opacity-50' : ''}`}>
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1918]">{p.title_en} {p.title_fr ? `/ ${p.title_fr}` : ''}</p>
                <p className="text-[11px] text-zinc-400 font-mono">{p.slug}</p>
              </div>
              <a href={`https://bali-interns-website.vercel.app${p.slug}`} target="_blank" rel="noopener" className="text-[10px] text-[#c8a96e] no-underline hover:underline">Preview →</a>
              <button onClick={() => togglePage(p)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${p.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>
                {p.enabled ? '● Enabled' : '○ Disabled'}
              </button>
              {saved === p.id && <span className="text-[10px] text-green-600 font-bold">✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* ==================== TRANSLATIONS TAB ==================== */}
      {tab === 'translations' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-3">
            💡 23 European languages available. Toggle which ones to display. Edit inline — saves on blur.
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => toggleLang(l.code)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${activeLangs.has(l.code) ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-400 border-zinc-200 hover:border-[#c8a96e]'}`}>
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-[160px] sticky left-0 bg-white z-10">Key</th>
                  {visibleLangs.map(l => (
                    <th key={l.code} className="text-left py-2 px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider min-w-[180px]">{l.flag} {l.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {translations.map(t => (
                  <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="py-1.5 px-2 font-mono text-[10px] text-zinc-400 align-top sticky left-0 bg-white z-10">{t.key}</td>
                    {visibleLangs.map(l => (
                      <td key={l.code} className="py-1.5 px-2 align-top">
                        <input defaultValue={(t as Record<string, string>)[l.code] || ''} onBlur={e => { if (e.target.value !== (t as Record<string, string>)[l.code]) saveTranslation(t, l.code, e.target.value) }}
                          className="w-full text-xs border border-transparent hover:border-zinc-200 focus:border-[#c8a96e] rounded-lg px-2 py-1 focus:outline-none bg-transparent" />
                      </td>
                    ))}
                    {saved === t.id && <td className="text-green-600 font-bold text-[10px]">✓</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MEDIA TAB ==================== */}
      {tab === 'media' && (
        <div className="space-y-3">
          {media.map(item => (
            <div key={item.section_key} className="bg-white border border-zinc-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1918]">{item.label || item.section_key}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] font-mono bg-zinc-50 text-zinc-400 px-1.5 py-0.5 rounded">{item.section_key}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.content_type === 'video' ? 'bg-purple-50 text-purple-600' : item.content_type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-50 text-zinc-500'}`}>{item.content_type}</span>
                  </div>
                  {item.description && <p className="text-[10px] text-zinc-400 mt-1">{item.description}</p>}
                </div>
                {saved === item.section_key && <span className="text-xs text-green-600 font-bold">✓ Saved</span>}
              </div>
              <div className="mt-3 flex gap-2 items-center">
                <input defaultValue={item.value} onBlur={e => { if (e.target.value !== item.value) saveMedia(item.section_key, e.target.value) }}
                  className="flex-1 text-xs font-mono border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" placeholder="Paste URL or upload..." />
                <label className="text-xs font-semibold border border-zinc-200 px-3 py-2 rounded-xl hover:border-[#c8a96e] transition-colors cursor-pointer">
                  {saving === item.section_key ? '⏳' : '📁 Upload'}
                  <input type="file" className="hidden" accept={item.content_type === 'video' ? 'video/*' : 'image/*'}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadMediaFile(item.section_key, f) }} />
                </label>
              </div>
              {item.value && item.content_type === 'image' && <img src={item.value} alt="" className="h-16 rounded-lg mt-2 border border-zinc-100 object-cover" />}
              {item.value && item.content_type === 'video' && <video src={item.value} className="h-20 rounded-lg mt-2 border border-zinc-100" muted controls />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
