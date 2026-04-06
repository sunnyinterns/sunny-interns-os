'use client'

import { useRouter } from 'next/navigation'

interface Job {
  id: string
  status: string
}

interface CompanyCardProps {
  company: {
    id: string
    name: string
    destination?: string | null
    sector?: string | null
    department?: string | null
    website?: string | null
    jobs?: Job[]
  }
}

export function CompanyCard({ company }: CompanyCardProps) {
  const router = useRouter()
  const activeJobsCount = company.jobs?.filter((j) => j.status === 'open').length ?? 0

  const destinationLabel = company.destination === 'bali'
    ? 'Bali'
    : company.destination === 'bangkok'
    ? 'Bangkok'
    : company.destination ?? '—'

  const destinationColor = company.destination === 'bali'
    ? 'bg-blue-100 text-blue-700'
    : company.destination === 'bangkok'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-zinc-100 text-zinc-600'

  return (
    <div
      onClick={() => router.push(`/fr/companies/${company.id}`)}
      className="bg-white rounded-xl border border-zinc-100 p-4 cursor-pointer hover:border-[#c8a96e] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[#1a1918] text-sm leading-tight line-clamp-2">
          {company.name}
        </h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${destinationColor}`}>
          {destinationLabel}
        </span>
      </div>

      {(company.sector || company.department) && (
        <p className="text-xs text-zinc-500 mb-3 truncate">
          {[company.sector, company.department].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto">
        {activeJobsCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#c8a96e]/10 text-[#c8a96e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e]" />
            {activeJobsCount} offre{activeJobsCount > 1 ? 's' : ''} active{activeJobsCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">Aucune offre active</span>
        )}
      </div>
    </div>
  )
}
