'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

function getLinkedinSlug(url?: string | null): string | null {
  if (!url) return null
  if (!url.includes('linkedin.com')) return url.trim() || null
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return m ? m[1] : null
}

function getAvatarSrc(intern: { avatar_url?: string | null; linkedin_url?: string | null }): string | null {
  if (intern.avatar_url) return intern.avatar_url
  const slug = getLinkedinSlug(intern.linkedin_url)
  if (slug) return `https://unavatar.io/linkedin/${slug}`
  return null
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  convention_signed: { label: '📝 Convention signée', className: 'bg-green-100 text-green-800' },
  payment_pending: { label: '💶 Paiement en attente', className: 'bg-red-100 text-red-800' },
  payment_received: { label: '💶 Paiement reçu', className: 'bg-teal-100 text-teal-800' },
  visa_docs_sent: { label: '📄 Docs visa attendus', className: 'bg-amber-100 text-amber-800' },
  visa_submitted: { label: '🛂 Visa soumis', className: 'bg-blue-100 text-blue-800' },
  visa_in_progress: { label: '🛂 Visa en cours', className: 'bg-blue-100 text-blue-800' },
  visa_received: { label: '✈️ Visa reçu', className: 'bg-sky-100 text-sky-800' },
  arrival_prep: { label: '🛫 Départ imminent', className: 'bg-red-100 text-red-800' },
  active: { label: '🌴 En stage', className: 'bg-emerald-100 text-emerald-800' },
  alumni: { label: '🎓 Alumni', className: 'bg-zinc-100 text-zinc-600' },
}

interface ClientRow {
  id: string
  status: string
  desired_start_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  assigned_manager_name: string | null
  created_at: string
  interns: {
    first_name: string
    last_name: string
    email: string
    whatsapp: string | null
    main_desired_job: string | null
    nationality: string | null
    linkedin_url?: string | null
    avatar_url?: string | null
  } | null
  schools: { name: string } | null
}

function ClientsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
      ))}
    </div>
  )
}

export default function ClientsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAlumni, setShowAlumni] = useState(false)
  const [alumni, setAlumni] = useState<ClientRow[]>([])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cases?type=client')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as ClientRow[]
      setClients(data)
      setAlumni([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  const filtered = clients.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    const name = `${c.interns?.first_name ?? ''} ${c.interns?.last_name ?? ''}`.toLowerCase()
    return name.includes(q) || (c.interns?.email?.toLowerCase().includes(q) ?? false)
  })

  const arrivalDate = (c: ClientRow) => c.actual_start_date ?? c.desired_start_date

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Dossiers actifs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{clients.length} clients en cours</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-[#1a1918] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            Tous
          </button>
          {CLIENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#1a1918] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {STATUS_LABELS[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && <ClientsSkeleton />}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white border-b border-zinc-200">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Stagiaire</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Statut</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Poste</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Arrivee</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Manager</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-zinc-400">Aucun dossier actif</td>
                  </tr>
                ) : (
                  filtered.map((c, i) => {
                    const intern = c.interns
                    const badge = STATUS_LABELS[c.status]
                    const arrival = arrivalDate(c)
                    return (
                      <tr key={c.id} className={`hover:bg-zinc-50 transition-colors ${i % 2 === 1 ? 'bg-zinc-50/50' : 'bg-white'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const avatarSrc = getAvatarSrc(intern ?? {})
                              const initials = `${(intern?.first_name?.[0] ?? '').toUpperCase()}${(intern?.last_name?.[0] ?? '').toUpperCase()}`
                              return (
                                <div className="relative w-8 h-8 flex-shrink-0">
                                  {avatarSrc && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={avatarSrc} alt={`${intern?.first_name} ${intern?.last_name}`}
                                      className="w-8 h-8 rounded-full object-cover border border-zinc-100"
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  )}
                                  <div className={`w-8 h-8 rounded-full bg-[#c8a96e] flex items-center justify-center ${avatarSrc ? 'absolute inset-0' : ''}`}
                                    style={avatarSrc ? { zIndex: -1 } : {}}>
                                    <span className="text-white text-[10px] font-bold">{initials}</span>
                                  </div>
                                </div>
                              )
                            })()}
                            <div>
                              <p className="text-sm font-semibold text-[#1a1918]">{intern?.first_name} {intern?.last_name}</p>
                              <p className="text-xs text-zinc-400">{intern?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {badge && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{intern?.main_desired_job ?? '\u2014'}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {arrival ? new Date(arrival).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">{c.assigned_manager_name ?? '\u2014'}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/${locale}/clients/${c.id}`}
                            className="text-xs text-[#c8a96e] hover:underline font-medium"
                          >
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Alumni section */}
          {alumni.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowAlumni((o) => !o)}
                className="flex items-center gap-2 text-xs font-semibold text-[#92400e] hover:text-[#78350f] transition-colors mb-3"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  className={`transition-transform ${showAlumni ? 'rotate-90' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Anciens stagiaires ({alumni.length})
              </button>
              {showAlumni && (
                <div className="space-y-1">
                  {alumni.map((c) => {
                    const intern = c.interns
                    return (
                      <Link
                        key={c.id}
                        href={`/${locale}/clients/${c.id}`}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-amber-50/50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#92400e]">
                            {(intern?.first_name?.[0] ?? '').toUpperCase()}{(intern?.last_name?.[0] ?? '').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-[#1a1918] truncate flex-1">{intern?.first_name} {intern?.last_name}</span>
                        <span className="text-xs text-zinc-400">{intern?.main_desired_job ?? ''}</span>
                        <span className="text-zinc-300 text-sm">&rarr;</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
