'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type Status = 'draft' | 'ready' | 'published'
type Step = 1 | 2 | 3 | 4

interface Job {
  id: string
  title: string
  public_title: string | null
  description: string | null
  location: string | null
  wished_duration_months: number | null
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  public_hashtags: string[] | null
  seo_slug: string | null
  cover_image_url: string | null
  companies?: { id: string; name: string; logo_url?: string | null } | null
}

interface PlatformConfig {
  enabled: boolean
  formats: {
    square: boolean    // 1:1 - Instagram feed, Facebook
    portrait: boolean  // 4:5 - Instagram, 9:16 TikTok/Stories
    landscape: boolean // 1.91:1 - LinkedIn, Facebook
  }
  lang: Lang
  tone: string
}

interface GeneratedImage {
  platform: Platform
  format: string
  url: string
  prompt: string
}

interface GeneratedPost {
  id: string
  platform: Platform
  lang: Lang
  tone: string
  content: string
  hashtags: string[]
  image_url: string | null
  status: Status
  created_at: string
  jobs?: { title: string; public_title: string | null; companies?: { name: string } | null } | null
}

const PLATFORM_DEFS: {
  key: Platform; label: string; icon: string; color: string; bg: string
  formats: { key: string; label: string; dims: string; icon: string }[]
  maxLen: number
}[] = [
  {
    key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', bg: '#fdf0f4',
    maxLen: 2200,
    formats: [
      { key: 'square',   label: 'Carré Feed',  dims: '1080×1080', icon: '⬛' },
      { key: 'portrait', label: 'Portrait 4:5', dims: '1080×1350', icon: '▬' },
      { key: 'portrait', label: 'Story/Reels',  dims: '1080×1920', icon: '📱' },
    ],
  },
  {
    key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0077B5', bg: '#f0f7fc',
    maxLen: 3000,
    formats: [
      { key: 'landscape', label: 'Post image',   dims: '1200×627', icon: '🖼' },
      { key: 'square',    label: 'Carré',        dims: '1080×1080', icon: '⬛' },
    ],
  },
  {
    key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000', bg: '#f5f5f5',
    maxLen: 2200,
    formats: [
      { key: 'portrait', label: 'Vidéo 9:16', dims: '1080×1920', icon: '🎬' },
    ],
  },
  {
    key: 'facebook', label: 'Facebook', icon: '👥', color: '#1877F2', bg: '#f0f4ff',
    maxLen: 5000,
    formats: [
      { key: 'landscape', label: 'Post image',  dims: '1200×630', icon: '🖼' },
      { key: 'square',    label: 'Carré',       dims: '1080×1080', icon: '⬛' },
    ],
  },
]

const TONES = ['Enthousiaste', 'Professionnel', 'Décontracté', 'Inspirant', 'Urgence']

const DEFAULT_CONFIG = (): PlatformConfig => ({
  enabled: false,
  formats: { square: true, portrait: false, landscape: false },
  lang: 'fr',
  tone: 'Enthousiaste',
})

function imagePrompt(job: Job, platform: Platform): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise'
  const location = job.location ?? 'Bali, Indonésie'
  const vibe = job.public_vibe ? `Atmosphere: ${job.public_vibe}.` : ''
  const perks = job.public_perks?.filter(Boolean).slice(0, 3).join(', ') ?? ''

  const styles: Record<Platform, string> = {
    instagram: `vibrant tropical lifestyle photograph, golden hour glow, young professional (25yo, stylish) working in ${location}, warm orange #F5A623 and gold tones in the scene, Bali beach or luxury coworking background, photorealistic editorial quality`,
    linkedin: `clean professional corporate photograph, modern tropical coworking space in Bali, brand colors warm gold #F5A623 and dark #1A1918, minimalist elegant composition, photorealistic`,
    tiktok: `dynamic energetic visual, young trendy 25yo professional, bold warm colors, Bali adventure meets career excitement, tropical palm trees and ocean in background, photorealistic`,
    facebook: `friendly approachable photograph, professional yet casual atmosphere, Bali tropical setting, warm golden colors, community and team feeling, photorealistic`,
  }

  return `Professional marketing photograph for a ${title} internship at ${company} in ${location}, Indonesia.
${vibe}
${perks ? `Key selling points visible in scene: ${perks}.` : ''}
Visual style: ${styles[platform]}.
Colors: warm gold/orange (#F5A623) accents natural in the scene (sunset light, decor, clothing details).
DO NOT include any text, words, logos, watermarks, or UI elements in the image.
Ultra high quality, editorial photography style, magazine-worthy composition.`
}

