'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  public_title: string | null
  status: string
  location: string | null
  wished_duration_months: number | null
  created_at: string
  is_public: boolean | null
  seo_slug: string | null
  public_hook: string | null
  public_perks: string[] | null
  cover_image_url: string | null
  cv_drop_enabled: boolean | null
  companies?: { id: string; name: string; logo_url: string | null } | null
}

export default function MarketingJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'draft'>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [generatingContent, setGeneratingContent] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetch('/api/jobs?status=open&include_public_fields=true')
      .then(r => r.ok ? r.json() : []) as Job[]
    setJobs(d)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchSearch = !q || (j.public_title ?? j.title).toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || (filter === 'public' ? j.is_public : !j.is_public)
    return matchSearch && matchFilter
  })

  const publicCount = jobs.filter(j => j.is_public).length

  function copyLink(job: Job) {
    const slug = job.seo_slug ?? job.id
    const url = `${window.location.origin}/jobs/${slug}`
    void navigator.clipboard.writeText(url)
    setCopied(job.id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function togglePublic(job: Job) {
    setToggling(job.id)
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: !job.is_public }),
    })
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_public: !j.is_public } : j))
    setToggling(null)
  }

  function openContentMachine(jobId: string) {
    setGeneratingContent(jobId)
    // Ouvrir Content Machine avec ce job pré-sélectionné
    window.location.href = `/fr/marketing/social?job_id=${jobId}`
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1a1918]">Offres publiques</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              <span className="text-green-600 font-medium">{publicCount} publiées</span>
              {' · '}{jobs.length} offres au total
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/jobs" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
              ↗ Voir les pages publiques
            </a>
            <Link href="/fr/marketing/social"
              className="text-xs px-3 py-2 bg-[#1a1918] text-[#c8a96e] rounded-xl font-semibold hover:bg-zinc-800">
              ⚡ Content Machine
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 px-4 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
          {(['all', 'public', 'draft'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs rounded-xl font-medium transition-all ${filter === f ? 'bg-[#c8a96e] text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
              {f === 'all' ? 'Toutes' : f === 'public' ? '🟢 Publiées' : '⚫ Brouillons'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400"><p className="text-4xl mb-3">💼</p><p className="text-sm">Aucune offre trouvée</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const title = job.public_title ?? job.title
              const slug = job.seo_slug ?? job.id
              const publicUrl = `/jobs/${slug}`
              return (
                <div key={job.id} className={`bg-white border rounded-2xl p-4 transition-all ${job.is_public ? 'border-green-100 shadow-sm shadow-green-50' : 'border-zinc-100'}`}>
                  <div className="flex items-start gap-4">

                    {/* Cover thumbnail */}
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                      {job.cover_image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={job.cover_image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl">🌴</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${job.is_public ? 'bg-green-500' : 'bg-zinc-300'}`} />
                        <p className="text-sm font-bold text-[#1a1918] truncate">{title}</p>
                        {job.companies?.name && <span className="text-xs text-zinc-400">@ {job.companies.name}</span>}
                        {job.cv_drop_enabled && <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">📄 CV drop</span>}
                      </div>
                      {job.public_hook && (
                        <p className="text-xs text-[#c8a96e] italic mb-1 truncate">&ldquo;{job.public_hook}&rdquo;</p>
                      )}
                      <div className="flex gap-3 text-[11px] text-zinc-400 flex-wrap">
                        {job.location && <span>📍 {job.location}</span>}
                        {job.wished_duration_months && <span>⏱ {job.wished_duration_months} mois</span>}
                        {job.public_perks && job.public_perks.filter(Boolean).length > 0 && (
                          <span>✨ {job.public_perks.filter(Boolean).slice(0,2).join(' · ')}</span>
                        )}
                        {job.seo_slug && <span className="text-zinc-300 font-mono">/jobs/{job.seo_slug}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {/* Toggle public */}
                      <button onClick={() => void togglePublic(job)} disabled={toggling === job.id}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${job.is_public ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-700'}`}>
                        {toggling === job.id ? '…' : job.is_public ? '🟢 Publiée' : '⚫ Publier'}
                      </button>
                      <div className="flex gap-1">
                        {job.is_public && (
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-center text-xs px-2 py-1.5 border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50">
                            ↗
                          </a>
                        )}
                        <button onClick={() => copyLink(job)}
                          className="flex-1 text-xs px-2 py-1.5 border border-[#c8a96e] text-[#c8a96e] rounded-xl hover:bg-[#c8a96e]/10">
                          {copied === job.id ? '✓' : '🔗'}
                        </button>
                        <button onClick={() => openContentMachine(job.id)}
                          className="flex-1 text-xs px-2 py-1.5 bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800">
                          ⚡
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Stats footer */}
        {!loading && jobs.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Publiées', value: publicCount, color: 'text-green-600' },
              { label: 'Avec CV drop', value: jobs.filter(j => j.cv_drop_enabled).length, color: 'text-blue-500' },
              { label: 'Avec accroche', value: jobs.filter(j => j.public_hook).length, color: 'text-[#c8a96e]' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-zinc-100">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
