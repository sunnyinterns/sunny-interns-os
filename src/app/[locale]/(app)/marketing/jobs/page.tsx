'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  public_title: string | null
  status: string
  location: string | null
  wished_duration_months: number | null
  description: string | null
  created_at: string
  companies?: { id: string; name: string; logo_url: string | null } | null
  contacts?: { id: string; first_name: string; last_name: string | null } | null
}

export default function MarketingJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: Job[]) => { setJobs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    return !q || (j.public_title ?? j.title).toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q)
  })

  function copyLink(jobId: string) {
    const url = `${window.location.origin}/jobs/${jobId}`
    void navigator.clipboard.writeText(url)
    setCopied(jobId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] pb-12">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Offres publiques</h1>
            <p className="text-sm text-zinc-400">{jobs.length} offres actives — partagez les liens de candidature</p>
          </div>
          <a href="/apply" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
            ↗ Page candidature
          </a>
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une offre…"
          className="w-full px-4 py-2.5 mb-4 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        />

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400"><p className="text-3xl mb-2">💼</p><p>Aucune offre</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <div key={job.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-[#1a1918]">{job.public_title ?? job.title}</p>
                    {job.companies?.name && <span className="text-xs text-zinc-400">@ {job.companies.name}</span>}
                  </div>
                  <div className="flex gap-3 text-xs text-zinc-400">
                    {job.location && <span>📍 {job.location}</span>}
                    {job.wished_duration_months && <span>⏱ {job.wished_duration_months} mois</span>}
                    <span>🗓 {new Date(job.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/fr/jobs/${job.id}`}
                    className="text-xs px-3 py-1.5 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
                    ✏️ Détails
                  </Link>
                  <button onClick={() => copyLink(job.id)}
                    className="text-xs px-3 py-1.5 bg-[#c8a96e]/10 border border-[#c8a96e] text-[#c8a96e] rounded-xl font-medium hover:bg-[#c8a96e]/20">
                    {copied === job.id ? '✓ Copié' : '🔗 Lien'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
