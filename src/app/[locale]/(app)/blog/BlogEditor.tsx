'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'draft' | 'review' | 'published' | 'archived'
type Category = 'living-in-bali' | 'preparing-internship' | 'internships-careers' | 'visa-admin' | 'agency'

export interface BlogPostFull {
  id?: string
  slug: string
  title_en: string
  title_fr: string | null
  body_en: string
  body_fr: string | null
  excerpt_en: string | null
  excerpt_fr: string | null
  seo_title_en: string | null
  seo_title_fr: string | null
  seo_desc_en: string | null
  seo_desc_fr: string | null
  category: Category | null
  tags: string[] | null
  cover_image_url: string | null
  cover_image_prompt?: string | null
  author_name: string | null
  status: Status
  featured: boolean | null
  reading_time_min: number | null
  published_at?: string | null
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'living-in-bali', label: 'Living in Bali' },
  { value: 'preparing-internship', label: 'Preparing internship' },
  { value: 'internships-careers', label: 'Internships & careers' },
  { value: 'visa-admin', label: 'Visa & admin' },
  { value: 'agency', label: 'Agency' },
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

const EMPTY: BlogPostFull = {
  slug: '', title_en: '', title_fr: '',
  body_en: '', body_fr: '',
  excerpt_en: '', excerpt_fr: '',
  seo_title_en: '', seo_title_fr: '',
  seo_desc_en: '', seo_desc_fr: '',
  category: null, tags: [],
  cover_image_url: '',
  cover_image_prompt: null,
  author_name: '',
  status: 'draft', featured: false, reading_time_min: null,
}

