'use client'
import React from 'react'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BlogPost {
  id: string; slug: string; title_en: string; title_fr: string | null
  excerpt_en: string | null; excerpt_fr: string | null
  body_en: string | null; body_fr: string | null
  seo_title_en: string | null; seo_title_fr: string | null
  seo_desc_en: string | null; seo_desc_fr: string | null
  category: string; tags: string[]; cover_image_url: string | null; cover_image_prompt: string | null
  author_name: string; status: string
  created_at: string; updated_at: string
  [key: string]: unknown // for dynamic locale fields
}

const LANGS = [
  { code: 'en', flag: '🇬🇧', name: 'EN' }, { code: 'fr', flag: '🇫🇷', name: 'FR' },
  { code: 'es', flag: '🇪🇸', name: 'ES' }, { code: 'de', flag: '🇩🇪', name: 'DE' },
  { code: 'pt', flag: '🇵🇹', name: 'PT' }, { code: 'it', flag: '🇮🇹', name: 'IT' },
  { code: 'nl', flag: '🇳🇱', name: 'NL' }, { code: 'pl', flag: '🇵🇱', name: 'PL' },
  { code: 'sv', flag: '🇸🇪', name: 'SV' }, { code: 'da', flag: '🇩🇰', name: 'DA' },
  { code: 'ro', flag: '🇷🇴', name: 'RO' }, { code: 'cs', flag: '🇨🇿', name: 'CS' },
]

function buildAutoPrompt(title: string, category: string): string {
  return `Professional blog cover photograph for an article titled "${title}" about internships in Bali, Indonesia. Category: ${category}. Style: warm tropical light, cinematic, editorial photography, golden hour, lush greenery, ocean or rice terraces in background. High quality, vibrant colors, no text, no people, 16:9 landscape.`
}


