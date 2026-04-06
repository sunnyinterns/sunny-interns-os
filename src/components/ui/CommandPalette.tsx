'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchIntern {
  id: string
  first_name: string
  last_name: string
  email?: string | null
}

interface SearchCompany {
  id: string
  name: string
  destination?: string | null
}

interface SearchJob {
  id: string
  title: string
  status: string
}

interface SearchResults {
  interns: SearchIntern[]
  companies: SearchCompany[]
  jobs: SearchJob[]
}

type ResultItem =
  | { type: 'intern'; id: string; label: string; sub: string; url: string }
  | { type: 'company'; id: string; label: string; sub: string; url: string }
  | { type: 'job'; id: string; label: string; sub: string; url: string }

function flattenResults(data: SearchResults): ResultItem[] {
  const items: ResultItem[] = []
  data.interns.forEach((i) =>
    items.push({ type: 'intern', id: i.id, label: `${i.first_name} ${i.last_name}`, sub: i.email ?? '', url: `/fr/cases?intern=${i.id}` })
  )
  data.companies.forEach((c) =>
    items.push({ type: 'company', id: c.id, label: c.name, sub: c.destination ?? '', url: `/fr/companies/${c.id}` })
  )
  data.jobs.forEach((j) =>
    items.push({ type: 'job', id: j.id, label: j.title, sub: j.status, url: `/fr/jobs/${j.id}` })
  )
  return items
}

const TYPE_ICONS: Record<string, string> = {
  intern: '👤',
  company: '🏢',
  job: '💼',
}

const TYPE_LABELS: Record<string, string> = {
  intern: 'Stagiaire',
  company: 'Entreprise',
  job: 'Offre',
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

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Focus input when opened
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
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void doSearch(q) }, 200)
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

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
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
            placeholder="Rechercher un stagiaire, entreprise, offre…"
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
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              Tapez au moins 2 caractères pour rechercher…
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((item, idx) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => navigate(item.url)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      idx === selectedIndex ? 'bg-[#c8a96e]/10' : 'hover:bg-zinc-50',
                    ].join(' ')}
                  >
                    <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1918] truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-zinc-500 truncate">{item.sub}</p>}
                    </div>
                    <span className="flex-shrink-0 text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[item.type]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-4 text-xs text-zinc-400">
          <span><kbd className="font-mono">↑↓</kbd> naviguer</span>
          <span><kbd className="font-mono">↵</kbd> ouvrir</span>
          <span><kbd className="font-mono">Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