export function BlogEditor({ locale, initial }: { locale: string; initial?: BlogPostFull | null }) {
  const router = useRouter()
  const [form, setForm] = useState<BlogPostFull>(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [slugDirty, setSlugDirty] = useState(Boolean(initial?.slug))
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [bgPrompt, setBgPrompt] = useState(initial?.cover_image_prompt ?? '')
  const [bgPromptDirty, setBgPromptDirty] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverError, setCoverError] = useState<string | null>(null)

  function autoBuildPrompt(title: string, cat: string) {
    return `Professional blog cover photograph for an article titled "${title}" about internships in Bali, Indonesia. Category: ${cat}. Style: warm tropical light, cinematic, editorial photography, golden hour, lush greenery, ocean or rice terraces in background. High quality, vibrant colors, no text, no people, 16:9 landscape.`
  }

  async function generateCover() {
    if (!form.title_en) return
    setCoverError(null)
    setGeneratingCover(true)
    try {
      const prompt = bgPrompt.trim() || autoBuildPrompt(form.title_en, form.category ?? 'living-in-bali')
      const res = await fetch('/api/ai/generate-blog-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title_en,
          category: form.category ?? 'living-in-bali',
          slug: form.slug || 'draft',
          post_id: form.id,
          prompt,
        }),
      })
      const d = await res.json() as { url?: string; error?: string; prompt?: string }
      if (!res.ok || !d.url) { setCoverError(d.error ?? 'Erreur génération'); return }
      setForm(p => ({ ...p, cover_image_url: d.url ?? p.cover_image_url, cover_image_prompt: prompt }))
      setBgPrompt(prompt)
      setBgPromptDirty(false)
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setGeneratingCover(false)
    }
  }

  useEffect(() => {
    if (!slugDirty && form.title_en) {
      setForm(p => ({ ...p, slug: slugify(p.title_en) }))
    }
  }, [form.title_en, slugDirty])

  const readingTime = useMemo(() => {
    const words = (form.body_en || '').trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 200))
  }, [form.body_en])

  const autoExcerpt = useMemo(() => {
    if (form.excerpt_en?.trim()) return form.excerpt_en
    const stripped = (form.body_en || '').replace(/[#*_`>\[\]()]/g, '').trim()
    return stripped.slice(0, 200)
  }, [form.body_en, form.excerpt_en])

  function set<K extends keyof BlogPostFull>(key: K, value: BlogPostFull[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function save(publish: boolean) {
    if (!form.title_en.trim()) {
      alert('Le titre EN est requis')
      return
    }
    if (!form.slug.trim()) {
      alert('Le slug est requis')
      return
    }
    setSaving(true)
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const payload: Record<string, unknown> = {
      slug: form.slug,
      title_en: form.title_en,
      title_fr: form.title_fr || null,
      body_en: form.body_en,
      body_fr: form.body_fr || null,
      excerpt_en: (form.excerpt_en?.trim() ? form.excerpt_en : autoExcerpt) || null,
      excerpt_fr: form.excerpt_fr || null,
      seo_title_en: form.seo_title_en || null,
      seo_title_fr: form.seo_title_fr || null,
      seo_desc_en: form.seo_desc_en || null,
      seo_desc_fr: form.seo_desc_fr || null,
      category: form.category,
      tags,
      cover_image_url: form.cover_image_url || null,
      author_name: form.author_name || null,
      featured: Boolean(form.featured),
      reading_time_min: form.reading_time_min ?? readingTime,
      status: publish ? 'published' : (form.status === 'published' ? 'published' : form.status),
    }

    const url = form.id ? `/api/blog-posts/${form.id}` : '/api/blog-posts'
    const method = form.id ? 'PATCH' : 'POST'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      alert('Erreur: ' + (err.error ?? r.statusText))
      setSaving(false)
      return
    }

    const saved = await r.json() as BlogPostFull & { id: string }
    setSaving(false)
    if (!form.id) {
      router.replace(`/${locale}/blog/${saved.id}/edit`)
    } else {
      setForm(p => ({ ...p, ...saved }))
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/blog`)}
            className="text-sm text-zinc-500 hover:text-[#c8a96e]"
          >
            ← Blog
          </button>
          <h1 className="text-xl font-bold text-[#1a1918]">
            {form.id ? 'Éditer l\'article' : 'Nouvel article'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {form.id && (
            <a
              href={`https://bali-interns-website.vercel.app/blog/${form.slug}`}
              target="_blank"
              rel="noopener"
              className="px-3 py-2 text-sm border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50"
            >
              Prévisualiser ↗
            </a>
          )}
          <button
            disabled={saving}
            onClick={() => save(false)}
            className="px-3 py-2 text-sm border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
          >
            {saving ? '…' : 'Save draft'}
          </button>
          <button
            disabled={saving}
            onClick={() => save(true)}
            className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] disabled:opacity-50"
          >
            {form.status === 'published' ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Titre EN *</label>
              <input
                className={inputCls}
                value={form.title_en}
                onChange={e => set('title_en', e.target.value)}
                placeholder="Article title in English"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Slug *</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-mono">/blog/</span>
                <input
                  className={`${inputCls} font-mono`}
                  value={form.slug}
                  onChange={e => { setSlugDirty(true); set('slug', slugify(e.target.value)) }}
                />
                <button
                  type="button"
                  onClick={() => { setSlugDirty(false); set('slug', slugify(form.title_en)) }}
                  className="text-xs text-zinc-400 hover:text-[#c8a96e]"
                  title="Regénérer depuis le titre"
                >
                  ↻
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Titre FR</label>
              <input
                className={inputCls}
                value={form.title_fr ?? ''}
                onChange={e => set('title_fr', e.target.value)}
                placeholder="Titre de l'article en français"
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1a1918]">Contenu EN (Markdown)</h2>
              <span className="text-[10px] text-zinc-400">
                {readingTime} min · {(form.body_en || '').split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={18}
              value={form.body_en}
              onChange={e => set('body_en', e.target.value)}
              placeholder="# Heading&#10;&#10;Your markdown here…"
            />
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Excerpt EN <span className="text-zinc-400 text-[10px]">(auto-généré si vide)</span>
              </label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.excerpt_en ?? ''}
                onChange={e => set('excerpt_en', e.target.value)}
                placeholder={autoExcerpt ? `Auto: ${autoExcerpt.slice(0, 80)}…` : ''}
              />
            </div>
          </div>

          <details className="bg-white border border-zinc-100 rounded-xl p-5">
            <summary className="text-sm font-semibold text-[#1a1918] cursor-pointer">Contenu FR</summary>
            <div className="pt-4 space-y-3">
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={12}
                value={form.body_fr ?? ''}
                onChange={e => set('body_fr', e.target.value)}
                placeholder="Contenu Markdown en français"
              />
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Excerpt FR</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.excerpt_fr ?? ''}
                  onChange={e => set('excerpt_fr', e.target.value)}
                />
              </div>
            </div>
          </details>

          <details className="bg-white border border-zinc-100 rounded-xl p-5">
            <summary className="text-sm font-semibold text-[#1a1918] cursor-pointer">SEO</summary>
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">SEO title EN</label>
                <input className={inputCls} value={form.seo_title_en ?? ''} onChange={e => set('seo_title_en', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">SEO title FR</label>
                <input className={inputCls} value={form.seo_title_fr ?? ''} onChange={e => set('seo_title_fr', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">SEO description EN</label>
                <textarea className={inputCls} rows={2} value={form.seo_desc_en ?? ''} onChange={e => set('seo_desc_en', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">SEO description FR</label>
                <textarea className={inputCls} rows={2} value={form.seo_desc_fr ?? ''} onChange={e => set('seo_desc_fr', e.target.value)} />
              </div>
            </div>
          </details>
        </div>

        <aside className="space-y-5">
          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#1a1918]">Publication</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Statut</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={e => set('status', e.target.value as Status)}
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={e => set('featured', e.target.checked)}
              />
              <span className="text-xs">⭐ Featured</span>
            </label>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Temps de lecture (min)</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={form.reading_time_min ?? readingTime}
                onChange={e => set('reading_time_min', e.target.value ? Number(e.target.value) : null)}
              />
              <p className="text-[10px] text-zinc-400 mt-1">Auto: {readingTime} min</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Auteur</label>
              <input
                className={inputCls}
                value={form.author_name ?? ''}
                onChange={e => set('author_name', e.target.value)}
                placeholder="Nom de l'auteur"
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#1a1918]">Classification</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
              <select
                className={inputCls}
                value={form.category ?? ''}
                onChange={e => set('category', (e.target.value || null) as Category | null)}
              >
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Tags</label>
              <input
                className={inputCls}
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="bali, visa, internship"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Séparés par des virgules</p>
            </div>
          </div>

          {/* ── COVER IMAGE ── */}
          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1a1918]">🎨 Cover image</h2>
              {form.cover_image_url && (
                <button onClick={() => setForm(p => ({...p, cover_image_url: null}))}
                  className="text-[10px] text-zinc-400 hover:text-red-500">✕ Supprimer</button>
              )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prompt image</label>
                <button onClick={() => { setBgPrompt(autoBuildPrompt(form.title_en, form.category ?? 'living-in-bali')); setBgPromptDirty(true) }}
                  className="text-[10px] px-2 py-0.5 bg-zinc-100 rounded-lg hover:bg-zinc-200 text-zinc-500">↺ Reset</button>
              </div>
              <textarea
                rows={3}
                value={bgPrompt || autoBuildPrompt(form.title_en || 'Blog post', form.category ?? 'living-in-bali')}
                onChange={e => { setBgPrompt(e.target.value); setBgPromptDirty(true) }}
                className="w-full text-xs text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono"
              />
            </div>

            {/* Error */}
            {coverError && (
              <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
                <span>{coverError}</span>
                <button onClick={() => setCoverError(null)} className="ml-2">×</button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {bgPromptDirty && form.id && (
                <button
                  onClick={async () => {
                    await fetch(`/api/blog-posts/${form.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({cover_image_prompt: bgPrompt}) })
                    setBgPromptDirty(false)
                  }}
                  className="text-[11px] px-3 py-1.5 bg-[#c8a96e] text-white rounded-xl font-bold hover:bg-[#b8945a]">
                  💾 Sauver prompt
                </button>
              )}
              <button onClick={() => void generateCover()} disabled={generatingCover || !form.title_en}
                className="text-[11px] px-4 py-1.5 bg-[#1a1918] text-white rounded-xl font-bold disabled:opacity-40 hover:bg-zinc-800">
                {generatingCover ? '⏳ Génération…' : form.cover_image_url ? '🔄 Régénérer' : '✨ Générer avec IA'}
              </button>
            </div>

            {/* URL manuelle */}
            <div>
              <label className="text-[10px] font-medium text-zinc-400 mb-1 block">Ou coller une URL</label>
              <input className={inputCls} value={form.cover_image_url ?? ''} onChange={e => set('cover_image_url', e.target.value)} placeholder="https://…" />
            </div>

            {/* Background preview */}
            {form.cover_image_url && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">📸 Background</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.cover_image_url} alt="" className="w-full aspect-video object-cover rounded-xl border border-zinc-100" />
              </div>
            )}

            {/* Blog card preview */}
            {form.cover_image_url && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🃏 Blog card (preview)</p>
                <div className="relative w-full aspect-[1200/630] rounded-xl overflow-hidden border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(5,4,4,0.98) 50%, rgba(10,8,6,0.55) 78%, rgba(0,0,0,0.1) 100%)'}} />
                  {/* Top: logo + category centré */}
                  <div className="absolute top-3 left-0 right-0 flex flex-col items-center gap-1.5">
                    <div className="flex items-center px-4 py-2 rounded-full border border-white/30 bg-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png" alt="Bali Interns" style={{height:20, width:'auto', filter:'brightness(0) invert(1)'}} />
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/60">
                      <span className="text-amber-200 text-[8px] font-bold uppercase tracking-widest">{form.category ?? 'blog'}</span>
                    </div>
                  </div>
                  {/* Bottom: titre massif centré */}
                  <div className="absolute inset-0 flex items-end justify-center pb-5 px-5">
                    <div style={{width:"100%", textAlign:"center"}}>
                      <p className="text-white font-black leading-tight" style={{fontSize: form.title_en.length > 80 ? 12 : form.title_en.length > 60 ? 15 : form.title_en.length > 40 ? 18 : 22, textShadow:'0 3px 16px rgba(0,0,0,1)'}}>
                        {form.title_en || "Article title"}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                        <span className="text-white/55 text-[9px]">bali-interns.com/blog</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a href={`/api/og/blog-card?title=${encodeURIComponent(form.title_en)}&category=${encodeURIComponent(form.category ?? 'blog')}&bg=${encodeURIComponent(form.cover_image_url)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-amber-700 hover:underline no-underline">
                  → Ouvrir la vraie blog-card OG (1200×630) ↗
                </a>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