function textPrompt(job: Job, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise partenaire'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'plusieurs mois'
  const langLabel = lang === 'fr' ? 'français' : 'anglais'
  const hook = job.public_hook ? `\nACCROCHE IMPOSÉE (commence par ça): "${job.public_hook}"` : ''
  const vibe = job.public_vibe ? `\nAmbiance: ${job.public_vibe}` : ''
  const perks = job.public_perks?.filter(Boolean).length ? `\nAvantages: ${job.public_perks!.filter(Boolean).join(', ')}` : ''
  const tags = job.public_hashtags?.filter(Boolean).length
    ? `\nHashtags imposés: ${job.public_hashtags!.filter(Boolean).map(h => h.startsWith('#') ? h : '#' + h).join(' ')}`
    : ''

  return `Tu es community manager pour Bali Interns, agence de stages à Bali.
Écris un post ${platform} en ${langLabel} pour:
- Poste: ${title} | Entreprise: ${company} | Durée: ${duration} | Lieu: ${job.location ?? 'Bali, Indonésie'}
${job.description ? `- Contexte: ${job.description.slice(0, 250)}` : ''}${hook}${vibe}${perks}${tags}

TON: ${tone} | PLATEFORME: ${platform}
${platform === 'instagram' ? '→ Hook fort, storytelling, emojis, 8-12 hashtags' : ''}
${platform === 'linkedin' ? '→ Professionnel, valeur carrière, 3-5 hashtags' : ''}
${platform === 'tiktok' ? '→ Accroche choc ligne 1, max 150 mots, rythme rapide' : ''}
${platform === 'facebook' ? '→ Chaleureux, CTA clair, 3-5 hashtags' : ''}
CTA obligatoire: "Postuler sur bali-interns.com"
Retourne UNIQUEMENT le post.`
}

