'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook' | 'all'
type View = 'list' | 'calendar'
type StatusFilter = 'all' | 'draft' | 'scheduled' | 'published'

interface Publication {
  id: string
  job_id: string | null
  platform: Platform
  content: string
  image_url: string | null
  scheduled_for: string | null
  status: string
  notes: string | null
  created_at: string
}

interface JobRef {
  id: string
  title: string
  public_title: string | null
  cover_image_url: string | null
  companies?: { name: string } | null
}

const PD: Record<Platform, { label: string; icon: string; color: string }> = {
  all:       { label: 'Toutes',    icon: '🌐', color: '#666' },
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: '#0077B5' },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#333' },
  facebook:  { label: 'Facebook',  icon: '👥', color: '#1877F2' },
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#f4f4f5', color: '#71717a', label: '⚪ Brouillon' },
  scheduled: { bg: '#dbeafe', color: '#1e40af', label: '📅 Programmé' },
  published: { bg: '#d1fae5', color: '#065f46', label: '✓ Publié' },
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }

export default function PostingCalendarPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [publications, setPublications] = useState<Publication[]>([])
  const [jobs, setJobs] = useState<Record<string, JobRef>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [pubsRes, jobsRes] = await Promise.all([
          fetch('/api/content/publications').then(r => r.ok ? r.json() : []),
          fetch('/api/jobs').then(r => r.ok ? r.json() : []),
        ])
        const pubs = (Array.isArray(pubsRes) ? pubsRes : []) as Publication[]
        const jobsList = (Array.isArray(jobsRes) ? jobsRes : []) as JobRef[]
        const jobMap: Record<string, JobRef> = {}
        jobsList.forEach(j => { jobMap[j.id] = j })
        setPublications(pubs)
        setJobs(jobMap)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    return publications.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      return true
    })
  }, [publications, statusFilter, platformFilter])

  const counts = useMemo(() => ({
    all: publications.length,
    draft: publications.filter(p => p.status === 'draft').length,
    scheduled: publications.filter(p => p.status === 'scheduled').length,
    published: publications.filter(p => p.status === 'published').length,
  }), [publications])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const first = startOfMonth(calendarMonth)
    const firstDow = (first.getDay() + 6) % 7 // Lundi=0
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells: { date: Date | null; pubs: Publication[] }[] = []
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, pubs: [] })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d)
      const dayStr = date.toISOString().slice(0, 10)
      const pubs = filtered.filter(p => p.scheduled_for && p.scheduled_for.slice(0, 10) === dayStr)
      cells.push({ date, pubs })
    }
    return cells
  }, [calendarMonth, filtered])

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">📅 Posting Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {counts.all} publications · {counts.scheduled} programmées · {counts.published} publiées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${view === 'list' ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200'}`}
          >
            📋 Liste
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${view === 'calendar' ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200'}`}
          >
            📅 Calendrier
          </button>
        </div>
      </div>

      {/* Filtres statut + plateforme */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'all', l: 'Tous', n: counts.all },
            { v: 'draft', l: '⚪ Brouillons', n: counts.draft },
            { v: 'scheduled', l: '📅 Programmés', n: counts.scheduled },
            { v: 'published', l: '✓ Publiés', n: counts.published },
          ] as const).map(f => (
            <button
              key={f.v}
              onClick={() => setStatusFilter(f.v as StatusFilter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === f.v ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#c8a96e]/50'}`}
            >
              {f.l} <span className="ml-1 opacity-70">({f.n})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'instagram', 'linkedin', 'tiktok', 'facebook'] as Platform[]).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${platformFilter === p ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
            >
              {PD[p].icon} {PD[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── VUE LISTE ── */}
      {view === 'list' && (
        loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400 bg-white rounded-xl border border-zinc-100 border-dashed">
            Aucune publication — génère des posts depuis la fiche d&apos;un job (onglet ✍️ Posts)
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const pd = PD[p.platform] ?? PD.all
              const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft
              const job = p.job_id ? jobs[p.job_id] : null
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all">
                  {/* Plateforme */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${pd.color}15`, color: pd.color }}>
                    {pd.icon}
                  </div>

                  {/* Job + extrait */}
                  <div className="flex-1 min-w-0">
                    {job ? (
                      <Link href={`/${locale}/jobs/${job.id}`} className="text-sm font-semibold text-[#1a1918] hover:text-[#c8a96e] transition-colors truncate block">
                        {job.public_title ?? job.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-zinc-400 truncate">Job supprimé</p>
                    )}
                    <p className="text-xs text-zinc-400 truncate">
                      {job?.companies?.name ? `${job.companies.name} · ` : ''}{p.content.slice(0, 80)}{p.content.length > 80 ? '…' : ''}
                    </p>
                  </div>

                  {/* Réseau */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:inline" style={{ background: `${pd.color}15`, color: pd.color }}>
                    {pd.label}
                  </span>

                  {/* Date programmée */}
                  {p.scheduled_for ? (
                    <span className="text-xs text-[#c8a96e] font-medium flex-shrink-0 whitespace-nowrap">
                      📅 {new Date(p.scheduled_for).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300 flex-shrink-0">—</span>
                  )}

                  {/* Statut */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── VUE CALENDRIER ── */}
      {view === 'calendar' && (
        <div className="bg-white border border-zinc-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
              className="px-3 py-1 text-sm text-zinc-500 hover:text-[#c8a96e]">← Mois précédent</button>
            <p className="text-sm font-semibold text-[#1a1918]">
              {calendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="px-3 py-1 text-sm text-zinc-500 hover:text-[#c8a96e]">Mois suivant →</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-zinc-400 uppercase mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              const isToday = cell.date && cell.date.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`min-h-[80px] p-1.5 border rounded-lg ${cell.date ? 'bg-white border-zinc-100' : 'bg-zinc-50/50 border-transparent'} ${isToday ? 'ring-2 ring-[#c8a96e]' : ''}`}>
                  {cell.date && (
                    <>
                      <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#c8a96e]' : 'text-zinc-500'}`}>
                        {cell.date.getDate()}
                      </p>
                      <div className="space-y-1">
                        {cell.pubs.slice(0, 3).map(p => {
                          const pd = PD[p.platform] ?? PD.all
                          return (
                            <div key={p.id} className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium" style={{ background: `${pd.color}15`, color: pd.color }} title={p.content}>
                              {pd.icon} {p.content.slice(0, 15)}…
                            </div>
                          )
                        })}
                        {cell.pubs.length > 3 && (
                          <p className="text-[10px] text-zinc-400 pl-1.5">+{cell.pubs.length - 3}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-zinc-400 text-center mt-4">
            La génération de posts se fait depuis la fiche d&apos;un job (onglet ✍️ Posts)
          </p>
        </div>
      )}
    </div>
  )
}
