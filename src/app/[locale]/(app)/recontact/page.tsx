'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface RecontactCase {
  id: string
  status: string
  recontact_at: string | null
  recontact_note: string | null
  updated_at: string
  interns?: { first_name?: string | null; last_name?: string | null; email?: string | null; photo_url?: string | null } | null
  desired_start_date?: string | null
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function RecontactPage() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [cases, setCases] = useState<RecontactCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cases?statuses=to_recontact&limit=200')
      .then(r => r.ok ? r.json() : [])
      .then((data: RecontactCase[]) => { setCases(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const past    = cases.filter(c => c.recontact_at && daysUntil(c.recontact_at) <= 0)
  const today   = cases.filter(c => c.recontact_at && daysUntil(c.recontact_at) === 0)
  const upcoming = cases.filter(c => c.recontact_at && daysUntil(c.recontact_at) > 0)
  const noDate  = cases.filter(c => !c.recontact_at)

  function urgencyColor(d: number) {
    if (d < 0) return 'bg-red-50 border-red-200 text-red-600'
    if (d === 0) return 'bg-amber-50 border-amber-200 text-amber-700'
    if (d <= 3) return 'bg-orange-50 border-orange-100 text-orange-600'
    return 'bg-zinc-50 border-zinc-100 text-zinc-500'
  }

  const Card = ({ c }: { c: RecontactCase }) => {
    const name = c.interns ? `${c.interns.first_name ?? ''} ${c.interns.last_name ?? ''}`.trim() || 'Sans nom' : 'Sans nom'
    const days = c.recontact_at ? daysUntil(c.recontact_at) : null
    const dateLabel = c.recontact_at ? new Date(c.recontact_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : null

    return (
      <Link href={`/${locale}/cases/${c.id}`}
        className="block bg-white border border-zinc-100 rounded-xl p-4 hover:border-[#c8a96e] transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#c8a96e]/10 flex-shrink-0 flex items-center justify-center text-sm font-bold text-[#c8a96e]">
              {name[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1a1918] truncate">{name}</p>
              {c.interns?.email && <p className="text-xs text-zinc-400 truncate">{c.interns.email}</p>}
              {c.recontact_note && <p className="text-xs text-zinc-500 italic mt-0.5 truncate">"{c.recontact_note}"</p>}
            </div>
          </div>
          {dateLabel && days !== null && (
            <div className={`flex-shrink-0 text-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${urgencyColor(days)}`}>
              <div>{dateLabel}</div>
              <div className="text-[10px] font-normal mt-0.5">
                {days < 0 ? `${Math.abs(days)}j de retard` : days === 0 ? 'Aujourd\'hui' : `Dans ${days}j`}
              </div>
            </div>
          )}
          {!dateLabel && (
            <span className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-zinc-100 text-zinc-400">Sans date</span>
          )}
        </div>
      </Link>
    )
  }

  const Section = ({ title, items, accent }: { title: string; items: RecontactCase[]; accent?: string }) => {
    if (!items.length) return null
    return (
      <div className="mb-6">
        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${accent ?? 'text-zinc-400'}`}>{title} ({items.length})</p>
        <div className="space-y-2">{items.map(c => <Card key={c.id} c={c} />)}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">🔄 À recontacter</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{cases.length} dossier{cases.length > 1 ? 's' : ''} en attente</p>
        </div>
        <button onClick={() => router.push(`/${locale}/cases`)} className="text-xs text-zinc-400 hover:text-zinc-600">
          Voir tous les candidats →
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse"/>)}</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-medium text-[#1a1918]">Aucun dossier à recontacter</p>
          <p className="text-sm mt-1">Tous les suivis sont à jour</p>
        </div>
      ) : (
        <>
          <Section title="🔴 En retard" items={past.filter(c => daysUntil(c.recontact_at!) < 0)} accent="text-red-500" />
          <Section title="🟡 Aujourd'hui" items={today} accent="text-amber-600" />
          <Section title="📅 À venir" items={upcoming} accent="text-zinc-500" />
          <Section title="⚪ Sans date planifiée" items={noDate} />
        </>
      )}
    </div>
  )
}
