'use client'
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Remotion Player — chargé côté client uniquement
const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(m => ({ default: m.Player })),
  { ssr: false }
)

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type Status = 'draft' | 'ready' | 'published'

interface Job {
  id: string; title: string; public_title: string | null
  description: string | null; location: string | null
  wished_duration_months: number | null
  companies?: { id: string; name: string } | null
}

interface SocialPost {
  id: string; job_id: string | null; platform: Platform; lang: Lang; tone: string | null
  content: string; hashtags: string[]; image_url: string | null; image_prompt: string | null
  status: Status; created_at: string
  jobs?: { title: string; public_title: string | null; companies?: { name: string } | null } | null
}

const PLATFORMS: { key: Platform; label: string; icon: string; color: string; maxLen: number; ratio: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', maxLen: 2200, ratio: '1:1 ou 4:5' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: '💼', color: '#0077B5', maxLen: 3000, ratio: '1.91:1' },
  { key: 'tiktok',   label: 'TikTok',    icon: '🎵', color: '#000',    maxLen: 2200, ratio: '9:16' },
  { key: 'facebook', label: 'Facebook',  icon: '👥', color: '#1877F2', maxLen: 5000, ratio: '1.91:1' },
]

const TONES = ['Professionnel', 'Enthousiaste', 'Décontracté', 'Inspirant', 'Urgence']

function imagePromptForJob(job: Job, platform: Platform): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise'
  const location = job.location ?? 'Bali, Indonésie'

  const styles: Record<Platform, string> = {
    instagram: 'vibrant tropical lifestyle photo, golden hour, young professional, Bali beach vibes, warm orange and yellow palette, Instagram-ready aesthetic',
    linkedin: 'clean professional corporate visual, modern office or tropical coworking space, warm brand colors #F5A623 and #1A1918, minimalist design',
    tiktok: 'dynamic energetic visual, young trendy vibe, bold colors, adventure and career mix, Bali nature background',
    facebook: 'friendly approachable visual, professional yet casual, Bali tropical setting, warm colors, community feel',
  }

  return `Create a ${styles[platform]} marketing image for a ${title} internship in ${company}, located in ${location}, Indonesia. 
The image should inspire young French students to apply for an internship abroad. 
Style: ${styles[platform]}. 
DO NOT include any text, logos, or watermarks in the image. 
High quality, professional marketing visual.`
}

function textPrompt(job: Job, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? 'une entreprise partenaire'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'plusieurs mois'
  const langLabel = lang === 'fr' ? 'français' : 'anglais'

  return `Tu es community manager pour Bali Interns, une agence de stages à Bali, Indonésie.
Écris un post ${platform} en ${langLabel} pour ce stage:
- Poste: ${title}
- Entreprise: ${company}
- Durée: ${duration}
- Lieu: ${job.location ?? 'Bali, Indonésie'}
${job.description ? `- Description: ${job.description.slice(0, 300)}` : ''}

Ton: ${tone}
Plateforme: ${platform}
${platform === 'instagram' ? '- Style lifestyle, emojis, storytelling, 5-10 hashtags tendance' : ''}
${platform === 'linkedin' ? '- Style professionnel, valeur ajoutée pour la carrière, 3-5 hashtags' : ''}
${platform === 'tiktok' ? '- Court, punchy, hook fort dès la 1ère ligne, max 150 mots, 3-5 hashtags tendance' : ''}
${platform === 'facebook' ? '- Accessible, CTA clair pour postuler, 3-5 hashtags' : ''}

Termine par les hashtags. Retourne UNIQUEMENT le post, rien d'autre.`
}

