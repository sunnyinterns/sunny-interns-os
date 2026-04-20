'use client'
import { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────
type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type JobTab = 'infos' | 'image' | 'video' | 'posts' | 'publication'

interface Job {
  id: string; title: string; public_title: string | null; status: string
  location: string | null; wished_duration_months: number | null
  description: string | null; public_description: string | null
  public_hook: string | null; public_vibe: string | null
  public_perks: string[] | null; public_hashtags: string[] | null
  seo_slug: string | null; cv_drop_enabled: boolean | null
  cover_image_url: string | null; is_public: boolean | null
  missions: string[] | null; profile_sought: string | null
  companies?: { id: string; name: string; logo_url: string | null; description: string | null } | null
}

interface SocialPost {
  id: string; platform: Platform; lang: Lang; tone: string | null
  content: string; hashtags: string[]; image_url: string | null; status: string
  created_at: string
}

interface Publication {
  id: string; platform: Platform | 'all'; content: string
  image_url: string | null; scheduled_for: string | null
  status: string; notes: string | null; created_at: string
}

const PD: Record<Platform, { label: string; icon: string; color: string; bg: string; ratio: string; desc: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C', bg: '#fdf0f4', ratio: '1:1',  desc: '1080×1080 · carré' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: '#0077B5', bg: '#f0f7fc', ratio: '16:9', desc: '1200×627 · paysage' },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#333',    bg: '#f5f5f5', ratio: '9:16', desc: '1080×1920 · portrait' },
  facebook:  { label: 'Facebook',  icon: '👥', color: '#1877F2', bg: '#f0f4ff', ratio: '1:1',  desc: '1080×1080 · carré' },
}

function imagePrompt(job: Job, platform: Platform): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise'
  const vibe = job.public_vibe ? `Atmosphere: ${job.public_vibe}.` : ''
  const perks = job.public_perks?.filter(Boolean).slice(0, 3).join(', ') ?? ''
  const styles: Record<Platform, string> = {
    instagram: 'vibrant tropical lifestyle, golden hour, young professional in Bali, warm orange #F5A623 tones, photorealistic editorial',
    linkedin:  'clean professional tropical coworking, brand gold #F5A623 and dark #1A1918, minimalist, photorealistic',
    tiktok:    'dynamic energetic, young 25yo professional, bold colors, Bali adventure meets career, photorealistic',
    facebook:  'friendly approachable, professional casual, Bali tropical, warm golden community feel, photorealistic',
  }
  return `Professional marketing photograph for a ${title} internship at ${company} in Bali. ${vibe}${perks ? `Selling points: ${perks}.` : ''} Style: ${styles[platform]}. Colors: warm gold #F5A623 accents. NO text, logos, watermarks. Ultra high quality, editorial photography.`
}

function textPrompt(job: Job, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise partenaire'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'plusieurs mois'
  const hook = job.public_hook ? `\nACCROCHE: "${job.public_hook}"` : ''
  const vibe = job.public_vibe ? `\nAmbiance: ${job.public_vibe}` : ''
  const perks = job.public_perks?.filter(Boolean).length ? `\nAvantages: ${job.public_perks!.filter(Boolean).join(', ')}` : ''
  const tags = job.public_hashtags?.filter(Boolean).length ? `\nHashtags: ${job.public_hashtags!.filter(Boolean).map(h => h.startsWith('#') ? h : '#'+h).join(' ')}` : ''
  const fmt = platform === 'instagram' ? 'Hook + storytelling + emojis + 8-12 hashtags' : platform === 'linkedin' ? 'Pro + valeur carrière + 3-5 hashtags' : platform === 'tiktok' ? 'Hook choc ligne 1 + max 150 mots + trending hashtags' : 'Chaleureux + CTA clair + 3-5 hashtags'
  return `Tu es community manager pour Bali Interns.
Post ${platform} en ${lang === 'fr' ? 'français' : 'anglais'} pour: ${title} @ ${company} — ${duration} — ${job.location ?? 'Bali'}
${job.description?.slice(0, 150) ?? ''}${hook}${vibe}${perks}${tags}
TON: ${tone} | FORMAT: ${fmt} | CTA: "Postuler sur bali-interns.com"
Retourne UNIQUEMENT le post complet.`
}

