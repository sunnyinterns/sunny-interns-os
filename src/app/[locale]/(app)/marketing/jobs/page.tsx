'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────
type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type JobTab = 'infos' | 'visuels' | 'posts' | 'publication'

interface Job {
  id: string; title: string; public_title: string | null; status: string
  location: string | null; wished_duration_months: number | null
  description: string | null; public_description: string | null
  public_hook: string | null; public_vibe: string | null
  public_perks: string[] | null; public_hashtags: string[] | null
  seo_slug: string | null; cv_drop_enabled: boolean | null
  cover_image_url: string | null; is_public: boolean | null
  missions: string[] | null; profile_sought: string | null
  companies?: { id: string; name: string; logo_url: string | null } | null
  _social_posts?: SocialPost[]
}

interface SocialPost {
  id: string; platform: Platform; lang: Lang; tone: string | null
  content: string; hashtags: string[]; image_url: string | null; status: string
  created_at: string
}

interface Publication {
  id: string; platform: Platform | 'all'; content: string
  image_url: string | null; video_url: string | null
  scheduled_for: string | null; status: string; notes: string | null; created_at: string
}

const PD: Record<Platform, { label: string; icon: string; color: string; bg: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C', bg: '#fdf0f4' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: '#0077B5', bg: '#f0f7fc' },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#333',    bg: '#f5f5f5' },
  facebook:  { label: 'Facebook',  icon: '👥', color: '#1877F2', bg: '#f0f4ff' },
}

function imagePrompt(job: Job, platform: Platform): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise'
  const vibe = job.public_vibe ? `Atmosphere: ${job.public_vibe}.` : ''
  const perks = job.public_perks?.filter(Boolean).slice(0, 3).join(', ') ?? ''
  const styles: Record<Platform, string> = {
    instagram: 'vibrant tropical lifestyle, golden hour, young professional in Bali, warm orange #F5A623 tones, photorealistic editorial',
    linkedin: 'clean professional tropical coworking, brand colors gold #F5A623 and dark #1A1918, minimalist, photorealistic',
    tiktok: 'dynamic energetic, young 25yo professional, bold colors, Bali adventure meets career, photorealistic',
    facebook: 'friendly approachable, professional casual, Bali tropical, warm golden community feel, photorealistic',
  }
  return `Professional marketing photograph for a ${title} internship at ${company} in Bali, Indonesia. ${vibe} ${perks ? `Key selling points: ${perks}.` : ''} Style: ${styles[platform]}. Colors: warm gold #F5A623 accents natural in scene. NO text, logos, watermarks. Ultra high quality, editorial photography.`
}

function textPrompt(job: Job, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise partenaire'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'plusieurs mois'
  const hook = job.public_hook ? `\nACCROCHE IMPOSÉE: "${job.public_hook}"` : ''
  const vibe = job.public_vibe ? `\nAmbiance: ${job.public_vibe}` : ''
  const perks = job.public_perks?.filter(Boolean).length ? `\nAvantages: ${job.public_perks!.filter(Boolean).join(', ')}` : ''
  const tags = job.public_hashtags?.filter(Boolean).length ? `\nHashtags imposés: ${job.public_hashtags!.filter(Boolean).map(h => h.startsWith('#') ? h : '#'+h).join(' ')}` : ''
  const langLabel = lang === 'fr' ? 'français' : 'anglais'
  return `Tu es community manager pour Bali Interns, agence de stages à Bali.
Écris un post ${platform} en ${langLabel} pour:
Poste: ${title} | Entreprise: ${company} | Durée: ${duration} | Lieu: ${job.location ?? 'Bali, Indonésie'}
${job.description ? job.description.slice(0, 200) : ''}${hook}${vibe}${perks}${tags}
TON: ${tone} | ${platform === 'instagram' ? 'Hook, storytelling, emojis, 8-12 hashtags' : platform === 'linkedin' ? 'Professionnel, valeur carrière, 3-5 hashtags' : platform === 'tiktok' ? 'Hook choc ligne 1, max 150 mots' : 'Chaleureux, CTA clair, 3-5 hashtags'}
CTA: "Postuler sur bali-interns.com". Retourne UNIQUEMENT le post.`
}

