'use client'

import { useParams } from 'next/navigation'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

export default function ActivityPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">⚡ Activité</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <ActivityFeed locale={locale} showFilters={true} initialLimit={30} />
    </div>
  )
}
