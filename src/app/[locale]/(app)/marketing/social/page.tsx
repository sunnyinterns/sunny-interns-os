'use client'
import { useEffect, useState, useCallback } from 'react'

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type ContentStatus = 'draft' | 'ready' | 'published'

interface Job {
  id: string
  title: string
  public_title: string | null
  status: string
  location: string | null
  wished_duration_months: number | null
  description: string | null
  companies?: { id: string; name: string; logo_url: string | null } | null
}

interface GeneratedPost {
  id: string
  job_id: string
  job_title: string
  company_name: string
  platform: Platform
  content: string
  hashtags: string[]
  status: ContentStatus
  created_at: string
}

const PLATFORMS: { key: Platform; label: string; icon: string; maxLen: number; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '📸', maxLen: 2200, color: '#E1306C' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', maxLen: 3000, color: '#0077B5' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', maxLen: 2200, color: '#000000' },
  { key: 'facebook', label: 'Facebook', icon: '👥', maxLen: 5000, color: '#1877F2' },
]

const TONES = ['Professionnel', 'Enthousiaste', 'Décontracté', 'Inspirant', 'Urgence']

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text)
}

export default function ContentMachinePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin'])
  const [tone, setTone] = useState('Enthousiaste')
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [history, setHistory] = useState<GeneratedPost[]>([])
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate')
  const [copied, setCopied] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((data: Job[]) => { setJobs(data); setLoading(false) })
      .catch(() => setLoading(false))
    loadHistory()
  }, [])

  function loadHistory() {
    const stored = localStorage.getItem('content_machine_history')
    if (stored) {
      try { setHistory(JSON.parse(stored) as GeneratedPost[]) } catch { /* ignore */ }
    }
  }

  function saveToHistory(newPosts: GeneratedPost[]) {
    const updated = [...newPosts, ...history].slice(0, 100)
    setHistory(updated)
    localStorage.setItem('content_machine_history', JSON.stringify(updated))
  }

  const handleGenerate = useCallback(async () => {
    if (!selectedJob || selectedPlatforms.length === 0) return
    setGenerating(true)
    setPosts([])

    const job = selectedJob
    const company = job.companies?.name ?? 'notre partenaire'
    const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : 'quelques mois'
    const location = job.location ?? 'Bali'
    const jobTitle = job.public_title ?? job.title

    const prompts: { platform: Platform; prompt: string }[] = selectedPlatforms.map(platform => ({
      platform,
      prompt: `Tu es community manager pour Bali Interns, une agence de stage à Bali.
Génère un post ${platform} ${lang === 'fr' ? 'en français' : 'in English'} pour cette offre de stage.
Ton: ${tone}.
Offre: ${jobTitle} chez ${company} à ${location} — durée ${duration}.
${job.description ? `Description: ${job.description.slice(0, 300)}` : ''}

Règles:
- ${platform === 'instagram' ? 'Commence par une accroche émotionnelle, storytelling, emojis, 5-8 hashtags pertinents' : ''}
- ${platform === 'linkedin' ? 'Ton professionnel, valeur ajoutée pour la carrière, 3-5 hashtags professionnels' : ''}
- ${platform === 'tiktok' ? 'Court, punchy, humour ok, angle "life à Bali", 3-5 hashtags tendance' : ''}
- ${platform === 'facebook' ? 'Accessible, convivial, CTA clair pour postuler, 3-5 hashtags' : ''}
- Max ${PLATFORMS.find(p => p.key === platform)?.maxLen ?? 2200} caractères
- Termine toujours par un CTA (appel à l'action)
- Retourne UNIQUEMENT le post, rien d'autre. Hashtags à la fin.`,
    }))

    const newPosts: GeneratedPost[] = []

    await Promise.all(prompts.map(async ({ platform, prompt }) => {
      try {
        const response = await fetch('/api/anthropic/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        if (!response.ok) return
        const data = await response.json() as { content: { type: string; text: string }[] }
        const text = data.content.find(c => c.type === 'text')?.text ?? ''
        const hashtags = text.match(/#[\w\u00C0-\u017F]+/g) ?? []
        const cleanText = text.replace(/#[\w\u00C0-\u017F]+/g, '').trim()

        newPosts.push({
          id: `${Date.now()}-${platform}`,
          job_id: job.id,
          job_title: jobTitle,
          company_name: company,
          platform,
          content: cleanText,
          hashtags,
          status: 'draft',
          created_at: new Date().toISOString(),
        })
      } catch { /* ignore */ }
    }))

    setPosts(newPosts)
    saveToHistory(newPosts)
    setGenerating(false)
  }, [selectedJob, selectedPlatforms, tone, lang, history])

  function togglePlatform(p: Platform) {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function handleCopy(id: string, text: string) {
    copyToClipboard(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function updateHistoryStatus(id: string, status: ContentStatus) {
    const updated = history.map(p => p.id === id ? { ...p, status } : p)
    setHistory(updated)
    localStorage.setItem('content_machine_history', JSON.stringify(updated))
    if (posts.find(p => p.id === id)) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    }
  }

  const filteredHistory = statusFilter === 'all' ? history : history.filter(p => p.status === statusFilter)

  return (
    <div className="min-h-screen bg-[#fafaf7] pb-12">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Content Machine</h1>
            <p className="text-sm text-zinc-400">Génère des posts réseaux sociaux depuis les offres de stage — alimenté par Claude AI</p>
          </div>
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
            {(['generate', 'history'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-white shadow text-[#1a1918]' : 'text-zinc-500'}`}>
                {t === 'generate' ? '✨ Générer' : `📋 Historique${history.length > 0 ? ` (${history.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>
        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT — Config */}
            <div className="space-y-4">

              {/* Job selector */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Offre de stage</p>
                {loading ? (
                  <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedJob?.id ?? ''}
                    onChange={e => setSelectedJob(jobs.find(j => j.id === e.target.value) ?? null)}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  >
                    <option value="">— Choisir une offre —</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.public_title ?? j.title} {j.companies?.name ? `@ ${j.companies.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {selectedJob && (
                  <div className="mt-2 text-xs text-zinc-400 space-y-0.5">
                    {selectedJob.companies?.name && <p>🏢 {selectedJob.companies.name}</p>}
                    {selectedJob.location && <p>📍 {selectedJob.location}</p>}
                    {selectedJob.wished_duration_months && <p>⏱ {selectedJob.wished_duration_months} mois</p>}
                  </div>
                )}
              </div>

              {/* Platforms */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Plateformes</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.key} onClick={() => togglePlatform(p.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${selectedPlatforms.includes(p.key) ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                      <span>{p.icon}</span><span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Ton</p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${tone === t ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lang */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Langue</p>
                <div className="flex gap-2">
                  {(['fr', 'en'] as const).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${lang === l ? 'border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]' : 'border-zinc-200 text-zinc-600'}`}>
                      {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={() => { void handleGenerate() }}
                disabled={!selectedJob || selectedPlatforms.length === 0 || generating}
                className="w-full py-3 bg-[#1a1918] text-[#c8a96e] text-sm font-bold rounded-2xl hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />Génération en cours…</>
                ) : (
                  <>✨ Générer {selectedPlatforms.length} post{selectedPlatforms.length > 1 ? 's' : ''}</>
                )}
              </button>
            </div>

            {/* RIGHT — Generated posts */}
            <div className="lg:col-span-2 space-y-4">
              {posts.length === 0 && !generating && (
                <div className="bg-white border border-zinc-100 rounded-2xl p-12 text-center">
                  <p className="text-4xl mb-3">✨</p>
                  <p className="text-sm font-semibold text-[#1a1918] mb-1">Content Machine</p>
                  <p className="text-xs text-zinc-400">Choisissez une offre, des plateformes et cliquez sur Générer</p>
                </div>
              )}
              {generating && selectedPlatforms.map(p => {
                const platform = PLATFORMS.find(pl => pl.key === p)!
                return (
                  <div key={p} className="bg-white border border-zinc-100 rounded-2xl p-5 animate-pulse">
                    <div className="flex items-center gap-2 mb-3">
                      <span>{platform.icon}</span>
                      <span className="text-sm font-medium text-zinc-400">{platform.label} — génération…</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-zinc-100 rounded w-full" />
                      <div className="h-3 bg-zinc-100 rounded w-5/6" />
                      <div className="h-3 bg-zinc-100 rounded w-4/6" />
                    </div>
                  </div>
                )
              })}
              {posts.map(post => {
                const platform = PLATFORMS.find(p => p.key === post.platform)!
                const fullText = [post.content, ...post.hashtags].join(' ')
                return (
                  <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm font-semibold text-[#1a1918]">{platform.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.status === 'published' ? 'bg-green-100 text-[#0d9e75]' : post.status === 'ready' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {post.status === 'published' ? '✅ Publié' : post.status === 'ready' ? '🔵 Prêt' : '📝 Brouillon'}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400">{post.content.length + post.hashtags.join(' ').length} car.</span>
                    </div>
                    <p className="text-sm text-[#1a1918] whitespace-pre-wrap leading-relaxed mb-3">{post.content}</p>
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.hashtags.map(h => (
                          <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${platform.color}15`, color: platform.color }}>{h}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-zinc-100">
                      <button onClick={() => handleCopy(post.id, fullText)}
                        className="flex-1 py-2 text-xs font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                        {copied === post.id ? '✓ Copié !' : '📋 Copier'}
                      </button>
                      <select value={post.status} onChange={e => updateHistoryStatus(post.id, e.target.value as ContentStatus)}
                        className="flex-1 py-2 text-xs border border-zinc-200 rounded-xl bg-white focus:outline-none text-center">
                        <option value="draft">📝 Brouillon</option>
                        <option value="ready">🔵 Prêt à publier</option>
                        <option value="published">✅ Publié</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'draft', 'ready', 'published'] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${statusFilter === f ? 'bg-[#c8a96e]/10 border-[#c8a96e] text-[#c8a96e]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                  {f === 'all' ? 'Tous' : f === 'draft' ? '📝 Brouillons' : f === 'ready' ? '🔵 Prêts' : '✅ Publiés'}
                  {f !== 'all' && ` (${history.filter(p => p.status === f).length})`}
                </button>
              ))}
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); localStorage.removeItem('content_machine_history') }}
                  className="ml-auto px-3 py-1.5 text-xs text-red-400 border border-red-100 rounded-xl hover:bg-red-50">
                  🗑 Vider
                </button>
              )}
            </div>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">Aucun post dans l'historique</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(post => {
                  const platform = PLATFORMS.find(p => p.key === post.platform)!
                  const fullText = [post.content, ...post.hashtags].join(' ')
                  return (
                    <div key={post.id} className="bg-white border border-zinc-100 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span>{platform.icon}</span>
                            <span className="text-xs font-semibold text-[#1a1918]">{platform.label}</span>
                            <span className="text-xs text-zinc-400">·</span>
                            <span className="text-xs text-zinc-500 truncate">{post.job_title} @ {post.company_name}</span>
                            <span className="text-xs text-zinc-300">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-sm text-zinc-600 line-clamp-2">{post.content}</p>
                          {post.hashtags.length > 0 && (
                            <p className="text-xs mt-1" style={{ color: platform.color }}>{post.hashtags.slice(0, 5).join(' ')}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => handleCopy(post.id, fullText)}
                            className="text-xs px-3 py-1.5 border border-zinc-200 rounded-xl hover:bg-zinc-50">
                            {copied === post.id ? '✓' : '📋'}
                          </button>
                          <select value={post.status} onChange={e => updateHistoryStatus(post.id, e.target.value as ContentStatus)}
                            className="text-xs border border-zinc-200 rounded-xl bg-white focus:outline-none px-2 py-1.5">
                            <option value="draft">📝</option>
                            <option value="ready">🔵</option>
                            <option value="published">✅</option>
                          </select>
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
    </div>
  )
}
