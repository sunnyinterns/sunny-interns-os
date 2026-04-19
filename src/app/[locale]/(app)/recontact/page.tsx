import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface RecontactCase {
  id: string
  recontact_month: string | null
  recontact_reason: string | null
  created_at: string
  interns: {
    first_name: string | null
    last_name: string | null
    email: string | null
    desired_domains: string[] | null
    desired_duration_months: number | null
  } | null
}

function monthLabel(ym: string) {
  return new Date(ym + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function isPast(ym: string) {
  return new Date(ym + '-01') <= new Date()
}

export default async function RecontactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/fr/login')

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: cases } = await sb
    .from('cases')
    .select(`
      id, recontact_month, recontact_reason, created_at,
      interns(first_name, last_name, email, desired_domains, desired_duration_months)
    `)
    .eq('status', 'to_recontact')
    .order('recontact_month', { ascending: true })

  const rows = (cases ?? []) as unknown as RecontactCase[]
  const pastRows = rows.filter(r => r.recontact_month && isPast(r.recontact_month))
  const futureRows = rows.filter(r => !r.recontact_month || !isPast(r.recontact_month))

  const Card = ({ c }: { c: RecontactCase }) => {
    const past = c.recontact_month ? isPast(c.recontact_month) : false
    const intern = c.interns
    const name = intern ? `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim() : 'Inconnu'
    return (
      <Link href={`/fr/cases/${c.id}`}
        className={`block p-4 rounded-2xl border-2 transition-all hover:shadow-md ${past ? 'border-amber-300 bg-amber-50' : 'border-zinc-100 bg-white hover:border-[#c8a96e]/40'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {past && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">⚠️ À relancer maintenant</span>}
              <span className="text-xs text-zinc-400">{c.recontact_month ? monthLabel(c.recontact_month) : '—'}</span>
            </div>
            <p className="text-sm font-bold text-[#1a1918] truncate">{name}</p>
            <p className="text-xs text-zinc-400">{intern?.email}</p>
            {intern?.desired_domains && intern.desired_domains.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {intern.desired_domains.slice(0, 3).map(d => (
                  <span key={d} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{d}</span>
                ))}
                {intern.desired_duration_months && (
                  <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2 py-0.5 rounded-full">{intern.desired_duration_months} mois</span>
                )}
              </div>
            )}
            {c.recontact_reason && (
              <p className="text-xs text-zinc-400 mt-2 line-clamp-2 italic">"{c.recontact_reason}"</p>
            )}
          </div>
          <span className="text-zinc-300 text-lg flex-shrink-0">→</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1918]">📅 À recontacter</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Candidats intéressants mais pas encore disponibles — {rows.length} dossier{rows.length > 1 ? 's' : ''}
        </p>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">Aucun candidat à recontacter pour l'instant.</p>
          <p className="text-xs mt-1">Ils apparaîtront ici après un débrief d'entretien.</p>
        </div>
      )}

      {pastRows.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-2">
            <span>⚠️</span> À relancer maintenant ({pastRows.length})
          </h2>
          <div className="space-y-3">
            {pastRows.map(c => <Card key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {futureRows.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <span>📅</span> Relances planifiées ({futureRows.length})
          </h2>
          <div className="space-y-3">
            {futureRows.map(c => <Card key={c.id} c={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}
