'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AlumniCase {
  id: string
  status: string
  actual_start_date?: string | null
  actual_end_date?: string | null
  interns?: {
    first_name: string
    last_name: string
    email?: string | null
    avatar_url?: string | null
    school_name?: string | null
  } | null
  // company via job_submissions is complex to join; we'll show school instead
}

function formatDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function internInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export default function AlumniPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [alumni, setAlumni] = useState<AlumniCase[]>([])
  const [loading, setLoading] = useState(true)
  const [requestingSent, setRequestingSent] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('cases')
      .select('id, status, actual_start_date, actual_end_date, interns(first_name, last_name, email, avatar_url, school_name)')
      .in('status', ['alumni', 'completed'])
      .order('actual_end_date', { ascending: false })
      .then(({ data }) => {
        setAlumni((data ?? []) as unknown as AlumniCase[])
        setLoading(false)
      })
  }, [])

  async function handleRequestTestimonial(caseId: string, email: string | null | undefined) {
    if (!email) return
    setRequestingSent(prev => new Set(prev).add(caseId))
    // Fire-and-forget: just open mailto for now
    window.location.href = `mailto:${email}?subject=Ton avis sur ton stage à Bali&body=Bonjour, nous aimerions avoir ton témoignage sur ton expérience à Bali !`
  }

  function exportCSV() {
    const rows = alumni.map(a => {
      const intern = a.interns
      return [
        `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
        intern?.email ?? '',
        intern?.school_name ?? '',
        a.status,
        a.actual_start_date ?? '',
        a.actual_end_date ?? '',
      ]
    })
    const header = ['Nom', 'Email', 'École', 'Statut', 'Début', 'Fin']
    const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alumni-bali-interns-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalAlumni = alumni.length
  const completedCount = alumni.filter(a => a.status === 'completed').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Alumni</h1>
          <p className="text-sm text-zinc-500 mt-1">Former interns who completed their internship in Bali</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors text-zinc-600"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <a
            href={`mailto:?bcc=${alumni.map(a => a.interns?.email).filter(Boolean).join(',')}&subject=Update from Bali Interns`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#1a1918] text-white rounded-lg hover:bg-[#2a2927] transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email all alumni
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1a1918]">{totalAlumni}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Total alumni</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#10b981]">{completedCount}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Completed</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-[#c8a96e]">{totalAlumni - completedCount}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Alumni (in progress)</p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && alumni.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-5xl mb-4">🎓</p>
          <p className="text-sm font-medium">No alumni yet</p>
          <p className="text-xs mt-1">Alumni will appear here once interns complete their internship</p>
        </div>
      )}

      {!loading && alumni.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {alumni.map(a => {
            const intern = a.interns
            const name = intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown'
            const initials = intern ? internInitials(intern.first_name, intern.last_name) : '?'
            const startLabel = formatDate(a.actual_start_date)
            const endLabel = formatDate(a.actual_end_date)
            const isSent = requestingSent.has(a.id)

            return (
              <div key={a.id} className="bg-white border border-zinc-100 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-200 transition-colors">
                <div className="flex items-start gap-3">
                  {intern?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={intern.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#c8a96e]/15 flex items-center justify-center text-sm font-bold text-[#c8a96e] flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918] truncate">{name}</p>
                    {intern?.school_name && (
                      <p className="text-xs text-zinc-400 truncate">{intern.school_name}</p>
                    )}
                    {intern?.email && (
                      <p className="text-xs text-zinc-400 truncate">{intern.email}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {a.status}
                  </span>
                </div>

                {(startLabel || endLabel) && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {startLabel ?? '?'} → {endLabel ?? 'now'}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Link
                    href={`/${locale}/clients/${a.id}`}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                  >
                    View file
                  </Link>
                  <button
                    onClick={() => void handleRequestTestimonial(a.id, intern?.email)}
                    disabled={isSent || !intern?.email}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-[#c8a96e] hover:bg-[#b8995e] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSent ? 'Sent ✓' : 'Request testimonial'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