// ── Main component ──────────────────────────────────────────────────────
export default function JobsContentHub() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selected, setSelected] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'draft'>('all')
  const [tab, setTab] = useState<JobTab>('infos')
  const [loading, setLoading] = useState(true)

  // Image tab
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatingImg, setGeneratingImg] = useState<Platform | null>(null)
  const [platformImages, setPlatformImages] = useState<Partial<Record<Platform, string>>>({})

  // Posts tab
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram')
  const [tone, setTone] = useState('Enthousiaste')
  const [lang, setLang] = useState<Lang>('fr')
  const [postsByPlatform, setPostsByPlatform] = useState<Partial<Record<Platform, SocialPost>>>({})
  const [generatingPost, setGeneratingPost] = useState<Platform | null>(null)
  const [editingPost, setEditingPost] = useState<Platform | null>(null)
  const [editContent, setEditContent] = useState('')
  const [copiedPost, setCopiedPost] = useState<Platform | null>(null)
  const [savedPosts, setSavedPosts] = useState<Platform[]>([])

  // Publication tab
  const [publications, setPublications] = useState<Publication[]>([])
  const [pubForm, setPubForm] = useState({ platform: 'instagram' as Platform | 'all', content: '', image_url: '', scheduled_for: '', notes: '' })
  const [savingPub, setSavingPub] = useState(false)

  // Misc
  const [toggling, setToggling] = useState(false)

  const TONES = ['Enthousiaste', 'Professionnel', 'Décontracté', 'Inspirant', 'Urgence']
  const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white'

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: Job[]) => { setJobs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setPlatformImages({}); setPostsByPlatform({}); setSavedPosts([])
    setPublications([])
    fetch(`/api/content/posts?job_id=${selected.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: SocialPost[]) => {
        const byP: Partial<Record<Platform, SocialPost>> = {}
        d.forEach(p => { byP[p.platform] = p })
        setPostsByPlatform(byP)
      }).catch(() => {})
    fetch(`/api/content/publications?job_id=${selected.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: Publication[]) => setPublications(d)).catch(() => {})
  }, [selected])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const mq = !q || (j.public_title ?? j.title).toLowerCase().includes(q) || (j.companies?.name ?? '').toLowerCase().includes(q)
    const mf = filter === 'all' || (filter === 'public' ? j.is_public : !j.is_public)
    return mq && mf
  })

  const togglePublic = useCallback(async (job: Job) => {
    setToggling(true)
    await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_public: !job.is_public }) })
    const updated = { ...job, is_public: !job.is_public }
    setJobs(prev => prev.map(j => j.id === job.id ? updated : j))
    if (selected?.id === job.id) setSelected(updated)
    setToggling(false)
  }, [selected])

  const generateCover = useCallback(async () => {
    if (!selected) return
    setGeneratingCover(true)
    try {
      const res = await fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt(selected, 'instagram'), job_id: selected.id, platform: 'cover' }) })
      const d = await res.json() as { image_url?: string }
      if (d.image_url) {
        await fetch(`/api/jobs/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cover_image_url: d.image_url }) })
        const updated = { ...selected, cover_image_url: d.image_url }
        setSelected(updated); setJobs(prev => prev.map(j => j.id === selected.id ? updated : j))
      }
    } catch { /* ignore */ }
    setGeneratingCover(false)
  }, [selected])

  const generatePlatformImg = useCallback(async (platform: Platform) => {
    if (!selected) return
    setGeneratingImg(platform)
    try {
      const res = await fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt(selected, platform), job_id: selected.id, platform }) })
      const d = await res.json() as { image_url?: string }
      if (d.image_url) setPlatformImages(prev => ({ ...prev, [platform]: d.image_url }))
    } catch { /* ignore */ }
    setGeneratingImg(null)
  }, [selected])

  const generatePost = useCallback(async (platform: Platform) => {
    if (!selected) return
    setGeneratingPost(platform)
    try {
      const res = await fetch('/api/anthropic/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: textPrompt(selected, platform, tone, lang) }] }) })
      const data = await res.json() as { content: { type: string; text: string }[] }
      const raw = data.content?.find(c => c.type === 'text')?.text ?? ''
      const hashtags = raw.match(/#[\w\u00C0-\u017F]+/g) ?? []
      const content = raw.replace(/#[\w\u00C0-\u017F]+/g, '').trim()
      const post: SocialPost = { id: `${Date.now()}-${platform}`, platform, lang, tone, content, hashtags, image_url: platformImages[platform] ?? null, status: 'draft', created_at: new Date().toISOString() }
      setPostsByPlatform(prev => ({ ...prev, [platform]: post }))
    } catch { /* ignore */ }
    setGeneratingPost(null)
  }, [selected, tone, lang, platformImages])

  const savePost = useCallback(async (platform: Platform) => {
    const post = postsByPlatform[platform]
    if (!selected || !post) return
    await fetch('/api/content/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...post, job_id: selected.id }) })
    setSavedPosts(prev => [...prev, platform])
  }, [postsByPlatform, selected])

  const savePub = useCallback(async () => {
    if (!selected || !pubForm.content) return
    setSavingPub(true)
    const res = await fetch('/api/content/publications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: selected.id, ...pubForm, status: pubForm.scheduled_for ? 'scheduled' : 'draft' }) })
    const d = await res.json() as Publication
    setPublications(prev => [d, ...prev])
    setPubForm({ platform: 'instagram', content: '', image_url: '', scheduled_for: '', notes: '' })
    setSavingPub(false)
  }, [selected, pubForm])

  function copy(text: string, platform: Platform) {
    void navigator.clipboard.writeText(text)
    setCopiedPost(platform)
    setTimeout(() => setCopiedPost(null), 2000)
  }

  function downloadImage(url: string, name: string) {
    const a = document.createElement('a'); a.href = url; a.download = name; a.target = '_blank'; a.click()
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  const TAB_DEF: { id: JobTab; label: string; icon: string }[] = [
    { id: 'infos',       label: 'Infos',       icon: '📋' },
    { id: 'image',       label: 'Image',       icon: '🖼' },
    { id: 'video',       label: 'Vidéo',       icon: '🎬' },
    { id: 'posts',       label: 'Posts',       icon: '✍️' },
    { id: 'publication', label: 'Publication', icon: '📅' },
  ]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#fafaf7]">

      {/* ── LEFT: Job list ── */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-100 bg-white flex flex-col">
        <div className="p-3 border-b border-zinc-50 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-[#1a1918]">Jobs & Contenu</h1>
            <span className="text-[10px] text-zinc-400">{jobs.filter(j=>j.is_public).length} publiés</span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none" />
          <div className="flex gap-1">
            {(['all','public','draft'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)} className={`flex-1 py-1 text-[10px] rounded-lg font-medium ${filter===f?'bg-[#c8a96e] text-white':'text-zinc-400 hover:text-zinc-600'}`}>
                {f==='all'?'Tous':f==='public'?'🟢 Publiés':'⚫ Brouillons'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-3 space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-zinc-50 rounded-xl animate-pulse"/>)}</div>
          : filtered.length===0 ? <p className="p-4 text-xs text-zinc-400 text-center">Aucun job trouvé</p>
          : filtered.map(job=>(
            <button key={job.id} onClick={()=>{setSelected(job);setTab('infos')}}
              className={`w-full text-left p-3 border-b border-zinc-50 hover:bg-zinc-50 transition-all ${selected?.id===job.id?'bg-amber-50 border-l-2 border-l-[#c8a96e]':''}`}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-sm">
                  {job.cover_image_url?<img src={job.cover_image_url} alt="" className="w-full h-full object-cover"/>:'🌴'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${job.is_public?'bg-green-500':'bg-zinc-300'}`}/>
                    <p className="text-xs font-semibold text-[#1a1918] truncate">{job.public_title??job.title}</p>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{job.companies?.name??'—'}{job.wished_duration_months?` · ${job.wished_duration_months}m`:''}</p>
                  {job.public_hook && <p className="text-[10px] text-[#c8a96e] italic truncate">&ldquo;{job.public_hook}&rdquo;</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Hub ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-center text-zinc-400">
          <div><p className="text-5xl mb-3">💼</p><p className="text-sm font-medium text-zinc-600">Sélectionne un job</p><p className="text-xs mt-1">pour gérer sa page publique et son contenu</p></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Job header bar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-zinc-100 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
              {selected.cover_image_url?<img src={selected.cover_image_url} alt="" className="w-full h-full object-cover"/>:'🌴'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1a1918] truncate">{selected.public_title??selected.title}</p>
              <p className="text-[11px] text-zinc-400">{selected.companies?.name}{selected.wished_duration_months?` · ${selected.wished_duration_months} mois`:''}{selected.location?` · ${selected.location}`:''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!!selected.is_public} onChange={()=>!toggling&&void togglePublic(selected)} className="sr-only peer" disabled={toggling}/>
                <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-green-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"/>
                <span className="ml-1.5 text-[11px] text-zinc-500 font-medium">{selected.is_public?'Publiée':'Brouillon'}</span>
              </label>
              {selected.is_public && selected.seo_slug && (
                <a href={`/jobs/${selected.seo_slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">🌐 ↗</a>
              )}
              <a href={`/fr/jobs/${selected.id}`} className="text-xs px-2.5 py-1.5 bg-zinc-100 rounded-lg text-zinc-600 hover:bg-zinc-200">✏️ Éditer</a>
            </div>
          </div>

          {/* Tabs nav */}
          <div className="flex gap-0 border-b border-zinc-100 bg-white flex-shrink-0 px-2">
            {TAB_DEF.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 ${tab===t.id?'border-[#c8a96e] text-[#1a1918]':'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ════ TAB 1: INFOS ════ */}
            {tab==='infos' && (
              <div className="max-w-2xl space-y-4">
                {/* Infos publiques */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Informations publiques</h3>
                  <div className="space-y-3">
                    {selected.public_hook && (
                      <div className="flex gap-3"><span className="text-[10px] font-bold text-zinc-400 w-20 pt-0.5 flex-shrink-0">ACCROCHE</span>
                        <p className="text-sm text-[#c8a96e] italic flex-1">&ldquo;{selected.public_hook}&rdquo;</p></div>
                    )}
                    {selected.public_vibe && (
                      <div className="flex gap-3"><span className="text-[10px] font-bold text-zinc-400 w-20 pt-0.5 flex-shrink-0">AMBIANCE</span>
                        <p className="text-sm text-zinc-600 flex-1">{selected.public_vibe}</p></div>
                    )}
                    {selected.public_description && (
                      <div className="flex gap-3"><span className="text-[10px] font-bold text-zinc-400 w-20 pt-0.5 flex-shrink-0">DESCRIPTION</span>
                        <p className="text-sm text-zinc-600 flex-1 whitespace-pre-wrap">{selected.public_description}</p></div>
                    )}
                    {selected.public_perks?.filter(Boolean).length ? (
                      <div className="flex gap-3"><span className="text-[10px] font-bold text-zinc-400 w-20 pt-0.5 flex-shrink-0">AVANTAGES</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">{selected.public_perks!.filter(Boolean).map((p,i)=><span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">✨ {p}</span>)}</div></div>
                    ) : null}
                    {selected.seo_slug && (
                      <div className="flex gap-3"><span className="text-[10px] font-bold text-zinc-400 w-20 pt-0.5 flex-shrink-0">SLUG</span>
                        <p className="text-sm text-zinc-500 font-mono flex-1">{selected.seo_slug}</p></div>
                    )}
                    {!selected.public_hook && !selected.public_vibe && !selected.public_description && (
                      <div className="text-center py-6 text-zinc-400">
                        <p className="text-sm">Aucune info publique renseignée</p>
                        <a href={`/fr/jobs/${selected.id}`} className="text-xs text-[#c8a96e] hover:underline mt-1 inline-block">→ Remplir dans Éditer le job</a>
                      </div>
                    )}
                  </div>
                </div>
                {/* Description entreprise */}
                {selected.companies?.description && (
                  <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Entreprise — {selected.companies.name}</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{selected.companies.description}</p>
                  </div>
                )}
                {/* Page publique */}
                {selected.is_public && selected.seo_slug ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <span className="text-2xl">🌐</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-green-700">Page publique active</p>
                      <p className="text-[10px] text-green-500 font-mono truncate">/jobs/{selected.seo_slug}</p>
                    </div>
                    <a href={`/jobs/${selected.seo_slug}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">↗ Voir</a>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center">
                    <p className="text-xs text-zinc-500">Page non publiée — active le toggle ci-dessus + renseigne un slug SEO</p>
                  </div>
                )}
              </div>
            )}

            {/* ════ TAB 2: IMAGE ════ */}
            {tab==='image' && (
              <div className="max-w-2xl space-y-6">
                {/* Image principale */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#1a1918]">🖼 Image principale (Cover)</h3>
                    <button onClick={()=>void generateCover()} disabled={generatingCover}
                      className="text-xs px-3 py-1.5 bg-[#1a1918] text-[#c8a96e] rounded-xl font-bold disabled:opacity-40">
                      {generatingCover?'⏳ Génération…':'✨ Générer'}
                    </button>
                  </div>
                  {selected.cover_image_url ? (
                    <div className="relative group">
                      <img src={selected.cover_image_url} alt="" className="w-full aspect-square object-cover rounded-xl"/>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                        <button onClick={()=>void generateCover()} className="text-xs px-3 py-2 bg-white text-zinc-800 rounded-lg font-bold">🔄 Regénérer</button>
                        <button onClick={()=>downloadImage(selected.cover_image_url!, `cover-${selected.id}.jpg`)} className="text-xs px-3 py-2 bg-[#c8a96e] text-white rounded-lg font-bold">⬇ Télécharger</button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-zinc-50 rounded-xl flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-200">
                      <span className="text-4xl mb-2">🖼</span>
                      <p className="text-xs">Clique "Générer" pour créer l&apos;image</p>
                    </div>
                  )}
                </div>

                {/* Images par réseau */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <h3 className="text-sm font-bold text-[#1a1918] mb-4">📐 Images adaptées par réseau</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.entries(PD) as [Platform, typeof PD[Platform]][]).map(([p, pd])=>(
                      <div key={p} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div><p className="text-xs font-bold" style={{color:pd.color}}>{pd.icon} {pd.label}</p><p className="text-[10px] text-zinc-400">{pd.desc}</p></div>
                          <button onClick={()=>void generatePlatformImg(p)} disabled={generatingImg===p}
                            className="text-[10px] px-2 py-1 bg-zinc-100 rounded-lg hover:bg-zinc-200 disabled:opacity-40">
                            {generatingImg===p?'⏳':'✨'}
                          </button>
                        </div>
                        {platformImages[p] ? (
                          <div className="relative group">
                            <img src={platformImages[p]} alt="" className={`w-full object-cover rounded-lg ${p==='linkedin'?'aspect-video':p==='tiktok'?'aspect-[9/16] max-h-48':'aspect-square'}`}/>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <button onClick={()=>void generatePlatformImg(p)} className="text-[10px] px-2 py-1 bg-white text-zinc-800 rounded font-bold">🔄</button>
                              <button onClick={()=>downloadImage(platformImages[p]!, `${p}-${selected.id}.jpg`)} className="text-[10px] px-2 py-1 bg-[#c8a96e] text-white rounded font-bold">⬇</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-300 ${p==='linkedin'?'aspect-video':p==='tiktok'?'aspect-[9/16] max-h-48':'aspect-square'}`}>
                            <span className="text-2xl">{pd.icon}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB 3: VIDEO ════ */}
            {tab==='video' && (
              <div className="max-w-2xl space-y-5">
                <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center">
                  <div className="text-5xl mb-3">🎬</div>
                  <h3 className="text-base font-bold text-[#1a1918] mb-2">Génération vidéo</h3>
                  <p className="text-sm text-zinc-500 mb-4">Les vidéos animées pour Reels, TikTok et Stories sont en cours de développement.</p>
                  <div className="inline-block px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">🔜 Disponible bientôt</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['📱 Reels Instagram','🎵 TikTok Story','💼 LinkedIn Video'].map(f=>(
                    <div key={f} className="bg-white rounded-2xl border border-zinc-100 p-4 text-center opacity-50">
                      <div className="w-full aspect-[9/16] bg-zinc-50 rounded-xl flex items-center justify-center mb-2">
                        <span className="text-2xl">🎬</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════ TAB 4: POSTS ════ */}
            {tab==='posts' && (
              <div className="max-w-2xl space-y-4">
                {/* Config */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ton</p>
                      <div className="flex flex-wrap gap-1">
                        {['Enthousiaste','Professionnel','Décontracté','Inspirant','Urgence'].map(t=>(
                          <button key={t} onClick={()=>setTone(t)} className={`px-2.5 py-1 text-[10px] rounded-full font-medium border transition-all ${tone===t?'bg-[#c8a96e] text-white border-[#c8a96e]':'border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Langue</p>
                      <div className="flex gap-1">
                        <button onClick={()=>setLang('fr')} className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${lang==='fr'?'bg-[#c8a96e] text-white border-[#c8a96e]':'border-zinc-200 text-zinc-400'}`}>🇫🇷 FR</button>
                        <button onClick={()=>setLang('en')} className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${lang==='en'?'bg-[#c8a96e] text-white border-[#c8a96e]':'border-zinc-200 text-zinc-400'}`}>🇬🇧 EN</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs par réseau */}
                <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
                  {(Object.entries(PD) as [Platform, typeof PD[Platform]][]).map(([p,pd])=>(
                    <button key={p} onClick={()=>setActivePlatform(p)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activePlatform===p?'bg-white text-[#1a1918] shadow-sm':' text-zinc-400'}`}>
                      <span>{pd.icon}</span><span className="hidden sm:inline">{pd.label}</span>
                    </button>
                  ))}
                </div>

                {/* Post card pour la plateforme active */}
                {(()=>{
                  const pd = PD[activePlatform]
                  const post = postsByPlatform[activePlatform]
                  return (
                    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-50">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{pd.icon}</span>
                          <span className="text-sm font-bold" style={{color:pd.color}}>{pd.label}</span>
                          <span className="text-[10px] text-zinc-400">{pd.desc}</span>
                        </div>
                        <button onClick={()=>void generatePost(activePlatform)} disabled={generatingPost===activePlatform}
                          className="text-xs px-3 py-1.5 bg-[#1a1918] text-[#c8a96e] rounded-xl font-bold disabled:opacity-40">
                          {generatingPost===activePlatform?'⏳ Claude génère…':post?'🔄 Regénérer':'✨ Générer'}
                        </button>
                      </div>
                      <div className={`${post?.image_url || platformImages[activePlatform] ? 'grid grid-cols-2' : ''}`}>
                        {(post?.image_url || platformImages[activePlatform]) && (
                          <img src={post?.image_url || platformImages[activePlatform]} alt="" className="w-full aspect-square object-cover"/>
                        )}
                        <div className="p-4 space-y-3">
                          {!post ? (
                            <div className="py-8 text-center text-zinc-300">
                              <p className="text-3xl mb-2">✍️</p>
                              <p className="text-xs">Clique "Générer" pour créer le post {pd.label}</p>
                            </div>
                          ) : editingPost===activePlatform ? (
                            <div className="space-y-2">
                              <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={7}
                                className="w-full text-sm text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"/>
                              <div className="flex gap-2">
                                <button onClick={()=>{setPostsByPlatform(prev=>({...prev,[activePlatform]:{...post,content:editContent}}));setEditingPost(null)}}
                                  className="px-3 py-1.5 text-xs font-bold bg-[#c8a96e] text-white rounded-lg">✓ Valider</button>
                                <button onClick={()=>setEditingPost(null)} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500">Annuler</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                              {post.hashtags.length>0 && (
                                <div className="flex flex-wrap gap-1">
                                  {post.hashtags.map((h,i)=><span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{background:`${pd.color}15`,color:pd.color}}>{h}</span>)}
                                </div>
                              )}
                            </>
                          )}
                          {post && editingPost!==activePlatform && (
                            <div className="flex gap-2 pt-1">
                              <button onClick={()=>copy(`${post.content}\n\n${post.hashtags.join(' ')}`,activePlatform)}
                                className="flex-1 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                                {copiedPost===activePlatform?'✓ Copié !':'📋 Copier'}
                              </button>
                              <button onClick={()=>{setEditingPost(activePlatform);setEditContent(post.content)}}
                                className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500">✏️</button>
                              <button onClick={()=>void savePost(activePlatform)} disabled={savedPosts.includes(activePlatform)}
                                className={`px-3 py-1.5 text-xs rounded-lg font-bold ${savedPosts.includes(activePlatform)?'bg-green-50 text-green-600 border border-green-200':'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                                {savedPosts.includes(activePlatform)?'✓':'💾'}
                              </button>
                              <button onClick={()=>{setPubForm(p=>({...p,platform:activePlatform,content:`${post.content}\n\n${post.hashtags.join(' ')}`,image_url:post.image_url??platformImages[activePlatform]??''}));setTab('publication')}}
                                className="px-3 py-1.5 text-xs bg-[#1a1918] text-[#c8a96e] rounded-lg font-bold">📅</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ════ TAB 5: PUBLICATION ════ */}
            {tab==='publication' && (
              <div className="max-w-2xl space-y-5">
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#1a1918]">📅 Programmer une publication</h3>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Plateforme</p>
                    <div className="flex flex-wrap gap-2">
                      {([...Object.entries(PD), ['all', {label:'Toutes',icon:'🌐',color:'#666',bg:'#f5f5f5'}]] as [string,{label:string;icon:string;color:string}][]).map(([p,pd])=>(
                        <button key={p} onClick={()=>setPubForm(prev=>({...prev,platform:p as Platform|'all'}))}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl border-2 font-semibold transition-all ${pubForm.platform===p?'border-[#c8a96e] bg-amber-50 text-[#1a1918]':'border-zinc-100 text-zinc-400 hover:border-zinc-300'}`}>
                          {pd.icon} {pd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Texte *</p>
                    <textarea value={pubForm.content} onChange={e=>setPubForm(p=>({...p,content:e.target.value}))} rows={5}
                      className={inp+' resize-none'} placeholder="Colle un post depuis l'onglet Posts → bouton 📅, ou écris directement ici"/>
                    <p className="text-[10px] text-zinc-400 mt-1">{pubForm.content.length} car.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Image (URL)</p>
                    <div className="flex gap-2">
                      <input value={pubForm.image_url} onChange={e=>setPubForm(p=>({...p,image_url:e.target.value}))} className={inp+' flex-1'} placeholder="https://…"/>
                      {selected.cover_image_url && <button onClick={()=>setPubForm(p=>({...p,image_url:selected.cover_image_url!}))} className="text-xs px-2.5 py-2 border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50">🖼 Cover</button>}
                    </div>
                    {pubForm.image_url && <img src={pubForm.image_url} alt="" className="mt-2 h-16 w-28 object-cover rounded-lg"/>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Date de publication</p>
                    <input type="datetime-local" value={pubForm.scheduled_for} onChange={e=>setPubForm(p=>({...p,scheduled_for:e.target.value}))} className={inp}/>
                    {!pubForm.scheduled_for && <p className="text-[10px] text-zinc-400 mt-0.5">Vide = sauvegardé en brouillon</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Notes internes</p>
                    <input value={pubForm.notes} onChange={e=>setPubForm(p=>({...p,notes:e.target.value}))} className={inp} placeholder="Ex: Poster lundi matin, vérifier hashtags…"/>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    <p className="text-[10px] text-zinc-400 text-center">⚙️ Publication automatique vers les réseaux sociaux — disponible dans une prochaine version</p>
                  </div>
                  <button onClick={()=>void savePub()} disabled={savingPub||!pubForm.content}
                    className="w-full py-3 bg-[#1a1918] text-[#c8a96e] font-bold text-sm rounded-xl disabled:opacity-40">
                    {savingPub?'…':pubForm.scheduled_for?'📅 Programmer':'💾 Sauvegarder brouillon'}
                  </button>
                </div>
                {publications.length>0 && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Publications enregistrées</h3>
                    <div className="space-y-3">
                      {publications.map(pub=>{
                        const pd = pub.platform==='all'?{icon:'🌐',label:'Toutes',color:'#666'}:PD[pub.platform as Platform]
                        return (
                          <div key={pub.id} className="bg-white border border-zinc-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{pd.icon}</span>
                              <span className="text-xs font-semibold" style={{color:pd.color}}>{pd.label}</span>
                              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${pub.status==='published'?'bg-green-50 text-green-600':pub.status==='scheduled'?'bg-blue-50 text-blue-500':'bg-zinc-100 text-zinc-500'}`}>
                                {pub.status==='scheduled'&&pub.scheduled_for?`📅 ${new Date(pub.scheduled_for).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:pub.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 line-clamp-2">{pub.content}</p>
                            {pub.notes && <p className="text-[10px] text-zinc-400 mt-1 italic">{pub.notes}</p>}
                            {pub.image_url && <img src={pub.image_url} alt="" className="mt-2 h-12 w-20 object-cover rounded-lg"/>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>{/* end tab body */}
        </div>
      )}
    </div>
  )
}