export default function ContentMachinePage() {
  const searchParams = useSearchParams()
  const prefilledJobId = searchParams.get('job_id')
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram'])
  const [tone, setTone] = useState('Enthousiaste')
  const [lang, setLang] = useState<Lang>('fr')
  const [withImage, setWithImage] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<Platform | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [history, setHistory] = useState<SocialPost[]>([])
  const [tab, setTab] = useState<'generate' | 'history'>('generate')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasGemini, setHasGemini] = useState<boolean | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [generatingVideo, setGeneratingVideo] = useState<'square' | 'story' | null>(null)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    // Charger les jobs ouverts
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: Job[]) => {
        setJobs(d)
        // Pré-sélectionner le job si ?job_id= dans l'URL
        if (prefilledJobId) {
          const match = (d as Job[]).find(j => j.id === prefilledJobId)
          if (match) setSelectedJob(match)
        }
      })
      .catch(() => {})

    // Vérifier si Gemini est configuré
    fetch('/api/content/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'test' }) })
      .then(r => r.json()).then((d: { error?: string }) => {
        setHasGemini(!d.error?.includes('not configured'))
      }).catch(() => setHasGemini(false))
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const d = await fetch('/api/content/posts').then(r => r.ok ? r.json() : []) as SocialPost[]
      setHistory(d)
    } catch { /* ignore */ }
    setLoadingHistory(false)
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  const generate = useCallback(async () => {
    if (!selectedJob || platforms.length === 0) return
    setGenerating(true)
    setPosts([])
    setSaved(false)
    setGenerateError(null)

    // Générer les textes plateforme par plateforme (séquentiel pour éviter rate limits)
    const results: SocialPost[] = []

    for (const platform of platforms) {
      try {
        const textRes = await fetch('/api/anthropic/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: textPrompt(selectedJob, platform, tone, lang) }],
          }),
        })

        if (!textRes.ok) {
          const err = await textRes.text()
          console.error(`[ContentMachine] Claude error for ${platform}:`, err)
          setGenerateError(`Erreur Claude pour ${platform}: ${textRes.status}`)
          continue
        }

        const textData = await textRes.json() as { content?: { type: string; text: string }[]; error?: { message: string } }

        if (textData.error) {
          setGenerateError(textData.error.message)
          continue
        }

        const raw = textData.content?.find(c => c.type === 'text')?.text ?? ''
        if (!raw) {
          setGenerateError(`Réponse vide de Claude pour ${platform}`)
          continue
        }

        const hashtags = raw.match(/#[\w\u00C0-\u017F]+/g) ?? []
        const content = raw.replace(/#[\w\u00C0-\u017F]+/g, '').trim()

        const post: SocialPost = {
          id: `${Date.now()}-${platform}`,
          job_id: selectedJob.id,
          platform,
          lang,
          tone,
          content,
          hashtags,
          image_url: null,
          image_prompt: withImage ? imagePromptForJob(selectedJob, platform) : null,
          status: 'draft',
          created_at: new Date().toISOString(),
        }
        results.push(post)

        // Mettre à jour l'UI au fur et à mesure (pas attendre la fin)
        setPosts(prev => [...prev, post])
      } catch (e) {
        console.error(`[ContentMachine] Error for ${platform}:`, e)
        setGenerateError(`Erreur réseau pour ${platform}`)
      }
    }

    setGenerating(false)

    if (results.length === 0) return

    // Générer les images EN SÉQUENCE après les textes (Gemini rate limits)
    if (withImage && hasGemini) {
      for (const post of results) {
        if (!post.image_prompt) continue
        setGeneratingImage(post.platform)
        try {
          const imgRes = await fetch('/api/content/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: post.image_prompt,
              job_id: selectedJob.id,
              platform: post.platform,
            }),
          })
          const imgData = await imgRes.json() as { image_url?: string; error?: string }
          if (imgData.image_url) {
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_url: imgData.image_url! } : p))
          } else if (imgData.error) {
            console.warn(`[ContentMachine] Image error for ${post.platform}:`, imgData.error)
          }
        } catch (e) {
          console.warn(`[ContentMachine] Image fetch error for ${post.platform}:`, e)
        }
        setGeneratingImage(null)
      }
    }
  }, [selectedJob, platforms, tone, lang, withImage, hasGemini])

  const saveAll = useCallback(async () => {
    if (posts.length === 0) return
    setSaving(true)
    try {
      await Promise.all(posts.map(post =>
        fetch('/api/content/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        })
      ))
      setSaved(true)
    } catch { /* ignore */ }
    setSaving(false)
  }, [posts])

  const updateStatus = useCallback(async (id: string, status: Status) => {
    await fetch('/api/content/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setHistory(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }, [])

  const generateImageForPost = useCallback(async (post: SocialPost) => {
    if (!post.image_prompt || !hasGemini) return
    setGeneratingImage(post.platform)
    try {
      const res = await fetch('/api/content/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: post.image_prompt, job_id: post.job_id, platform: post.platform }),
      })
      const d = await res.json() as { image_url?: string }
      if (d.image_url) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, image_url: d.image_url! } : p))
        // Mettre à jour en DB si déjà sauvegardé
        await fetch('/api/content/posts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: post.id, image_url: d.image_url }),
        })
      }
    } catch { /* ignore */ }
    setGeneratingImage(null)
  }, [hasGemini])

  const generateVideo = useCallback(async (format: 'square' | 'story') => {
    if (!selectedJob) return
    setGeneratingVideo(format)
    try {
      const res = await fetch('/api/content/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJob.id, format }),
      })
      const d = await res.json() as { video_url?: string; error?: string }
      if (d.video_url) {
        setVideoUrls(prev => ({ ...prev, [format]: d.video_url! }))
      }
    } catch { /* ignore */ }
    setGeneratingVideo(null)
  }, [selectedJob])

  function copy(text: string, id: string) {
    void navigator.clipboard.writeText(text)
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const platformInfo = (k: Platform) => PLATFORMS.find(p => p.key === k)!

  const STATUS_COLORS: Record<Status, string> = {
    draft: 'bg-zinc-100 text-zinc-500',
    ready: 'bg-blue-50 text-blue-600',
    published: 'bg-green-50 text-green-600',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">⚡ Content Machine</h1>
          <p className="text-sm text-zinc-400 mt-1">Génère des posts social media depuis tes offres de stage</p>
        </div>
        {hasGemini === false && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl">
            ⚠️ Génération d'images désactivée — configure <code>GOOGLE_AI_STUDIO_KEY</code>
          </div>
        )}
        {hasGemini === true && (
          <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl">
            ✅ Nano Banana actif
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['generate', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'generate' ? '✨ Générer' : `📋 Historique${history.length > 0 ? ` (${history.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {tab === 'generate' && (
        <div className="space-y-6">
          {/* Config panel */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-5">
            {/* Job selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Offre de stage *</label>
              <select
                value={selectedJob?.id ?? ''}
                onChange={e => setSelectedJob(jobs.find(j => j.id === e.target.value) ?? null)}
                className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white">
                <option value="">— Sélectionne une offre —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.public_title ?? j.title}{j.companies?.name ? ` @ ${j.companies.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Platforms */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Plateformes</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.key} onClick={() => setPlatforms(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${platforms.includes(p.key) ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#1a1918]' : 'border-zinc-100 text-zinc-400'}`}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Ton</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${tone === t ? 'border-[#c8a96e] bg-[#c8a96e]/10 font-semibold text-[#1a1918]' : 'border-zinc-100 text-zinc-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Langue</label>
                  <div className="flex gap-2">
                    {(['fr', 'en'] as Lang[]).map(l => (
                      <button key={l} onClick={() => setLang(l)}
                        className={`px-3 py-1.5 text-xs rounded-lg border-2 font-semibold transition-all ${lang === l ? 'border-[#c8a96e] bg-[#c8a96e]/10' : 'border-zinc-100 text-zinc-400'}`}>
                        {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={withImage} onChange={e => setWithImage(e.target.checked)}
                    className="w-4 h-4 accent-[#c8a96e]" />
                  <span className="text-sm text-zinc-600">
                    Générer image {hasGemini === false ? '(clé manquante)' : hasGemini ? '✨' : ''}
                  </span>
                </label>
              </div>
            </div>

            {/* Bouton générer */}
            <button
              onClick={() => void generate()}
              disabled={!selectedJob || platforms.length === 0 || generating}
              className="w-full py-3 text-sm font-bold bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {generating ? (
                <><span className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/>
                {withImage && hasGemini ? 'Génération texte + image en cours…' : 'Génération du texte en cours…'}</>
              ) : (
                `⚡ Générer ${platforms.length} post${platforms.length > 1 ? 's' : ''}${withImage && hasGemini ? ' + image' : ''}`
              )}
            </button>

            {/* Erreur de génération */}
            {generateError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="text-red-500 text-sm">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-red-700">Erreur de génération</p>
                  <p className="text-xs text-red-600 mt-0.5">{generateError}</p>
                </div>
                <button onClick={() => setGenerateError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            )}
          </div>

          {/* Results */}
          {posts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{posts.length} post{posts.length > 1 ? 's' : ''} générés</h2>
                <div className="flex gap-2">
                  {saved ? (
                    <span className="text-xs text-green-600 font-medium">✅ Sauvegardé</span>
                  ) : (
                    <button onClick={() => void saveAll()} disabled={saving}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
                      {saving ? '…' : '💾 Sauvegarder tout'}
                    </button>
                  )}
                </div>
              </div>

              {posts.map(post => {
                const pi = platformInfo(post.platform)
                return (
                  <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-50">
                      <span className="text-lg">{pi.icon}</span>
                      <span className="text-sm font-bold" style={{ color: pi.color }}>{pi.label}</span>
                      <span className="text-xs text-zinc-400">{pi.ratio} · max {pi.maxLen.toLocaleString()} car.</span>
                      <span className="ml-auto text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{post.lang.toUpperCase()}</span>
                    </div>

                    <div className={`${post.image_url ? 'grid grid-cols-1 sm:grid-cols-2' : ''}`}>
                      {/* Image slot */}
                      {post.image_url ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.image_url} alt="Generated" className="w-full h-64 object-cover" />
                          <div className="absolute bottom-2 right-2">
                            <a href={post.image_url} download className="px-2 py-1 text-[10px] bg-black/60 text-white rounded-lg">↓ DL</a>
                          </div>
                        </div>
                      ) : withImage && hasGemini && generatingImage === post.platform ? (
                        <div className="h-48 bg-zinc-50 flex flex-col items-center justify-center gap-2 border-r border-zinc-100">
                          <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/>
                          <p className="text-xs text-zinc-400">Image en cours…</p>
                        </div>
                      ) : null /* Pas de bouton isolé — l'image arrive automatiquement */}

                      {/* Text */}
                      <div className="p-5 flex flex-col gap-3">
                        {editingId === post.id ? (
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                            className="text-sm text-zinc-700 leading-relaxed border border-zinc-200 rounded-xl p-3 resize-none h-40 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                        ) : (
                          <p className="text-sm text-zinc-700 leading-relaxed flex-1 whitespace-pre-wrap">{post.content}</p>
                        )}

                        {/* Hashtags */}
                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.map((h, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${pi.color}15`, color: pi.color }}>{h}</span>
                            ))}
                          </div>
                        )}

                        {/* Chars */}
                        <div className="text-[11px] text-zinc-300">
                          {post.content.length + post.hashtags.join(' ').length} / {pi.maxLen} car.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, post.id)}
                            className="flex-1 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
                            {copied === post.id ? '✓ Copié' : '📋 Copier'}
                          </button>
                          {editingId === post.id ? (
                            <button onClick={() => { setPosts(prev => prev.map(p => p.id === post.id ? { ...p, content: editContent } : p)); setEditingId(null) }}
                              className="px-3 py-1.5 text-xs font-bold bg-[#c8a96e] text-white rounded-lg">Valider</button>
                          ) : (
                            <button onClick={() => { setEditingId(post.id); setEditContent(post.content) }}
                              className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">✏️ Editer</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div>
          {loadingHistory ? (
            <div className="text-center py-16 text-zinc-400">Chargement…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">Aucun post sauvegardé</p>
              <p className="text-xs mt-1">Génère des posts et clique "Sauvegarder tout"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(post => {
                const pi = platformInfo(post.platform)
                return (
                  <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex gap-4">
                    {post.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.image_url} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-sm">{pi.icon}</span>
                        <span className="text-xs font-bold" style={{ color: pi.color }}>{pi.label}</span>
                        <span className="text-[10px] text-zinc-400">{post.lang.toUpperCase()}</span>
                        {post.jobs && (
                          <span className="text-[10px] text-zinc-400 truncate">
                            · {post.jobs.public_title ?? post.jobs.title}{post.jobs.companies?.name ? ` @ ${post.jobs.companies.name}` : ''}
                          </span>
                        )}
                        <span className="ml-auto">
                          <select value={post.status} onChange={e => void updateStatus(post.id, e.target.value as Status)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[post.status]}`}>
                            <option value="draft">Brouillon</option>
                            <option value="ready">Prêt</option>
                            <option value="published">Publié</option>
                          </select>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">{post.content}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, post.id)}
                          className="text-[11px] px-2 py-1 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">
                          {copied === post.id ? '✓' : '📋 Copier'}
                        </button>
                        {post.image_url && (
                          <a href={post.image_url} download className="text-[11px] px-2 py-1 border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50">↓ Image</a>
                        )}
                        <span className="text-[10px] text-zinc-300 ml-auto">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
