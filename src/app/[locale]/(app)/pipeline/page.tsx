'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const KANBAN_COLUMNS = [
  { key: 'rdv_booked', label: '📅 RDV planifié', bg: '#dbeafe', border: '#93c5fd' },
  { key: 'qualification_done', label: '✅ Qualifié', bg: '#ede9fe', border: '#c4b5fd' },
  { key: 'job_submitted', label: '💼 Jobs envoyés', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'job_retained', label: '🤝 Job retenu', bg: '#d1fae5', border: '#6ee7b7' },
  { key: 'convention_signed', label: '📝 Convention', bg: '#dcfce7', border: '#86efac' },
]

interface InternSub {
  id?: string
  first_name?: string | null
  last_name?: string | null
  school_name?: string | null
  main_desired_job?: string | null
  linkedin_url?: string | null
  avatar_url?: string | null
  desired_duration_months?: number | null
  spoken_languages?: string[] | null
}

interface CaseRow {
  id: string
  status: string
  interns?: InternSub | null
}

function getLinkedinSlug(url?: string | null): string | null {
  if (!url) return null
  if (!url.includes('linkedin.com')) return url.trim()
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function PipelinePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCases = useCallback(async () => {
    try {
      const r = await fetch('/api/cases?type=candidate')
      if (r.ok) setCases((await r.json()) as CaseRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchCases() }, [fetchCases])

  const byStatus = (key: string) => cases.filter((c) => c.status === key)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
        <h1 className="text-xl font-bold text-[#1a1918]">📊 Pipeline</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{cases.length} candidat(s) actif(s)</p>
      </div>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full" style={{ minWidth: `${KANBAN_COLUMNS.length * 280}px` }}>
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col w-64 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-600">{col.label}</span>
                <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                  {byStatus(col.key).length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {byStatus(col.key).map((c) => {
                  const intern = c.interns
                  const slug = getLinkedinSlug(intern?.linkedin_url)
                  const avatarSrc = intern?.avatar_url || (slug ? `https://unavatar.io/linkedin/${slug}` : null)
                  const initials = (intern?.first_name?.[0] ?? '?') + (intern?.last_name?.[0] ?? '')
                  return (
                    <Link key={c.id} href={`/${locale}/cases/${c.id}`}>
                      <div className="bg-white border border-zinc-100 rounded-xl p-3 hover:border-[#c8a96e] hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative w-8 h-8 flex-shrink-0">
                            {avatarSrc && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarSrc}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover absolute inset-0 border border-white"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                              />
                            )}
                            <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
                              {initials}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1a1918] truncate">
                              {intern?.first_name} {intern?.last_name}
                            </p>
                            {intern?.school_name && (
                              <p className="text-[10px] text-zinc-400 truncate">{intern.school_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {intern?.main_desired_job && (
                            <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">{intern.main_desired_job}</span>
                          )}
                          {intern?.desired_duration_months && (
                            <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">⏱ {intern.desired_duration_months}m</span>
                          )}
                          {intern?.spoken_languages && intern.spoken_languages.length > 0 && (
                            <span className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full">🌐 {intern.spoken_languages.join('/')}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {byStatus(col.key).length === 0 && !loading && (
                  <div className="h-20 border-2 border-dashed border-zinc-100 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-zinc-300">Aucun candidat</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
