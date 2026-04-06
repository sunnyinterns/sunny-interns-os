'use client'

import { useRouter } from 'next/navigation'

interface CaseCardData {
  id: string
  first_name: string
  last_name: string
  status: string
  arrival_date?: string | null
  hasCriticalAlert?: boolean
}

interface InternCardProps {
  data: CaseCardData
  locale?: string
}

function getDaysUntilTag(
  arrivalDate: string
): { label: string; color: string } | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const arrival = new Date(arrivalDate)
  arrival.setHours(0, 0, 0, 0)
  const days = Math.floor((arrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (days < 0) return { label: `J${days}`, color: 'bg-red-100 text-[#dc2626]' }
  if (days < 3) return { label: `J-${days}`, color: 'bg-red-100 text-[#dc2626]' }
  if (days < 7) return { label: `J-${days}`, color: 'bg-amber-100 text-[#d97706]' }
  if (days < 30) return { label: `J-${days}`, color: 'bg-yellow-100 text-yellow-700' }
  return { label: `J-${days}`, color: 'bg-emerald-50 text-[#0d9e75]' }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function InternCard({ data, locale = 'fr' }: InternCardProps) {
  const router = useRouter()
  const tag = data.arrival_date ? getDaysUntilTag(data.arrival_date) : null

  return (
    <button
      onClick={() => router.push(`/${locale}/cases/${data.id}`)}
      className="w-full text-left p-3 bg-white rounded-lg border border-zinc-100 hover:shadow-sm hover:border-zinc-200 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-2">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-semibold">
            {getInitials(data.first_name, data.last_name)}
          </span>
        </div>
        <span className="text-sm font-semibold text-[#1a1918] truncate flex-1">
          {data.first_name} {data.last_name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {tag && (
          <span className={['text-xs font-bold px-1.5 py-0.5 rounded', tag.color].join(' ')}>
            {tag.label}
          </span>
        )}
        {data.hasCriticalAlert && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-[#dc2626]">
            Alerte
          </span>
        )}
      </div>
    </button>
  )
}