// Pure CSS blog card preview
function BlogCardPreview({ post }: { post: BlogPost }) {
  const category = (post.category || 'guide').replace(/-/g, ' ')
  const fs = post.title_en.length > 80 ? 15 : post.title_en.length > 60 ? 19 : post.title_en.length > 40 ? 23 : 28
  return (
    <div className="relative w-full aspect-[1200/630] rounded-xl overflow-hidden border border-zinc-200 bg-[#1a1918]">
      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {/* Deep gradient */}
      <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(5,4,4,0.98) 50%, rgba(10,8,6,0.55) 78%, rgba(0,0,0,0.1) 100%)'}} />
      {/* Top: logo centré + category badge */}
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-2">
        <div className="flex items-center px-5 py-2.5 rounded-full bg-white/15 border border-white/30" style={{backdropFilter:'blur(6px)'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png" alt="Bali Interns" style={{height:24, width:'auto', filter:'brightness(0) invert(1)'}} />
        </div>
        <div className="px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400/60">
          <span className="text-amber-200 font-bold uppercase tracking-widest" style={{fontSize:9}}>{category}</span>
        </div>
      </div>
      {/* Center: title — massif et centré */}
      <div className="absolute inset-0 flex items-end justify-center pb-5 px-5">
        <div style={{width:"100%", display:"flex", flexDirection:"column", alignItems:"center"}}>
          <p className="text-white font-black leading-tight" style={{textAlign:"center", fontSize:fs, textShadow:'0 3px 16px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,0.9)'}}>
            {post.title_en || "Article title"}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-white/55 font-medium" style={{fontSize:10}}>bali-interns.com/blog</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BlogManagerPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [promptEditor, setPromptEditor] = useState<{ postId: string; prompt: string } | null>(null)
  const [promptDirty, setPromptDirty] = useState(false)
  const [editLang, setEditLang] = useState('en')
  const [translating, setTranslating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadPostId = useRef<string | null>(null)

  const fetchPosts = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    setPosts((data as BlogPost[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  function flash(id: string) { setSaved(id); setTimeout(() => setSaved(null), 2000) }

  async function savePost(id: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('blog_posts').update({ ...editData, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else { flash(id); setEditing(null); fetchPosts() }
    setSaving(false)
  }

  async function toggleStatus(post: BlogPost) {
    const supabase = createClient()
    await supabase.from('blog_posts').update({ status: post.status === 'published' ? 'draft' : 'published' }).eq('id', post.id)
    fetchPosts()
  }

  async function uploadCover(postId: string, file: File) {
    setUploading(postId)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const fileName = `blog-cover-${postId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('website-assets').upload(fileName, file, { upsert: true })
    if (error) { alert('Upload failed: ' + error.message); setUploading(null); return }
    const { data: urlData } = supabase.storage.from('website-assets').getPublicUrl(fileName)
    await supabase.from('blog_posts').update({ cover_image_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('id', postId)
    flash(postId); setUploading(null)
    if (editing === postId) setEditData(d => ({ ...d, cover_image_url: urlData.publicUrl }))
    fetchPosts()
  }

  async function generateCover(post: BlogPost, customPrompt?: string) {
    setGenerating(post.id)
    try {
      const res = await fetch('/api/ai/generate-blog-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: post.title_en, category: post.category, slug: post.slug }),
      })
      if (!res.ok) {
        // Fallback: use Bali Interns branded card
        const fallbackUrl = `/api/og/blog-card?title=${encodeURIComponent(post.title_en)}&category=${encodeURIComponent(post.category)}`
        const supabase = createClient()
        await supabase.from('blog_posts').update({ cover_image_url: fallbackUrl, updated_at: new Date().toISOString() }).eq('id', post.id)
        flash(post.id); fetchPosts()
      } else {
        const data = await res.json()
        if (data.url) {
          const supabase = createClient()
          await supabase.from('blog_posts').update({ cover_image_url: data.url, updated_at: new Date().toISOString() }).eq('id', post.id)
          flash(post.id); fetchPosts()
        }
      }
    } catch {
      alert('AI generation failed — using branded fallback')
    }
    setGenerating(null)
  }

  function startEdit(p: BlogPost) {
    setEditing(p.id)
    setEditData({
      title_en: (p as Record<string,unknown>).title_en as string ?? '',
      title_fr: (p as Record<string,unknown>).title_fr as string ?? '',
      title_es: (p as Record<string,unknown>).title_es as string ?? '',
      title_de: (p as Record<string,unknown>).title_de as string ?? '',
      title_pt: (p as Record<string,unknown>).title_pt as string ?? '',
      title_it: (p as Record<string,unknown>).title_it as string ?? '',
      title_nl: (p as Record<string,unknown>).title_nl as string ?? '',
      title_pl: (p as Record<string,unknown>).title_pl as string ?? '',
      title_sv: (p as Record<string,unknown>).title_sv as string ?? '',
      title_da: (p as Record<string,unknown>).title_da as string ?? '',
      title_ro: (p as Record<string,unknown>).title_ro as string ?? '',
      title_cs: (p as Record<string,unknown>).title_cs as string ?? '',
      title_hu: (p as Record<string,unknown>).title_hu as string ?? '',
      title_el: (p as Record<string,unknown>).title_el as string ?? '',
      title_bg: (p as Record<string,unknown>).title_bg as string ?? '',
      title_hr: (p as Record<string,unknown>).title_hr as string ?? '',
      title_sk: (p as Record<string,unknown>).title_sk as string ?? '',
      title_fi: (p as Record<string,unknown>).title_fi as string ?? '',
      title_no: (p as Record<string,unknown>).title_no as string ?? '',
      title_lt: (p as Record<string,unknown>).title_lt as string ?? '',
      title_lv: (p as Record<string,unknown>).title_lv as string ?? '',
      title_et: (p as Record<string,unknown>).title_et as string ?? '',
      title_sl: (p as Record<string,unknown>).title_sl as string ?? '',
      excerpt_en: (p as Record<string,unknown>).excerpt_en as string ?? '',
      excerpt_fr: (p as Record<string,unknown>).excerpt_fr as string ?? '',
      excerpt_es: (p as Record<string,unknown>).excerpt_es as string ?? '',
      excerpt_de: (p as Record<string,unknown>).excerpt_de as string ?? '',
      excerpt_pt: (p as Record<string,unknown>).excerpt_pt as string ?? '',
      excerpt_it: (p as Record<string,unknown>).excerpt_it as string ?? '',
      excerpt_nl: (p as Record<string,unknown>).excerpt_nl as string ?? '',
      excerpt_pl: (p as Record<string,unknown>).excerpt_pl as string ?? '',
      excerpt_sv: (p as Record<string,unknown>).excerpt_sv as string ?? '',
      excerpt_da: (p as Record<string,unknown>).excerpt_da as string ?? '',
      excerpt_ro: (p as Record<string,unknown>).excerpt_ro as string ?? '',
      excerpt_cs: (p as Record<string,unknown>).excerpt_cs as string ?? '',
      excerpt_hu: (p as Record<string,unknown>).excerpt_hu as string ?? '',
      excerpt_el: (p as Record<string,unknown>).excerpt_el as string ?? '',
      excerpt_bg: (p as Record<string,unknown>).excerpt_bg as string ?? '',
      excerpt_hr: (p as Record<string,unknown>).excerpt_hr as string ?? '',
      excerpt_sk: (p as Record<string,unknown>).excerpt_sk as string ?? '',
      excerpt_fi: (p as Record<string,unknown>).excerpt_fi as string ?? '',
      excerpt_no: (p as Record<string,unknown>).excerpt_no as string ?? '',
      excerpt_lt: (p as Record<string,unknown>).excerpt_lt as string ?? '',
      excerpt_lv: (p as Record<string,unknown>).excerpt_lv as string ?? '',
      excerpt_et: (p as Record<string,unknown>).excerpt_et as string ?? '',
      excerpt_sl: (p as Record<string,unknown>).excerpt_sl as string ?? '',
      body_en: (p as Record<string,unknown>).body_en as string ?? '',
      body_fr: (p as Record<string,unknown>).body_fr as string ?? '',
      body_es: (p as Record<string,unknown>).body_es as string ?? '',
      body_de: (p as Record<string,unknown>).body_de as string ?? '',
      body_pt: (p as Record<string,unknown>).body_pt as string ?? '',
      body_it: (p as Record<string,unknown>).body_it as string ?? '',
      body_nl: (p as Record<string,unknown>).body_nl as string ?? '',
      body_pl: (p as Record<string,unknown>).body_pl as string ?? '',
      body_sv: (p as Record<string,unknown>).body_sv as string ?? '',
      body_da: (p as Record<string,unknown>).body_da as string ?? '',
      body_ro: (p as Record<string,unknown>).body_ro as string ?? '',
      body_cs: (p as Record<string,unknown>).body_cs as string ?? '',
      body_hu: (p as Record<string,unknown>).body_hu as string ?? '',
      body_el: (p as Record<string,unknown>).body_el as string ?? '',
      body_bg: (p as Record<string,unknown>).body_bg as string ?? '',
      body_hr: (p as Record<string,unknown>).body_hr as string ?? '',
      body_sk: (p as Record<string,unknown>).body_sk as string ?? '',
      body_fi: (p as Record<string,unknown>).body_fi as string ?? '',
      body_no: (p as Record<string,unknown>).body_no as string ?? '',
      body_lt: (p as Record<string,unknown>).body_lt as string ?? '',
      body_lv: (p as Record<string,unknown>).body_lv as string ?? '',
      body_et: (p as Record<string,unknown>).body_et as string ?? '',
      body_sl: (p as Record<string,unknown>).body_sl as string ?? '',
      seo_title_en: (p as Record<string,unknown>).seo_title_en as string ?? '',
      seo_title_fr: (p as Record<string,unknown>).seo_title_fr as string ?? '',
      seo_title_es: (p as Record<string,unknown>).seo_title_es as string ?? '',
      seo_title_de: (p as Record<string,unknown>).seo_title_de as string ?? '',
      seo_title_pt: (p as Record<string,unknown>).seo_title_pt as string ?? '',
      seo_title_it: (p as Record<string,unknown>).seo_title_it as string ?? '',
      seo_title_nl: (p as Record<string,unknown>).seo_title_nl as string ?? '',
      seo_title_pl: (p as Record<string,unknown>).seo_title_pl as string ?? '',
      seo_title_sv: (p as Record<string,unknown>).seo_title_sv as string ?? '',
      seo_title_da: (p as Record<string,unknown>).seo_title_da as string ?? '',
      seo_title_ro: (p as Record<string,unknown>).seo_title_ro as string ?? '',
      seo_title_cs: (p as Record<string,unknown>).seo_title_cs as string ?? '',
      seo_title_hu: (p as Record<string,unknown>).seo_title_hu as string ?? '',
      seo_title_el: (p as Record<string,unknown>).seo_title_el as string ?? '',
      seo_title_bg: (p as Record<string,unknown>).seo_title_bg as string ?? '',
      seo_title_hr: (p as Record<string,unknown>).seo_title_hr as string ?? '',
      seo_title_sk: (p as Record<string,unknown>).seo_title_sk as string ?? '',
      seo_title_fi: (p as Record<string,unknown>).seo_title_fi as string ?? '',
      seo_title_no: (p as Record<string,unknown>).seo_title_no as string ?? '',
      seo_title_lt: (p as Record<string,unknown>).seo_title_lt as string ?? '',
      seo_title_lv: (p as Record<string,unknown>).seo_title_lv as string ?? '',
      seo_title_et: (p as Record<string,unknown>).seo_title_et as string ?? '',
      seo_title_sl: (p as Record<string,unknown>).seo_title_sl as string ?? '',
      seo_desc_en: (p as Record<string,unknown>).seo_desc_en as string ?? '',
      seo_desc_fr: (p as Record<string,unknown>).seo_desc_fr as string ?? '',
      seo_desc_es: (p as Record<string,unknown>).seo_desc_es as string ?? '',
      seo_desc_de: (p as Record<string,unknown>).seo_desc_de as string ?? '',
      seo_desc_pt: (p as Record<string,unknown>).seo_desc_pt as string ?? '',
      seo_desc_it: (p as Record<string,unknown>).seo_desc_it as string ?? '',
      seo_desc_nl: (p as Record<string,unknown>).seo_desc_nl as string ?? '',
      seo_desc_pl: (p as Record<string,unknown>).seo_desc_pl as string ?? '',
      seo_desc_sv: (p as Record<string,unknown>).seo_desc_sv as string ?? '',
      seo_desc_da: (p as Record<string,unknown>).seo_desc_da as string ?? '',
      seo_desc_ro: (p as Record<string,unknown>).seo_desc_ro as string ?? '',
      seo_desc_cs: (p as Record<string,unknown>).seo_desc_cs as string ?? '',
      seo_desc_hu: (p as Record<string,unknown>).seo_desc_hu as string ?? '',
      seo_desc_el: (p as Record<string,unknown>).seo_desc_el as string ?? '',
      seo_desc_bg: (p as Record<string,unknown>).seo_desc_bg as string ?? '',
      seo_desc_hr: (p as Record<string,unknown>).seo_desc_hr as string ?? '',
      seo_desc_sk: (p as Record<string,unknown>).seo_desc_sk as string ?? '',
      seo_desc_fi: (p as Record<string,unknown>).seo_desc_fi as string ?? '',
      seo_desc_no: (p as Record<string,unknown>).seo_desc_no as string ?? '',
      seo_desc_lt: (p as Record<string,unknown>).seo_desc_lt as string ?? '',
      seo_desc_lv: (p as Record<string,unknown>).seo_desc_lv as string ?? '',
      seo_desc_et: (p as Record<string,unknown>).seo_desc_et as string ?? '',
      seo_desc_sl: (p as Record<string,unknown>).seo_desc_sl as string ?? '',
      category: p.category, cover_image_url: p.cover_image_url,
    })
    setEditLang('en')
  }


  // Batch translate — 6 langs per call to avoid JSON truncation
  async function translateAll() {
    const src_title = editData.title_en as string
    const src_excerpt = (editData.excerpt_en as string) || ''
    const src_body = (editData.body_en as string) || ''
    const src_seo_title = (editData.seo_title_en as string) || src_title
    const src_seo_desc = (editData.seo_desc_en as string) || src_excerpt
    if (!src_title) return

    // 22 target languages split into 4 batches of ~6
    const BATCHES: [string, string][][] = [
      [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese (European)'],['it','Italian'],['nl','Dutch']],
      [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
      [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
      [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
    ]

    const makePrompt = (langs: [string,string][]) => {
      const langList = langs.map(([code, name]) => `${name} (${code})`).join(', ')
      const keys = langs.map(([code]) => code).join(', ')
      return `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no preamble.
---
Title: ${src_title}
SEO Title: ${src_seo_title}
Excerpt: ${src_excerpt}
SEO Desc: ${src_seo_desc}
Body: ${src_body.slice(0, 800)}`
    }

    setTranslating(true)
    const allUpdates: Record<string, string> = {}
    let batchNum = 0
    try {
      for (const batch of BATCHES) {
        batchNum++
        const res = await fetch('/api/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'raw_prompt', prompt: makePrompt(batch) })
        })
        if (!res.ok) throw new Error(`Batch ${batchNum} failed`)
        const data = await res.json() as { result: string }
        const raw = data.result.replace(/```json[\s\S]*?```|```/g, '').trim()
        // Attempt to fix truncated JSON
        let fixed = raw
        if (!fixed.endsWith('}')) {
          // Count open braces and close them
          const opens = (fixed.match(/\{/g) || []).length
          const closes = (fixed.match(/\}/g) || []).length
          fixed += '}'.repeat(Math.max(0, opens - closes))
        }
        try {
          const translations = JSON.parse(fixed) as Record<string, Record<string, string>>
          for (const [lang, fields] of Object.entries(translations)) {
            if (fields.title) allUpdates[`title_${lang}`] = fields.title
            if (fields.excerpt) allUpdates[`excerpt_${lang}`] = fields.excerpt
            if (fields.seo_title) allUpdates[`seo_title_${lang}`] = fields.seo_title
            if (fields.seo_desc) allUpdates[`seo_desc_${lang}`] = fields.seo_desc
            if (fields.body) allUpdates[`body_${lang}`] = fields.body
          }
        } catch {
          console.warn(`Batch ${batchNum} JSON parse failed, skipping`)
        }
      }
      setEditData(d => ({ ...d, ...allUpdates }))
    } catch (e) {
      alert('Translation error: ' + (e instanceof Error ? e.message : 'unknown'))
    } finally {
      setTranslating(false)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-400">Loading blog posts...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Blog Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">{posts.length} articles · Cover images · Multilingual · SEO</p>
        </div>
        <div className="flex gap-2">
          <a href={`/${locale}/settings/website`} className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl hover:border-[#c8a96e] transition-colors no-underline">← CMS</a>
          <a href="https://bali-interns-website.vercel.app/blog" target="_blank" rel="noopener"
            className="text-xs font-bold bg-[#c8a96e] text-white px-4 py-2 rounded-xl hover:bg-[#b8994e] transition-colors no-underline">
            Preview blog →
          </a>
        </div>
      </div>

      {/* Hidden file input for cover upload */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f && uploadPostId.current) uploadCover(uploadPostId.current, f) }} />

      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${post.status === 'published' ? 'border-zinc-100' : 'border-zinc-100 opacity-60'}`}>
            {/* Card header */}
            <div className="p-4 flex items-center gap-4">
              {/* Cover image with actions */}
              <div className="relative group w-20 h-14 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                {post.cover_image_url ? (
                  <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl">📷</div>
                )}
                {/* Hover overlay with upload + generate */}
                <div className="absolute inset-0 bg-charcoal/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5">
                  <button onClick={() => { uploadPostId.current = post.id; fileRef.current?.click() }}
                    className="text-[10px] bg-white text-charcoal px-1.5 py-0.5 rounded font-bold border-none cursor-pointer" title="Upload image">
                    {uploading === post.id ? '⏳' : '📁'}
                  </button>
                  <button onClick={() => { const p = post.cover_image_prompt || buildAutoPrompt(post.title_en, post.category); setPromptEditor({ postId: post.id, prompt: p }); setPromptDirty(false) }}
                    className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold border-none cursor-pointer" title="Generate with AI">
                    ✨
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1918] truncate">{post.title_en}</p>
                {post.title_fr && <p className="text-xs text-zinc-400 truncate mt-0.5">{post.title_fr}</p>}
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[10px] font-mono bg-zinc-50 text-zinc-400 px-1.5 py-0.5 rounded">{post.slug}</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{post.category}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${post.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-400'}`}>{post.status}</span>
                  {/* Language availability badges */}
                  {post.body_en && <span className="text-[10px] font-bold bg-zinc-50 text-zinc-500 px-1 py-0.5 rounded">🇬🇧</span>}
                  {post.body_fr && <span className="text-[10px] font-bold bg-zinc-50 text-zinc-500 px-1 py-0.5 rounded">🇫🇷</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleStatus(post)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${post.status === 'published' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                  {post.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => editing === post.id ? setEditing(null) : startEdit(post)}
                  className="text-xs font-bold bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer border-none">
                  {editing === post.id ? 'Close' : 'Edit'}
                </button>
              </div>
              {saved === post.id && <span className="text-[10px] text-green-600 font-bold">✓</span>}
            </div>

            {/* Edit panel */}
            {editing === post.id && (
              <div className="border-t border-zinc-100 p-4 bg-zinc-50/50 space-y-4">
                {/* Language tabs + AI translate */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-0.5 bg-zinc-100 p-0.5 rounded-xl overflow-x-auto max-w-full" style={{scrollbarWidth:"none"}}>
                    {LANGS.map(l => (
                      <button key={l.code} onClick={() => setEditLang(l.code)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border-none cursor-pointer whitespace-nowrap ${editLang === l.code ? 'bg-white text-[#1a1918] shadow-sm' : 'bg-transparent text-zinc-400'}`}>
                        {l.flag} {l.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { void translateAll() }}
                    disabled={translating || !editData.title_en}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    title="Traduit EN → FR/ES/DE/PT/IT avec Claude IA"
                  >
                    {translating ? '⏳ Traduction…' : '🌐 Traduire toutes les langues (22)'}
                  </button>
                </div>

                {/* Cover image section */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cover Image</label>
                  <div className="flex gap-3 mt-1 items-center">
                    <input value={(editData.cover_image_url as string) ?? ''} onChange={e => setEditData(d => ({ ...d, cover_image_url: e.target.value }))}
                      placeholder="URL or upload..." className="flex-1 text-xs font-mono border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                    <button onClick={() => { uploadPostId.current = post.id; fileRef.current?.click() }}
                      className="text-xs font-semibold border border-zinc-200 px-3 py-2 rounded-xl hover:border-[#c8a96e] transition-colors cursor-pointer">
                      {uploading === post.id ? '⏳ Uploading...' : '📁 Upload'}
                    </button>
                    <button onClick={() => generateCover(post)}
                      className="text-xs font-semibold bg-amber-500 text-white px-3 py-2 rounded-xl hover:bg-amber-600 transition-colors cursor-pointer border-none">
                      {generating === post.id ? '⏳' : '✨ Generate'}
                    </button>
                  </div>
                  {(editData.cover_image_url as string) && (
                    <img src={editData.cover_image_url as string} alt="" className="h-24 rounded-xl mt-2 border border-zinc-100 object-cover" />
                  )}
                </div>

                {/* Cover Image Prompt Editor — same UI as jobs */}
                <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🎨 Cover Image Prompt</h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Auto-generated from title & category — edit to refine before generating.</p>
                    </div>
                    <button
                      onClick={() => setPromptEditor({ postId: post.id, prompt: buildAutoPrompt(post.title_en, post.category) })}
                      className="text-[10px] px-2 py-1 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-400 cursor-pointer">
                      ↺ Reset
                    </button>
                  </div>
                  <textarea
                    value={promptEditor?.postId === post.id ? promptEditor.prompt : (post.cover_image_prompt || buildAutoPrompt(post.title_en, post.category))}
                    onChange={e => { setPromptEditor({ postId: post.id, prompt: e.target.value }); setPromptDirty(true) }}
                    onFocus={() => { if (promptEditor?.postId !== post.id) setPromptEditor({ postId: post.id, prompt: post.cover_image_prompt || buildAutoPrompt(post.title_en, post.category) }) }}
                    rows={3}
                    className="w-full text-xs text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono bg-white"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {promptDirty && promptEditor?.postId === post.id && (
                      <button
                        onClick={async () => {
                          const sb = createClient(); await sb.from('blog_posts').update({ cover_image_prompt: promptEditor.prompt }).eq('id', post.id)
                          setPromptDirty(false)
                        }}
                        className="text-[10px] px-3 py-1.5 bg-[#c8a96e] text-white rounded-xl font-bold hover:bg-[#b8945a] cursor-pointer">
                        💾 Save prompt
                      </button>
                    )}
                    <button
                      onClick={() => void generateCover(post, promptEditor?.postId === post.id ? promptEditor.prompt : undefined)}
                      disabled={generating === post.id}
                      className="text-xs px-4 py-1.5 bg-[#1a1918] text-white rounded-xl font-bold disabled:opacity-40 hover:bg-zinc-800 transition-colors cursor-pointer border-none">
                      {generating === post.id ? '⏳ Generating…' : (post.cover_image_url ? '🔄 Regenerate cover' : '✨ Generate cover')}
                    </button>
                  </div>

                  {/* Blog-card preview — shows the branded OG card */}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">📋 Blog-card preview (OG fallback)</p>
                    <div className="space-y-2">
                      <BlogCardPreview post={post} />
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-zinc-400">Image OG utilisée pour les partages réseaux sociaux.</p>
                        {post.cover_image_url && (
                          <a
                            href={post.cover_image_url}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-amber-700 hover:underline no-underline shrink-0 ml-3"
                          >
                            → Voir la cover ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title + SEO for selected language */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title ({editLang.toUpperCase()})</label>
                    <input value={(editData[`title_${editLang}`] as string) ?? ''} onChange={e => setEditData(d => ({ ...d, [`title_${editLang}`]: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Title ({editLang.toUpperCase()})</label>
                    <input value={(editData[`seo_title_${editLang}`] as string) ?? ''} onChange={e => setEditData(d => ({ ...d, [`seo_title_${editLang}`]: e.target.value }))}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Excerpt ({editLang.toUpperCase()})</label>
                    <textarea value={(editData[`excerpt_${editLang}`] as string) ?? ''} onChange={e => setEditData(d => ({ ...d, [`excerpt_${editLang}`]: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SEO Description ({editLang.toUpperCase()})</label>
                    <textarea value={(editData[`seo_desc_${editLang}`] as string) ?? ''} onChange={e => setEditData(d => ({ ...d, [`seo_desc_${editLang}`]: e.target.value }))} rows={2}
                      className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Body ({editLang.toUpperCase()}) — Markdown</label>
                  <textarea value={(editData[`body_${editLang}`] as string) ?? ''} onChange={e => setEditData(d => ({ ...d, [`body_${editLang}`]: e.target.value }))} rows={8}
                    className="w-full mt-1 text-sm font-mono border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e] resize-y" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                  <input value={(editData.category as string) ?? ''} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                    className="w-full mt-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#c8a96e]" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditing(null)} className="text-xs text-zinc-400 px-4 py-2 border-none bg-transparent cursor-pointer">Cancel</button>
                  <button onClick={() => savePost(post.id)} disabled={saving}
                    className="text-xs font-bold bg-[#c8a96e] text-white px-5 py-2 rounded-xl hover:bg-[#b8994e] disabled:opacity-50 transition-colors cursor-pointer border-none">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
