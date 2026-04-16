'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchIntern {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  avatar_url?: string | null
  cases?: Array<{ id: string; status: string }> | null
}

interface SearchCompany {
  id: string
  name: string
  city?: string | null
  logo_url?: string | null
}

interface SearchJob {
  id: string
  title: string
  status: string
  location?: string | null
  companies?: { name: string } | null
}

interface SearchContact {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  job_title?: string | null
  companies?: { name: string } | null
}

interface SearchResults {
  interns: SearchIntern[]
  companies: SearchCompany[]
  jobs: SearchJob[]
  contacts?: SearchContact[]
}

interface ResultItem {
  type: 'intern' | 'company' | 'job' | 'contact'
  id: string
  label: string
  sub: string
  url: string
  badge?: string | null
  initials?: string
}

const CASE_STATUS_CLS: Record<string, string> = {
  lead:               'bg-zinc-100 text-zinc-500',
  rdv_booked:         'bg-blue-100 text-blue-600',
  qualification_done: 'bg-purple-100 text-purple-600',
  job_submitted:      'bg-amber-100 text-amber-600',
  job_retained:       'bg-orange-100 text-orange-600',
  convention_signed:  'bg-teal-100 text-teal-600',
  payment_pending:    'bg-red-100 text-red-600',
  payment_received:   'bg-emerald-100 text-emerald-600',
  visa_in_progress:   'bg-blue-100 text-blue-600',
  visa_received:      'bg-teal-100 text-teal-600',
  arrival_prep:       'bg-amber-100 text-amber-600',
  active:             'bg-emerald-100 text-emerald-700',
  alumni:             'bg-purple-100 text-purple-600',
  completed:          'bg-zinc-100 text-zinc-500',
}

function flattenResults(data: SearchResults): ResultItem[] {
  const items: ResultItem[] = []

  data.interns.forEach((i) => {
    const cases = Array.isArray(i.cases) ? i.cases : []
    const latestCase = cases[0] ?? null
    const url = latestCase?.id ? `/fr/cases/${latestCase.id}` : `/fr/interns/${i.id}`
    const initials = `${i.first_name[0] ?? ''}${i.last_name?.[0] ?? ''}`.toUpperCase()
    items.push({
      type: 'intern', id: i.id,
      label: `${i.first_name} ${i.last_name}`,
      sub: i.email ?? '',
      url,
      badge: latestCase?.status ?? null,
      initials,
    })
  })

  data.companies.forEach((c) =>
    items.push({ type: 'company', id: c.id, label: c.name, sub: c.city ?? '', url: `/fr/companies/${c.id}` })
  )

  data.jobs.forEach((j) => {
    const companyName = (j.companies as unknown as { name: string } | null)?.name ?? null
    const sub = [j.status.replace(/_/g, ' '), companyName, j.location].filter(Boolean).join(' · ')
    items.push({ type: 'job', id: j.id, label: j.title, sub, url: `/fr/jobs/${j.id}` })
  });

  (data.contacts ?? []).forEach((c) => {
    const companyName = (c.companies as unknown as { name: string } | null)?.name ?? null
    const sub = [c.job_title, companyName].filter(Boolean).join(' · ')
    items.push({ type: 'contact', id: c.id, label: `${c.first_name} ${c.last_name}`, sub, url: `/fr/contacts/${c.id}` })
  })

  return items
}

const TYPE_ICONS: Record<string, string> = {
  intern:  '👤',
  company: '🏢',
  job:     '💼',
  contact: '📞',
}

const TYPE_LABELS: Record<string, string> = {
  intern:  'Stagiaire',
  company: 'Entreprise',
  job:     'Offre',
  contact: 'Contact',
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json() as SearchResults
        setResults(flattenResults(data))
        setSelectedIndex(0)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void doSearch(q) }, 250)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].url)
    }
  }

  function navigate(url: string) {
    router.push(url)
    setOpen(false)
  }

  if (!open) return null

  // Group results by type
  const grouped: Record<string, ResultItem[]> = {}
  for (const item of results) {
    if (!grouped[item.type]) grouped[item.type] = []
    grouped[item.type].push(item)
  }
  const typeOrder: Array<ResultItem['type']> = ['intern', 'company', 'job', 'contact']

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-zinc-400 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search interns, companies, jobs, contacts…"
            className="flex-1 text-base text-[#1a1918] placeholder-zinc-400 outline-none bg-transparent"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 border border-zinc-200 rounded text-xs text-zinc-400 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              Type at least 2 characters to search…
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {typeOrder.map((type) => {
                const group = grouped[type]
                if (!group || group.length === 0) return null
                return (
                  <div key={type}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {TYPE_LABELS[type]}
                    </p>
                    {group.map((item) => {
                      const globalIdx = results.indexOf(item)
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          onClick={() => navigate(item.url)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={[
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIdx === selectedIndex ? 'bg-[#c8a96e]/10' : 'hover:bg-zinc-50',
                          ].join(' ')}
                        >
                          {/* Avatar/icon */}
                          {type === 'intern' && item.initials ? (
                            <div className="w-8 h-8 rounded-full bg-[#c8a96e]/15 flex items-center justify-center text-xs font-bold text-[#c8a96e] flex-shrink-0">
                              {item.initials}
                            </div>
                          ) : (
                            <span className="text-lg flex-shrink-0 w-8 text-center">{TYPE_ICONS[item.type]}</span>
                          )}

                          {/* Label + sub */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1918] truncate">{item.label}</p>
                            {item.sub && <p className="text-xs text-zinc-500 truncate">{item.sub}</p>}
                          </div>

                          {/* Case status badge for interns */}
                          {item.badge && (
                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${CASE_STATUS_CLS[item.badge] ?? 'bg-zinc-100 text-zinc-500'}`}>
                              {item.badge.replace(/_/g, ' ')}
                            </span>
                          )}

                          {/* Type pill for non-intern */}
                          {!item.badge && (
                            <span className="flex-shrink-0 text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                              {TYPE_LABELS[item.type]}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-4 text-xs text-zinc-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