export default function ContentMachinePage() {
  const searchParams = useSearchParams()
  const prefilledJobId = searchParams.get('job_id')

  const [step, setStep] = useState<Step>(1)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [jobSearch, setJobSearch] = useState('')
  const [configs, setConfigs] = useState<Record<Platform, PlatformConfig>>({
    instagram: DEFAULT_CONFIG(),
    linkedin:  DEFAULT_CONFIG(),
    tiktok:    DEFAULT_CONFIG(),
    facebook:  DEFAULT_CONFIG(),
  })
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [generatingImage, setGeneratingImage] = useState(false)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<GeneratedPost[]>([])
  const [tab, setTab] = useState<'generate' | 'history'>('generate')
  const [hasGemini, setHasGemini] = useState<boolean | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: Job[]) => {
        setJobs(d)
        if (prefilledJobId) {
          const match = d.find((j: Job) => j.id === prefilledJobId)
          if (match) { setSelectedJob(match); setStep(2) }
        }
      }).catch(() => {})
    fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'test' }) })
      .then(r => r.json()).then((d: { error?: string }) => setHasGemini(!d.error?.includes('not configured'))).catch(() => setHasGemini(false))
  }, [prefilledJobId])

  const loadHistory = useCallback(async () => {
    const d = await fetch('/api/content/posts').then(r => r.ok ? r.json() : []) as GeneratedPost[]
    setHistory(d)
  }, [])
  useEffect(() => { if (tab === 'history') void loadHistory() }, [tab, loadHistory])

  const enabledPlatforms = (Object.entries(configs) as [Platform, PlatformConfig][])
    .filter(([, c]) => c.enabled).map(([k]) => k)

  const generateImages = useCallback(async () => {
    if (!selectedJob) return
    setGeneratingImage(true); setImages([])
    const newImages: GeneratedImage[] = []
    for (const platform of enabledPlatforms) {
      try {
        const prompt = imagePrompt(selectedJob, platform)
        const res = await fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, job_id: selectedJob.id, platform }) })
        const d = await res.json() as { image_url?: string }
        if (d.image_url) newImages.push({ platform, format: 'square', url: d.image_url, prompt })
      } catch { /* ignore */ }
    }
    setImages(newImages); setGeneratingImage(false)
    if (newImages.length > 0) setStep(4)
  }, [selectedJob, enabledPlatforms])

  const generateTexts = useCallback(async () => {
    if (!selectedJob) return
    setGenerating(true)
    const newPosts: GeneratedPost[] = []
    await Promise.all(enabledPlatforms.map(async (platform) => {
      const cfg = configs[platform]
      try {
        const res = await fetch('/api/anthropic/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: textPrompt(selectedJob, platform, cfg.tone, cfg.lang) }] }) })
        const data = await res.json() as { content: { type: string; text: string }[] }
        const raw = data.content?.find(c => c.type === 'text')?.text ?? ''
        const hashtags = raw.match(/#[\w\u00C0-\u017F]+/g) ?? []
        const content = raw.replace(/#[\w\u00C0-\u017F]+/g, '').trim()
        const img = images.find(i => i.platform === platform)
        newPosts.push({ id: `${Date.now()}-${platform}`, platform, lang: cfg.lang, tone: cfg.tone, content, hashtags, image_url: img?.url ?? null, job_id: selectedJob.id, status: 'draft', created_at: new Date().toISOString() } as GeneratedPost)
      } catch { /* ignore */ }
    }))
    setPosts(newPosts); setGenerating(false)
  }, [selectedJob, enabledPlatforms, configs, images])


  const saveAll = useCallback(async () => {
    setSaving(true)
    await Promise.all(posts.map(p => fetch('/api/content/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })))
    setSaved(true); setSaving(false)
  }, [posts])

  function toggleConfig(platform: Platform, key: keyof PlatformConfig, value: unknown) {
    setConfigs(prev => ({ ...prev, [platform]: { ...prev[platform], [key]: value } }))
  }
  function copy(text: string, id: string) { void navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000) }
  const filteredJobs = jobs.filter(j => { const q = jobSearch.toLowerCase(); return !q || (j.public_title ?? j.title).toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q) })
  const pDef = (k: Platform) => PLATFORM_DEFS.find(p => p.key === k)!

  // ── STEPPER UI ──
  const STEPS = [
    { n: 1, label: 'Offre', icon: '💼' },
    { n: 2, label: 'Plateformes', icon: '📱' },
    { n: 3, label: 'Image', icon: '🎨' },
    { n: 4, label: 'Textes & Vidéo', icon: '✍️' },
  ]

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1a1918]">⚡ Content Machine</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Génère images, textes et vidéos pour chaque offre</p>
          </div>
          <div className="flex gap-2">
            {(['generate', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${tab === t ? 'bg-[#1a1918] text-[#c8a96e]' : 'text-zinc-400 hover:text-zinc-600'}`}>
                {t === 'generate' ? '✨ Créer' : `📋 Historique${history.length > 0 ? ` (${history.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {tab === 'history' ? (
          /* ── HISTORY ── */
          <div>
            {history.length === 0 ? (
              <div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">📭</p><p className="text-sm">Aucun contenu sauvegardé</p></div>
            ) : (
              <div className="space-y-3">
                {history.map(post => {
                  const pd = pDef(post.platform)
                  return (
                    <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex gap-3">
                      {post.image_url && <img src={post.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{pd.icon}</span>
                          <span className="text-xs font-bold" style={{ color: pd.color }}>{pd.label}</span>
                          <span className="text-[10px] text-zinc-400">{post.lang.toUpperCase()} · {post.tone}</span>
                          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${post.status === 'published' ? 'bg-green-50 text-green-600' : post.status === 'ready' ? 'bg-blue-50 text-blue-500' : 'bg-zinc-100 text-zinc-500'}`}>{post.status}</span>
                        </div>
                        <p className="text-xs text-zinc-600 line-clamp-2">{post.content}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, post.id)} className="text-[11px] px-2 py-1 border border-zinc-200 rounded-lg text-zinc-500">
                            {copied === post.id ? '✓' : '📋 Copier'}
                          </button>
                          {post.image_url && <a href={post.image_url} download className="text-[11px] px-2 py-1 border border-zinc-200 rounded-lg text-zinc-500">↓ Image</a>}
                          <span className="text-[10px] text-zinc-300 ml-auto self-center">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── STEPPER ── */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <button onClick={() => { if (s.n < step) setStep(s.n as Step) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      step === s.n ? 'bg-[#1a1918] text-[#c8a96e] shadow-sm' :
                      step > s.n ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 cursor-pointer' :
                      'bg-zinc-50 text-zinc-300 cursor-not-allowed'
                    }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s.n ? 'bg-[#c8a96e] text-[#1a1918]' : step > s.n ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-400'}`}>
                      {step > s.n ? '✓' : s.n}
                    </span>
                    <span className="hidden sm:inline">{s.icon} {s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 min-w-4 ${step > s.n ? 'bg-green-300' : 'bg-zinc-200'}`} />}
                </div>
              ))}
            </div>

            {/* ── STEP 1: Sélectionner le job ── */}
            {step === 1 && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="text-base font-bold text-[#1a1918] mb-1">💼 Sélectionne une offre de stage</h2>
                <p className="text-xs text-zinc-400 mb-4">Les contenus seront générés à partir des infos du job</p>
                <input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Rechercher…"
                  className="w-full px-3 py-2 mb-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredJobs.map(j => (
                    <button key={j.id} onClick={() => { setSelectedJob(j); setStep(2) }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:border-[#c8a96e] ${selectedJob?.id === j.id ? 'border-[#c8a96e] bg-amber-50' : 'border-zinc-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-sm flex-shrink-0">
                          {j.cover_image_url ? <img src={j.cover_image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : '🌴'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1a1918] truncate">{j.public_title ?? j.title}</p>
                          <div className="flex gap-2 text-[11px] text-zinc-400">
                            {j.companies?.name && <span>@ {j.companies.name}</span>}
                            {j.wished_duration_months && <span>· {j.wished_duration_months} mois</span>}
                            {j.public_hook && <span className="text-[#c8a96e] italic truncate">· &ldquo;{j.public_hook}&rdquo;</span>}
                          </div>
                        </div>
                        {j.public_hook && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">✅ Infos publiques</span>}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedJob && (
                  <button onClick={() => setStep(2)} className="mt-4 w-full py-2.5 bg-[#1a1918] text-[#c8a96e] font-bold rounded-xl text-sm">
                    Continuer avec &ldquo;{selectedJob.public_title ?? selectedJob.title}&rdquo; →
                  </button>
                )}
              </div>
            )}

            {/* ── STEP 2: Choisir plateformes + formats ── */}
            {step === 2 && selectedJob && (
              <div className="space-y-4">
                {/* Job summary */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-lg">🌴</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1a1918]">{selectedJob.public_title ?? selectedJob.title}</p>
                    <p className="text-xs text-zinc-400">{selectedJob.companies?.name}{selectedJob.wished_duration_months ? ` · ${selectedJob.wished_duration_months} mois` : ''}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-zinc-400 hover:text-zinc-600">Changer →</button>
                </div>

                <h2 className="text-base font-bold text-[#1a1918]">📱 Choisis tes plateformes et formats</h2>

                {PLATFORM_DEFS.map(pd => {
                  const cfg = configs[pd.key]
                  return (
                    <div key={pd.key} className={`bg-white rounded-2xl border-2 transition-all ${cfg.enabled ? 'border-[#c8a96e]' : 'border-zinc-100'}`}>
                      {/* Platform header */}
                      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleConfig(pd.key, 'enabled', !cfg.enabled)}>
                        <span className="text-xl">{pd.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1a1918]">{pd.label}</p>
                          <p className="text-[11px] text-zinc-400">{pd.formats.map(f => f.label).join(' · ')}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${cfg.enabled ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cfg.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>

                      {/* Platform options (si activé) */}
                      {cfg.enabled && (
                        <div className="px-4 pb-4 space-y-3 border-t border-zinc-50 pt-3">
                          {/* Formats */}
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Formats</p>
                            <div className="flex flex-wrap gap-2">
                              {pd.formats.map((f, i) => {
                                const fKey = f.key as keyof PlatformConfig['formats']
                                // On utilise l'index pour différencier les formats du même type (ex: 2 portraits instagram)
                                const isActive = i === 0 ? cfg.formats[fKey] : false
                                return (
                                  <button key={i} onClick={() => {
                                    const newFormats = { ...cfg.formats }
                                    newFormats[fKey] = !newFormats[fKey]
                                    toggleConfig(pd.key, 'formats', newFormats)
                                  }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border-2 transition-all ${cfg.formats[fKey] ? 'border-[#c8a96e] bg-amber-50 text-[#1a1918] font-semibold' : 'border-zinc-100 text-zinc-400'}`}>
                                    {f.icon} {f.label} <span className="text-[10px] text-zinc-400">{f.dims}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Ton + Langue */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ton</p>
                              <div className="flex flex-wrap gap-1">
                                {TONES.map(t => (
                                  <button key={t} onClick={() => toggleConfig(pd.key, 'tone', t)}
                                    className={`px-2 py-1 text-[11px] rounded-lg border transition-all ${cfg.tone === t ? 'border-[#c8a96e] bg-amber-50 font-semibold text-[#1a1918]' : 'border-zinc-100 text-zinc-400'}`}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Langue</p>
                              <div className="flex gap-2">
                                {(['fr', 'en'] as Lang[]).map(l => (
                                  <button key={l} onClick={() => toggleConfig(pd.key, 'lang', l)}
                                    className={`px-3 py-1.5 text-xs rounded-xl border-2 font-semibold transition-all ${cfg.lang === l ? 'border-[#c8a96e] bg-amber-50' : 'border-zinc-100 text-zinc-400'}`}>
                                    {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button onClick={() => setStep(3)} disabled={enabledPlatforms.length === 0}
                  className="w-full py-3 bg-[#1a1918] text-[#c8a96e] font-bold rounded-2xl text-sm disabled:opacity-40 hover:bg-zinc-800 transition-colors">
                  {enabledPlatforms.length === 0 ? 'Active au moins une plateforme' : `Générer pour ${enabledPlatforms.length} plateforme${enabledPlatforms.length > 1 ? 's' : ''} →`}
                </button>
              </div>
            )}

            {/* ── STEP 3: Générer l'image ── */}
            {step === 3 && selectedJob && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <h2 className="text-base font-bold text-[#1a1918] mb-1">🎨 Génération des visuels</h2>
                  <p className="text-xs text-zinc-400 mb-4">
                    {enabledPlatforms.length} image{enabledPlatforms.length > 1 ? 's' : ''} à créer — une par plateforme, adaptée au style
                    {hasGemini === false && <span className="ml-2 text-amber-600 font-medium">⚠️ Clé Gemini manquante — images désactivées</span>}
                  </p>

                  {/* Preview du job */}
                  <div className="flex gap-3 p-3 bg-zinc-50 rounded-xl mb-4">
                    <div className="text-2xl">🌴</div>
                    <div>
                      <p className="text-sm font-semibold">{selectedJob.public_title ?? selectedJob.title}</p>
                      {selectedJob.public_hook && <p className="text-xs text-[#c8a96e] italic">&ldquo;{selectedJob.public_hook}&rdquo;</p>}
                      {selectedJob.public_vibe && <p className="text-[11px] text-zinc-500">{selectedJob.public_vibe}</p>}
                    </div>
                  </div>

                  {/* Prompt preview par plateforme */}
                  <div className="space-y-2 mb-5">
                    {enabledPlatforms.map(platform => {
                      const pd = pDef(platform)
                      const img = images.find(i => i.platform === platform)
                      return (
                        <div key={platform} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100">
                          <span className="text-lg">{pd.icon}</span>
                          <div className="flex-1">
                            <p className="text-xs font-semibold" style={{ color: pd.color }}>{pd.label}</p>
                            <p className="text-[10px] text-zinc-400">Style {platform} · fond Bali · couleurs brand</p>
                          </div>
                          {img ? (
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="" className="w-12 h-12 rounded-lg object-cover cursor-pointer border-2 border-transparent hover:border-[#c8a96e] transition-all"
                                onClick={() => window.open(img.url, '_blank')} title="Voir en grand" />
                              <div>
                                <span className="text-[10px] text-green-600 font-semibold block">✅ Prête</span>
                                <button onClick={async () => {
                                  setGeneratingImage(true)
                                  const prompt = imagePrompt(selectedJob, platform)
                                  try {
                                    const res = await fetch('/api/content/generate-image', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt, job_id: selectedJob.id, platform }) })
                                    const d = await res.json() as { url?: string; error?: string }
                                    if (d.url) setImages(prev => {
                                      const updated = prev.filter(i => i.platform !== platform)
                                      const prompt = imagePrompt(selectedJob, platform)
                                      return [...updated, { platform, format: 'square', url: d.url!, prompt } as GeneratedImage]
                                    })
                                  } catch { /* ignore */ }
                                  setGeneratingImage(false)
                                }} className="text-[10px] text-zinc-400 hover:text-[#c8a96e]">🔄 Régén.</button>
                              </div>
                            </div>
                          ) : generatingImage ? (
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 animate-pulse" />
                          ) : (
                            <span className="text-[10px] text-zinc-300">En attente</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {images.length === 0 ? (
                    <button onClick={() => void generateImages()} disabled={generatingImage || !hasGemini}
                      className="w-full py-3 font-bold text-sm rounded-2xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#1a1918', color: '#c8a96e' }}>
                      {generatingImage ? (
                        <><span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Génération en cours…</>
                      ) : !hasGemini ? '⚠️ Clé Gemini requise' : `🎨 Générer ${enabledPlatforms.length} image${enabledPlatforms.length > 1 ? 's' : ''} avec Nano Banana`}
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => void generateImages()} disabled={generatingImage}
                        className="flex-1 py-2.5 text-sm font-semibold border border-zinc-200 rounded-2xl text-zinc-600 hover:bg-zinc-50 disabled:opacity-40">
                        🔄 Regénérer
                      </button>
                      <button onClick={() => setStep(4)}
                        className="flex-1 py-2.5 font-bold text-sm rounded-2xl" style={{ background: '#1a1918', color: '#c8a96e' }}>
                        Continuer → Textes
                      </button>
                    </div>
                  )}

                  {!hasGemini && (
                    <button onClick={() => setStep(4)} className="mt-3 w-full py-2.5 text-sm text-zinc-500 border border-zinc-200 rounded-2xl hover:bg-zinc-50">
                      Passer sans images → générer les textes quand même
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4: Textes + Vidéo ── */}
            {step === 4 && selectedJob && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#1a1918]">✍️ Génération des textes</h2>
                      <p className="text-xs text-zinc-400">{enabledPlatforms.length} post{enabledPlatforms.length > 1 ? 's' : ''} · ton et langue configurés par plateforme</p>
                    </div>
                    {/* Vidéo */}
                  </div>

                  {posts.length === 0 ? (
                    <button onClick={() => void generateTexts()} disabled={generating}
                      className="w-full py-3 font-bold text-sm rounded-2xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#1a1918', color: '#c8a96e' }}>
                      {generating ? (
                        <><span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Claude génère les textes…</>
                      ) : `✍️ Générer ${enabledPlatforms.length} post${enabledPlatforms.length > 1 ? 's' : ''} avec Claude`}
                    </button>
                  ) : (
                    <div className="flex gap-3 mb-4">
                      <button onClick={() => void generateTexts()} disabled={generating}
                        className="flex-1 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50">🔄 Regénérer</button>
                      {saved ? (
                        <span className="flex-1 py-2 text-center text-xs text-green-600 font-semibold">✅ Sauvegardé</span>
                      ) : (
                        <button onClick={() => void saveAll()} disabled={saving}
                          className="flex-1 py-2 text-xs font-bold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50">
                          {saving ? '…' : '💾 Sauvegarder tout'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Posts générés */}
                {posts.map(post => {
                  const pd = pDef(post.platform)
                  return (
                    <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50" style={{ background: `${pd.color}08` }}>
                        <span className="text-xl">{pd.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: pd.color }}>{pd.label}</p>
                          <p className="text-[10px] text-zinc-400">{post.lang.toUpperCase()} · {post.tone} · max {pd.maxLen.toLocaleString()} car.</p>
                        </div>
                        <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                          {post.content.length + post.hashtags.join(' ').length} / {pd.maxLen}
                        </span>
                      </div>

                      <div className={`${post.image_url ? 'grid grid-cols-1 sm:grid-cols-2' : ''}`}>
                        {/* Image */}
                        {post.image_url && (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={post.image_url} alt="" className="w-full h-56 object-cover" />
                            <a href={post.image_url} download className="absolute bottom-2 right-2 px-2 py-1 text-[10px] bg-black/60 text-white rounded-lg">↓ DL</a>
                          </div>
                        )}

                        {/* Texte */}
                        <div className="p-4 flex flex-col gap-3">
                          {editingId === post.id ? (
                            <>
                              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6}
                                className="text-sm text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                              <button onClick={() => { setPosts(prev => prev.map(p => p.id === post.id ? { ...p, content: editContent } : p)); setEditingId(null) }}
                                className="px-3 py-1.5 text-xs font-bold bg-[#c8a96e] text-white rounded-lg self-start">✓ Valider</button>
                            </>
                          ) : (
                            <p className="text-sm text-zinc-700 leading-relaxed flex-1 whitespace-pre-wrap">{post.content}</p>
                          )}

                          {/* Hashtags */}
                          {post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((h, i) => (
                                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${pd.color}15`, color: pd.color }}>{h}</span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, post.id)}
                              className="flex-1 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                              {copied === post.id ? '✓ Copié !' : '📋 Copier'}
                            </button>
                            {editingId === post.id ? null : (
                              <button onClick={() => { setEditingId(post.id); setEditContent(post.content) }}
                                className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">
                                ✏️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