// ── Main component ──────────────────────────────────────────────────────
export default function JobsContentMachine() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selected, setSelected] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'draft'>('all')
  const [tab, setTab] = useState<JobTab>('infos')
  const [loading, setLoading] = useState(true)

  // Visuels
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatingImg, setGeneratingImg] = useState<Platform | null>(null)
  const [platformImages, setPlatformImages] = useState<Partial<Record<Platform, string>>>({})

  // Posts
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin'])
  const [tone, setTone] = useState('Enthousiaste')
  const [lang, setLang] = useState<Lang>('fr')
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [savingPosts, setSavingPosts] = useState(false)
  const [savedPosts, setSavedPosts] = useState(false)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [copiedPost, setCopiedPost] = useState<string | null>(null)

  // Vidéo
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // Publication
  const [publications, setPublications] = useState<Publication[]>([])
  const [pubForm, setPubForm] = useState({
    platform: 'instagram' as Platform | 'all',
    content: '', image_url: '', scheduled_for: '', notes: ''
  })
  const [savingPub, setSavingPub] = useState(false)

  // Inline edit du job public
  const [editingJob, setEditingJob] = useState(false)
  const [jobDraft, setJobDraft] = useState<Partial<Job>>({})
  const [savingJob, setSavingJob] = useState(false)
  const [toggling, setToggling] = useState(false)

  const TONES = ['Enthousiaste', 'Professionnel', 'Décontracté', 'Inspirant', 'Urgence']

  // ── Load jobs ──
  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: Job[]) => { setJobs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── Reset state when job changes ──
  useEffect(() => {
    if (!selected) return
    setPosts([]); setSavedPosts(false); setVideoUrl(null)
    setPlatformImages({}); setPublications([])
    setJobDraft({
      public_title: selected.public_title ?? '',
      public_hook: selected.public_hook ?? '',
      public_vibe: selected.public_vibe ?? '',
      public_perks: selected.public_perks ?? [],
      public_hashtags: selected.public_hashtags ?? [],
      seo_slug: selected.seo_slug ?? '',
      cv_drop_enabled: selected.cv_drop_enabled ?? false,
      public_description: selected.public_description ?? '',
    })
    // Load posts + publications from DB
    fetch(`/api/content/posts?job_id=${selected.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: SocialPost[]) => setPosts(d))
      .catch(() => {})
    fetch(`/api/content/publications?job_id=${selected.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: Publication[]) => setPublications(d))
      .catch(() => {})
  }, [selected])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const mq = !q || (j.public_title ?? j.title).toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q)
    const mf = filter === 'all' || (filter === 'public' ? j.is_public : !j.is_public)
    return mq && mf
  })

  // ── Toggle public ──
  const togglePublic = useCallback(async (job: Job) => {
    setToggling(true)
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: !job.is_public }),
    })
    const updated = { ...job, is_public: !job.is_public }
    setJobs(prev => prev.map(j => j.id === job.id ? updated : j))
    if (selected?.id === job.id) setSelected(updated)
    setToggling(false)
  }, [selected])

  // ── Save infos publiques ──
  const saveJobPublic = useCallback(async () => {
    if (!selected) return
    setSavingJob(true)
    const res = await fetch(`/api/jobs/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobDraft),
    })
    if (res.ok) {
      const updated = { ...selected, ...jobDraft }
      setJobs(prev => prev.map(j => j.id === selected.id ? updated : j))
      setSelected(updated)
      setEditingJob(false)
    }
    setSavingJob(false)
  }, [selected, jobDraft])


  // ── Générer cover image ──
  const generateCover = useCallback(async () => {
    if (!selected) return
    setGeneratingCover(true)
    try {
      const prompt = imagePrompt(selected, 'instagram')
      const res = await fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, job_id: selected.id, platform: 'cover' }) })
      const d = await res.json() as { image_url?: string }
      if (d.image_url) {
        await fetch(`/api/jobs/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cover_image_url: d.image_url }) })
        const updated = { ...selected, cover_image_url: d.image_url }
        setSelected(updated); setJobs(prev => prev.map(j => j.id === selected.id ? updated : j))
      }
    } catch { /* ignore */ }
    setGeneratingCover(false)
  }, [selected])

  // ── Générer image plateforme ──
  const generatePlatformImage = useCallback(async (platform: Platform) => {
    if (!selected) return
    setGeneratingImg(platform)
    try {
      const prompt = imagePrompt(selected, platform)
      const res = await fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, job_id: selected.id, platform }) })
      const d = await res.json() as { image_url?: string }
      if (d.image_url) setPlatformImages(prev => ({ ...prev, [platform]: d.image_url }))
    } catch { /* ignore */ }
    setGeneratingImg(null)
  }, [selected])

  // ── Générer textes ──
  const generatePosts = useCallback(async () => {
    if (!selected) return
    setGeneratingPosts(true); setSavedPosts(false)
    const newPosts: SocialPost[] = []
    await Promise.all(selectedPlatforms.map(async platform => {
      try {
        const res = await fetch('/api/anthropic/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: textPrompt(selected, platform, tone, lang) }] }) })
        const data = await res.json() as { content: { type: string; text: string }[] }
        const raw = data.content?.find(c => c.type === 'text')?.text ?? ''
        const hashtags = raw.match(/#[\w\u00C0-\u017F]+/g) ?? []
        const content = raw.replace(/#[\w\u00C0-\u017F]+/g, '').trim()
        newPosts.push({ id: `${Date.now()}-${platform}`, platform, lang, tone, content, hashtags, image_url: platformImages[platform] ?? null, status: 'draft', created_at: new Date().toISOString() })
      } catch { /* ignore */ }
    }))
    setPosts(newPosts); setGeneratingPosts(false)
  }, [selected, selectedPlatforms, tone, lang, platformImages])

  // ── Sauvegarder posts ──
  const savePosts = useCallback(async () => {
    if (!selected) return
    setSavingPosts(true)
    await Promise.all(posts.map(p => fetch('/api/content/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, job_id: selected.id }) })))
    setSavedPosts(true); setSavingPosts(false)
  }, [posts, selected])

  // ── Générer vidéo ──
  const generateVideo = useCallback(async () => {
    if (!selected) return
    setGeneratingVideo(true)
    try {
      const res = await fetch('/api/content/generate-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: selected.id, format: 'square' }) })
      const d = await res.json() as { video_url?: string }
      if (d.video_url) setVideoUrl(d.video_url)
    } catch { /* ignore */ }
    setGeneratingVideo(false)
  }, [selected])

  // ── Sauvegarder publication ──
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

  function copy(text: string, id: string) { void navigator.clipboard.writeText(text); setCopiedPost(id); setTimeout(() => setCopiedPost(null), 2000) }


  // ── RENDER ────────────────────────────────────────────────────────────
  const cls = { input: 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white' }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#fafaf7]">

      {/* ── LEFT PANEL: Job list ── */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-100 bg-white flex flex-col">
        <div className="p-3 border-b border-zinc-50 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-[#1a1918]">Jobs & Contenu</h1>
            <span className="text-[10px] text-zinc-400">{jobs.filter(j => j.is_public).length} publiés</span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c8a96e]" />
          <div className="flex gap-1">
            {(['all', 'public', 'draft'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1 text-[10px] rounded-lg font-medium transition-all ${filter === f ? 'bg-[#c8a96e] text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                {f === 'all' ? 'Tous' : f === 'public' ? '🟢' : '⚫'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-50 rounded-xl animate-pulse" />)}</div>
          : filtered.length === 0 ? <p className="p-4 text-xs text-zinc-400 text-center">Aucun job</p>
          : filtered.map(job => (
            <button key={job.id} onClick={() => { setSelected(job); setTab('infos') }}
              className={`w-full text-left p-3 border-b border-zinc-50 hover:bg-zinc-50 transition-all ${selected?.id === job.id ? 'bg-amber-50 border-l-2 border-l-[#c8a96e]' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-sm">
                  {job.cover_image_url ? <img src={job.cover_image_url} alt="" className="w-full h-full object-cover" /> : '🌴'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${job.is_public ? 'bg-green-500' : 'bg-zinc-300'}`} />
                    <p className="text-xs font-semibold text-[#1a1918] truncate">{job.public_title ?? job.title}</p>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{job.companies?.name ?? '—'}{job.wished_duration_months ? ` · ${job.wished_duration_months}m` : ''}</p>
                  {job.public_hook && <p className="text-[10px] text-[#c8a96e] italic truncate">&ldquo;{job.public_hook}&rdquo;</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: Job hub ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-center text-zinc-400">
          <div><p className="text-4xl mb-3">💼</p><p className="text-sm font-medium">Sélectionne un job</p><p className="text-xs mt-1">pour gérer sa page publique et son contenu</p></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Job header */}
          <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
              {selected.cover_image_url ? <img src={selected.cover_image_url} alt="" className="w-full h-full object-cover" /> : '🌴'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1a1918] truncate">{selected.public_title ?? selected.title}</p>
              <p className="text-xs text-zinc-400">{selected.companies?.name}{selected.wished_duration_months ? ` · ${selected.wished_duration_months} mois` : ''}{selected.location ? ` · ${selected.location}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selected.is_public && selected.seo_slug && (
                <a href={`/jobs/${selected.seo_slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">↗ Page</a>
              )}
              <button onClick={() => void togglePublic(selected)} disabled={toggling}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${selected.is_public ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-700'}`}>
                {toggling ? '…' : selected.is_public ? '🟢 Publiée' : '⚫ Publier'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 py-2 bg-white border-b border-zinc-100">
            {([['infos', '📋 Infos publiques'], ['visuels', '🎨 Visuels'], ['posts', '✍️ Posts'], ['publication', '📅 Publication']] as [JobTab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t ? 'bg-[#1a1918] text-[#c8a96e]' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── TAB: INFOS PUBLIQUES ── */}
            {tab === 'infos' && (
              <div className="max-w-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1a1918]">Informations publiques</h2>
                  {editingJob ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingJob(false)} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-500">Annuler</button>
                      <button onClick={() => void saveJobPublic()} disabled={savingJob} className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-lg font-semibold disabled:opacity-50">{savingJob ? '…' : '💾 Sauvegarder'}</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingJob(true)} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">✏️ Modifier</button>
                  )}
                </div>

                {[
                  { key: 'public_title', label: '🏷 Titre public', placeholder: 'Titre affiché sur la page publique' },
                  { key: 'public_hook', label: '🎣 Accroche', placeholder: '"Tu veux bosser dans un resort 5⭐ à Bali ?"' },
                  { key: 'public_vibe', label: '🌴 Ambiance', placeholder: 'Startup surf, équipe internationale, bureau face mer' },
                  { key: 'seo_slug', label: '🔗 Slug URL', placeholder: 'marketing-digital-resort-bali-4mois' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">{label}</label>
                    {editingJob ? (
                      <input className={cls.input} placeholder={placeholder} value={(jobDraft[key as keyof typeof jobDraft] as string) ?? ''}
                        onChange={e => setJobDraft(p => ({ ...p, [key]: e.target.value }))} />
                    ) : (
                      <p className="text-sm text-zinc-700">{(selected[key as keyof Job] as string) || <span className="text-zinc-300 italic">Non renseigné</span>}</p>
                    )}
                  </div>
                ))}

                {/* Description publique */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">📝 Description publique</label>
                  {editingJob ? (
                    <textarea className={cls.input + ' resize-none'} rows={4} value={(jobDraft.public_description as string) ?? ''}
                      onChange={e => setJobDraft(p => ({ ...p, public_description: e.target.value }))} />
                  ) : (
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selected.public_description || <span className="text-zinc-300 italic">Non renseignée</span>}</p>
                  )}
                </div>

                {/* Avantages */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-2">✨ Avantages</label>
                  {editingJob ? (
                    <div className="space-y-1.5">
                      {[...(jobDraft.public_perks ?? []), ''].map((perk, i) => (
                        <div key={i} className="flex gap-2">
                          <input className={cls.input + ' flex-1'} placeholder={`Avantage ${i+1}`} value={perk}
                            onChange={e => { const next = [...(jobDraft.public_perks ?? [])]; if (i < next.length) next[i] = e.target.value; else next.push(e.target.value); setJobDraft(p => ({ ...p, public_perks: next.filter((x, j) => x || j < next.length - 1) })) }} />
                          {i < (jobDraft.public_perks?.length ?? 0) && <button type="button" onClick={() => setJobDraft(p => ({ ...p, public_perks: (p.public_perks ?? []).filter((_, j) => j !== i) }))} className="text-zinc-300 hover:text-red-400">✕</button>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(selected.public_perks ?? []).filter(Boolean).map((p, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">→ {p}</span>)}
                      {!(selected.public_perks ?? []).length && <span className="text-zinc-300 text-sm italic">Aucun avantage</span>}
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1"># Hashtags custom</label>
                  {editingJob ? (
                    <input className={cls.input} placeholder="BaliInterns, StageMarketing" value={(jobDraft.public_hashtags ?? []).join(', ')}
                      onChange={e => setJobDraft(p => ({ ...p, public_hashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean) }))} />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.public_hashtags ?? []).filter(Boolean).map((h, i) => <span key={i} className="text-xs text-[#c8a96e] font-medium">{h.startsWith('#') ? h : `#${h}`}</span>)}
                      {!(selected.public_hashtags ?? []).length && <span className="text-zinc-300 text-sm italic">Aucun hashtag</span>}
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex gap-4 pt-2">
                  {[{ key: 'cv_drop_enabled', label: '📄 CV Drop activé' }].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <div className={`w-8 h-4 rounded-full transition-colors relative ${(editingJob ? jobDraft[key as keyof typeof jobDraft] : selected[key as keyof Job]) ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`}
                        onClick={() => editingJob && setJobDraft(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${(editingJob ? jobDraft[key as keyof typeof jobDraft] : selected[key as keyof Job]) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-xs text-zinc-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: VISUELS ── */}
            {tab === 'visuels' && (
              <div className="max-w-3xl space-y-6">
                {/* Cover image */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="text-sm font-bold text-[#1a1918]">🖼 Image de couverture</h3><p className="text-xs text-zinc-400">Utilisée sur la page publique du job + OG image</p></div>
                    <button onClick={() => void generateCover()} disabled={generatingCover}
                      className="text-xs px-3 py-2 bg-[#1a1918] text-[#c8a96e] rounded-xl font-bold disabled:opacity-50 flex items-center gap-1.5">
                      {generatingCover ? <><span className="w-3 h-3 border border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Génération…</> : '🎨 Générer avec Nano Banana'}
                    </button>
                  </div>
                  {selected.cover_image_url ? (
                    <div className="relative rounded-xl overflow-hidden aspect-video">
                      <img src={selected.cover_image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <a href={selected.cover_image_url} download className="px-2 py-1 text-[10px] bg-black/60 text-white rounded-lg">↓ DL</a>
                        <button onClick={() => void generateCover()} disabled={generatingCover} className="px-2 py-1 text-[10px] bg-black/60 text-white rounded-lg">🔄 Regénérer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center border-2 border-dashed border-amber-200">
                      <p className="text-sm text-amber-400">Aucune image — clique pour générer</p>
                    </div>
                  )}
                </div>

                {/* Images par plateforme */}
                <div>
                  <h3 className="text-sm font-bold text-[#1a1918] mb-3">📱 Visuels par plateforme</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.entries(PD) as [Platform, typeof PD[Platform]][]).map(([platform, pd]) => {
                      const imgUrl = platformImages[platform]
                      return (
                        <div key={platform} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-50" style={{ background: pd.bg }}>
                            <span>{pd.icon}</span>
                            <span className="text-xs font-bold" style={{ color: pd.color }}>{pd.label}</span>
                          </div>
                          <div className="relative aspect-square bg-zinc-50 flex items-center justify-center">
                            {imgUrl ? (
                              <><img src={imgUrl} alt="" className="w-full h-full object-cover" />
                              <a href={imgUrl} download className="absolute bottom-2 right-2 px-2 py-1 text-[10px] bg-black/60 text-white rounded-lg">↓ DL</a></>
                            ) : generatingImg === platform ? (
                              <div className="text-center"><span className="w-6 h-6 border-2 border-zinc-300 border-t-[#c8a96e] rounded-full animate-spin block mx-auto mb-2" /><p className="text-[10px] text-zinc-400">Nano Banana…</p></div>
                            ) : (
                              <p className="text-[10px] text-zinc-300">Pas encore générée</p>
                            )}
                          </div>
                          <div className="p-2">
                            <button onClick={() => void generatePlatformImage(platform)} disabled={generatingImg === platform}
                              className="w-full py-1.5 text-[11px] font-semibold bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 disabled:opacity-50">
                              {imgUrl ? '🔄 Regénérer' : '🎨 Générer'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Vidéo */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div><h3 className="text-sm font-bold text-[#1a1918]">🎬 Vidéo Remotion</h3><p className="text-xs text-zinc-400">Format carré 1080×1080 · 5 secondes · brand colors</p></div>
                    <button onClick={() => void generateVideo()} disabled={generatingVideo}
                      className="text-xs px-3 py-2 bg-[#1a1918] text-[#c8a96e] rounded-xl font-bold disabled:opacity-50 flex items-center gap-1.5">
                      {generatingVideo ? <><span className="w-3 h-3 border border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Rendu…</> : '🎬 Générer vidéo'}
                    </button>
                  </div>
                  {videoUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                      <span className="text-2xl">🎬</span>
                      <div className="flex-1"><p className="text-xs font-semibold">Vidéo générée ✅</p><p className="text-[10px] text-zinc-400">Format MP4 · Remotion · {selected.public_title ?? selected.title}</p></div>
                      <a href={videoUrl} download className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-lg font-semibold">↓ Télécharger</a>
                    </div>
                  ) : (
                    <div className="h-16 bg-zinc-50 rounded-xl flex items-center justify-center"><p className="text-xs text-zinc-300">Pas encore générée</p></div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: POSTS ── */}
            {tab === 'posts' && (
              <div className="max-w-2xl space-y-5">
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#1a1918]">Configuration</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Plateformes</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(PD) as [Platform, typeof PD[Platform]][]).map(([p, pd]) => (
                        <button key={p} onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl border-2 font-semibold transition-all ${selectedPlatforms.includes(p) ? 'border-[#c8a96e] bg-amber-50 text-[#1a1918]' : 'border-zinc-100 text-zinc-400'}`}>
                          {pd.icon} {pd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ton</label>
                      <div className="flex flex-wrap gap-1">
                        {['Enthousiaste','Professionnel','Décontracté','Inspirant','Urgence'].map(t => (
                          <button key={t} onClick={() => setTone(t)} className={`px-2 py-1 text-[11px] rounded-lg border transition-all ${tone === t ? 'border-[#c8a96e] bg-amber-50 font-semibold' : 'border-zinc-100 text-zinc-400'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Langue</label>
                      <div className="flex gap-2">
                        {(['fr', 'en'] as Lang[]).map(l => (
                          <button key={l} onClick={() => setLang(l)} className={`px-3 py-1.5 text-xs rounded-xl border-2 font-semibold transition-all ${lang === l ? 'border-[#c8a96e] bg-amber-50' : 'border-zinc-100 text-zinc-400'}`}>
                            {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => void generatePosts()} disabled={generatingPosts || selectedPlatforms.length === 0}
                      className="flex-1 py-2.5 bg-[#1a1918] text-[#c8a96e] font-bold text-sm rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
                      {generatingPosts ? <><span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Claude génère…</> : `✍️ Générer ${selectedPlatforms.length} post${selectedPlatforms.length > 1 ? 's' : ''}`}
                    </button>
                    {posts.length > 0 && (savedPosts ? <span className="self-center text-xs text-green-600 font-semibold">✅ Sauvegardé</span> : (
                      <button onClick={() => void savePosts()} disabled={savingPosts} className="px-4 py-2.5 bg-[#c8a96e] text-white font-bold text-sm rounded-xl disabled:opacity-50">{savingPosts ? '…' : '💾 Sauvegarder'}</button>
                    ))}
                  </div>
                </div>

                {posts.map(post => {
                  const pd = PD[post.platform]
                  return (
                    <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-50" style={{ background: pd.bg }}>
                        <span>{pd.icon}</span>
                        <span className="text-xs font-bold" style={{ color: pd.color }}>{pd.label}</span>
                        <span className="text-[10px] text-zinc-400">{post.lang.toUpperCase()} · {post.tone}</span>
                        <span className="ml-auto text-[10px] text-zinc-300">{post.content.length} car.</span>
                      </div>
                      <div className={`${post.image_url ? 'grid grid-cols-2' : ''}`}>
                        {post.image_url && <img src={post.image_url} alt="" className="w-full h-48 object-cover" />}
                        <div className="p-4 space-y-3">
                          {editingPost === post.id ? (
                            <>
                              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={5}
                                className="w-full text-sm text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                              <button onClick={() => { setPosts(prev => prev.map(p => p.id === post.id ? { ...p, content: editContent } : p)); setEditingPost(null) }}
                                className="px-3 py-1.5 text-xs font-bold bg-[#c8a96e] text-white rounded-lg">✓ Valider</button>
                            </>
                          ) : <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap flex-1">{post.content}</p>}
                          {post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((h, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${pd.color}15`, color: pd.color }}>{h}</span>)}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, post.id)} className="flex-1 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                              {copiedPost === post.id ? '✓ Copié !' : '📋 Copier'}
                            </button>
                            <button onClick={() => { setEditingPost(post.id); setEditContent(post.content) }} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500">✏️</button>
                            <button onClick={() => { setPubForm(p => ({ ...p, platform: post.platform, content: `${post.content}\n\n${post.hashtags.join(' ')}`, image_url: post.image_url ?? '' })); setTab('publication') }}
                              className="px-3 py-1.5 text-xs bg-[#1a1918] text-[#c8a96e] rounded-lg font-semibold">📅</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── TAB: PUBLICATION ── */}
            {tab === 'publication' && (
              <div className="max-w-2xl space-y-5">
                {/* Nouvelle publication */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#1a1918]">📅 Programmer une publication</h3>

                  {/* Plateforme */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Plateforme</label>
                    <div className="flex flex-wrap gap-2">
                      {([...Object.entries(PD), ['all', { label: 'Toutes', icon: '🌐', color: '#666', bg: '#f5f5f5' }]] as [string, { label: string; icon: string; color: string }][]).map(([p, pd]) => (
                        <button key={p} onClick={() => setPubForm(prev => ({ ...prev, platform: p as Platform | 'all' }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl border-2 font-semibold transition-all ${pubForm.platform === p ? 'border-[#c8a96e] bg-amber-50 text-[#1a1918]' : 'border-zinc-100 text-zinc-400'}`}>
                          {pd.icon} {pd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Texte */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Texte du post *</label>
                    <textarea value={pubForm.content} onChange={e => setPubForm(p => ({ ...p, content: e.target.value }))} rows={5}
                      className={cls.input + ' resize-none'} placeholder="Texte accompagnateur… (ou génère depuis l'onglet Posts)" />
                    <p className="text-[10px] text-zinc-400 mt-1">{pubForm.content.length} caractères</p>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Image (URL)</label>
                    <div className="flex gap-2">
                      <input value={pubForm.image_url} onChange={e => setPubForm(p => ({ ...p, image_url: e.target.value }))}
                        className={cls.input + ' flex-1'} placeholder="https://… ou laisser vide" />
                      {selected.cover_image_url && (
                        <button onClick={() => setPubForm(p => ({ ...p, image_url: selected.cover_image_url! }))}
                          className="text-xs px-2 py-2 border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50 whitespace-nowrap">🖼 Cover</button>
                      )}
                    </div>
                    {pubForm.image_url && <img src={pubForm.image_url} alt="" className="mt-2 h-16 w-28 object-cover rounded-lg" />}
                  </div>

                  {/* Date programmée */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Date de publication</label>
                    <div className="flex gap-2 items-center">
                      <input type="datetime-local" value={pubForm.scheduled_for} onChange={e => setPubForm(p => ({ ...p, scheduled_for: e.target.value }))}
                        className={cls.input + ' flex-1'} />
                      {pubForm.scheduled_for && <span className="text-[10px] text-[#c8a96e] font-semibold">📅 Programmé</span>}
                      {!pubForm.scheduled_for && <span className="text-[10px] text-zinc-400">= Brouillon si vide</span>}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Notes internes</label>
                    <input value={pubForm.notes} onChange={e => setPubForm(p => ({ ...p, notes: e.target.value }))}
                      className={cls.input} placeholder="Ex: Poster le lundi matin, vérifier les hashtags…" />
                  </div>

                  <button onClick={() => void savePub()} disabled={savingPub || !pubForm.content}
                    className="w-full py-2.5 bg-[#1a1918] text-[#c8a96e] font-bold text-sm rounded-xl disabled:opacity-40">
                    {savingPub ? '…' : pubForm.scheduled_for ? '📅 Programmer la publication' : '💾 Sauvegarder en brouillon'}
                  </button>
                </div>

                {/* Liste des publications existantes */}
                {publications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Publications</h3>
                    <div className="space-y-3">
                      {publications.map(pub => {
                        const pd = pub.platform === 'all' ? { icon: '🌐', label: 'Toutes', color: '#666' } : PD[pub.platform as Platform]
                        return (
                          <div key={pub.id} className="bg-white border border-zinc-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{pd.icon}</span>
                              <span className="text-xs font-semibold" style={{ color: pd.color }}>{pd.label}</span>
                              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${pub.status === 'published' ? 'bg-green-50 text-green-600' : pub.status === 'scheduled' ? 'bg-blue-50 text-blue-500' : 'bg-zinc-100 text-zinc-500'}`}>
                                {pub.status === 'scheduled' ? `📅 ${pub.scheduled_for ? new Date(pub.scheduled_for).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}` : pub.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 line-clamp-2">{pub.content}</p>
                            {pub.notes && <p className="text-[10px] text-zinc-400 mt-1 italic">{pub.notes}</p>}
                            {pub.image_url && <img src={pub.image_url} alt="" className="mt-2 h-12 w-20 object-cover rounded-lg" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>{/* end tab content */}
        </div>
      )}
    </div>
  )
}
