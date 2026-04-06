'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

export interface Job {
  id: string
  public_title?: string | null
  title?: string | null
  internal_company_name?: string | null
  department?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  companies?: { id: string; name: string } | null
}

function statusVariant(status: string | null | undefined): 'success' | 'info' | 'attention' | 'default' {
  if (status === 'open') return 'success'
  if (status === 'staffed') return 'info'
  if (status === 'ending_soon') return 'attention'
  return 'default'
}

function statusLabel(status: string | null | undefined): string {
  if (status === 'open') return 'Ouverte'
  if (status === 'staffed') return 'Pourvue'
  if (status === 'ending_soon') return 'Bientôt terminée'
  return status ?? '—'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface JobCardProps {
  job: Job
  locale?: string
}

export function JobCard({ job, locale = 'fr' }: JobCardProps) {
  const router = useRouter()
  const displayTitle = job.public_title ?? job.title ?? 'Offre sans titre'
  const companyName = job.companies?.name ?? job.internal_company_name ?? null

  return (
    <button
      onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
      className="w-full text-left bg-white rounded-xl border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all p-4 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-[#1a1918] leading-snug">{displayTitle}</span>
        <Badge label={statusLabel(job.status)} variant={statusVariant(job.status)} />
      </div>

      {job.department && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-[#c8a96e] self-start">
          {job.department}
        </span>
      )}

      <p className="text-xs text-zinc-500">
        du {formatDate(job.start_date)} au {formatDate(job.end_date)}
      </p>

      {companyName && (
        <p className="text-xs text-zinc-400 truncate">{companyName}</p>
      )}
    </button>
  )
}
