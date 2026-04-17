'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Status = 'draft' | 'review' | 'published' | 'archived'
type Category = 'living-in-bali' | 'preparing-internship' | 'internships-careers' | 'visa-admin' | 'agency'

interface BlogPost {
  id: string
  slug: string
  title_en: string
  title_fr: string | null
  category: Category | null
  tags: string[] | null
  status: Status
  featured: boolean | null
  published_at: string | null
  updated_at: string
  cover_image_url: string | null
  author_name: string | null
  reading_time_min: number | null
}

const STATUS_DOT: Record<Status, { color: string; label: string }> = {
  draft: { color: '#a1a1aa', label: 'Draft' },
  review: { color: '#f59e0b', label: 'Review' },
  published: { color: '#10b981', label: 'Publié' },
  archived: { color: '#71717a', label: 'Archivé' },
}

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
  { value: 'living-in-bali', label: 'Living in Bali' },
  { value: 'preparing-internship', label: 'Preparing internship' },
  { value: 'internships-careers', label: 'Internships & careers' },
  { value: 'visa-admin', label: 'Visa & admin' },
  { value: 'agency', label: 'Agency' },
]

export default function BlogListPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    if (categoryFilter !== 'all') qs.set('category', categoryFilter)
    const r = await fetch(`/api/blog-posts${qs.toString() ? '?' + qs.toString() : ''}`)
    const data = r.ok ? await r.json() as BlogPost[] : []
    setPosts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [statusFilter, categoryFilter])

  const filtered = useMemo(() => {
    if (!search) return posts
    const q = search.toLowerCase()
    return posts.filter(p =>
      p.title_en.toLowerCase().includes(q) ||
      (p.title_fr ?? '').toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    )
  }, [posts, search])

  const counts = useMemo(() => ({
    all: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    review: posts.filter(p => p.status === 'review').length,
    published: posts.filter(p => p.status === 'published').length,
    archived: posts.filter(p => p.status === 'archived').length,
  }), [posts])

  async function toggleFeatured(id: string, current: boolean) {
    const r = await fetch(`/api/blog-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !current }),
    })
    if (r.ok) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, featured: !current } : p))
    }
  }

  async function archivePost(id: string, title: string) {
    if (!confirm(`Archiver "${title}" ?`)) return
    const r = await fetch(`/api/blog-posts/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'archived' } : p))
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#1a1918]">📝 Blog</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#c8a96e]/15 text-[#c8a96e] text-sm font-semibold">{posts.length}</span>
        </div>
        <button
          onClick={() => router.push(`/${locale}/blog/new`)}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors"
        >
          + Nouvel article
        </button>
      </div>

      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-4 overflow-x-auto">
        {([
          ['all', 'Tous', counts.all],
          ['draft', 'Drafts', counts.draft],
          ['review', 'Review', counts.review],
          ['published', 'Publiés', counts.published],
          ['archived', 'Archivés', counts.archived],
        ] as const).map(([v, l, n]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v as Status | 'all')}
            className={[
              'px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5',
              statusFilter === v ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            {l}
            <span className={[
              'text-[10px] px-1.5 py-0.5 rounded-full',
              statusFilter === v ? 'bg-[#c8a96e]/15 text-[#c8a96e]' : 'bg-zinc-200 text-zinc-500',
            ].join(' ')}>{n}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre ou slug…"
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as Category | 'all')}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun article</p>
          <button
            onClick={() => router.push(`/${locale}/blog/new`)}
            className="mt-4 px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg"
          >
            + Nouvel article
          </button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Titre EN</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Titre FR</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Catégorie</th>
                <th className="px-4 py-3 text-center font-medium">⭐</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Publié</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const dot = STATUS_DOT[p.status]
                const catLabel = CATEGORIES.find(c => c.value === p.category)?.label ?? p.category ?? '—'
                return (
                  <tr key={p.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: dot.color }} />
                        <span className="text-xs text-zinc-500">{dot.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/${locale}/blog/${p.id}/edit`)}
                        className="font-medium text-[#1a1918] hover:text-[#c8a96e] text-left"
                      >
                        {p.title_en}
                      </button>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{p.title_fr ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{catLabel}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleFeatured(p.id, Boolean(p.featured))}
                        className={`text-lg transition-colors ${p.featured ? 'text-[#c8a96e]' : 'text-zinc-200 hover:text-zinc-400'}`}
                        title={p.featured ? 'Featured' : 'Not featured'}
                      >
                        ★
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell">
                      {p.published_at ? new Date(p.published_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`https://bali-interns-website.vercel.app/blog/${p.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="text-[11px] text-zinc-400 hover:text-[#c8a96e] px-2 py-1"
                          title="Prévisualiser"
                        >
                          🔗
                        </a>
                        <button
                          onClick={() => router.push(`/${locale}/blog/${p.id}/edit`)}
                          className="text-[11px] text-zinc-500 hover:text-[#c8a96e] px-2 py-1"
                          title="Éditer"
                        >
                          ✏️
                        </button>
                        {p.status !== 'archived' && (
                          <button
                            onClick={() => archivePost(p.id, p.title_en)}
                            className="text-[11px] text-zinc-400 hover:text-red-500 px-2 py-1"
                            title="Archiver"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
