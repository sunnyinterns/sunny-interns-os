'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
  case_id: string
  name: string
  email: string | null
  job: string | null
  status: string
  date: string
  start_date: string | null
}

interface FunnelStage {
  key: string
  label: string
  emoji: string
  count: number
  color: string
  profiles: Profile[]
  conv_prev: string
  description: string
}

interface FunnelSection {
  id: string
  label: string
  emoji: string
  color: string
  stages: FunnelStage[]
}

const COLOR: Record<string, { bg: string; border: string; badge: string; text: string; header: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-600',    text: 'text-blue-700',    header: 'bg-blue-100' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  badge: 'bg-indigo-600',  text: 'text-indigo-700',  header: 'bg-indigo-100' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-500',     text: 'text-red-700',     header: 'bg-red-100' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-500',   text: 'text-amber-700',   header: 'bg-amber-100' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-600',  text: 'text-violet-700',  header: 'bg-violet-100' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  badge: 'bg-orange-500',  text: 'text-orange-700',  header: 'bg-orange-100' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',   badge: 'bg-green-600',   text: 'text-green-700',   header: 'bg-green-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', header: 'bg-emerald-100' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    badge: 'bg-teal-600',    text: 'text-teal-700',    header: 'bg-teal-100' },
  yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-200',  badge: 'bg-yellow-500',  text: 'text-yellow-700',  header: 'bg-yellow-100' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     badge: 'bg-sky-500',     text: 'text-sky-700',     header: 'bg-sky-100' },
  zinc:    { bg: 'bg-zinc-50',    border: 'border-zinc-200',    badge: 'bg-zinc-500',    text: 'text-zinc-600',    header: 'bg-zinc-100' },
}

const SECTION_HEADER: Record<string, string> = {
  leads:     'border-l-4 border-blue-400 pl-3',
  matching:  'border-l-4 border-violet-400 pl-3',
  procedure: 'border-l-4 border-teal-400 pl-3',
  en_stage:  'border-l-4 border-emerald-400 pl-3',
}

function convColor(rate: string) {
  if (rate === '—' || rate === '0%') return 'text-zinc-400'
  const n = parseInt(rate)
  if (n >= 70) return 'text-emerald-600 font-bold'
  if (n >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface Props { locale?: string }

export function FunnelKPIs({ locale = 'fr' }: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<FunnelSection[]>([])
  const [loading, setLoading] = useState(true)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const fetchFunnel = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dashboard/funnel')
      const d = await r.json() as { sections: FunnelSection[] }
      setSections(d.sections ?? [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchFunnel() }, [fetchFunnel])

  if (loading) {
    return (
      <div className="space-y-6 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const openStage = sections.flatMap(s => s.stages).find(s => s.key === openKey) ?? null

  return (
    <div className="mb-8 space-y-5">
      {sections.map(section => {
        const totalSection = section.stages.reduce((acc, s) => acc + s.count, 0)

        return (
          <div key={section.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            {/* En-tête de section */}
            <div className={`px-4 py-3 flex items-center justify-between bg-zinc-50 border-b border-zinc-200`}>
              <div className={`flex items-center gap-2 ${SECTION_HEADER[section.id]}`}>
                <span className="text-base">{section.emoji}</span>
                <span className="text-sm font-bold text-[#1a1918]">{section.label}</span>
              </div>
              <span className="text-xs font-bold text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded-full">
                {totalSection} dossier{totalSection > 1 ? 's' : ''}
              </span>
            </div>

            {/* Grille des stages */}
            <div className={`grid gap-px bg-zinc-100 ${
              section.stages.length <= 2 ? 'grid-cols-2' :
              section.stages.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
              'grid-cols-2 sm:grid-cols-4'
            }`}>
              {section.stages.map(stage => {
                const c = COLOR[stage.color] ?? COLOR.zinc
                const isOpen = openKey === stage.key

                return (
                  <button
                    key={stage.key}
                    onClick={() => setOpenKey(isOpen ? null : stage.key)}
                    className={`relative text-left p-3.5 transition-all hover:z-10 ${
                      isOpen ? `${c.bg} ring-2 ring-inset ring-offset-0 ${c.border.replace('border-', 'ring-')}` : 'bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-lg">{stage.emoji}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${c.badge}`}>
                        {stage.count}
                      </span>
                    </div>
                    <p className={`text-xs font-semibold leading-tight mb-0.5 ${isOpen ? c.text : 'text-[#1a1918]'}`}>
                      {stage.label}
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">{stage.description}</p>
                    {stage.conv_prev !== '—' && (
                      <p className={`text-[10px] mt-1 ${convColor(stage.conv_prev)}`}>
                        ↗ {stage.conv_prev}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Panneau de détail si un stage de cette section est ouvert */}
            {openStage && sections.find(s => s.stages.some(st => st.key === openKey))?.id === section.id && (
              <div className={`border-t border-zinc-200 p-4 ${COLOR[openStage.color]?.bg ?? 'bg-zinc-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1a1918] text-sm flex items-center gap-2">
                    {openStage.emoji} {openStage.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${COLOR[openStage.color]?.badge}`}>
                      {openStage.count}
                    </span>
                  </h3>
                  <button onClick={() => setOpenKey(null)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">×</button>
                </div>

                {openStage.profiles.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-3">Aucun dossier</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {openStage.profiles.map(p => (
                      <div
                        key={p.case_id}
                        onClick={() => router.push(`/${locale}/cases/${p.case_id}`)}
                        className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:border-[#c8a96e] hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${COLOR[openStage.color]?.badge}`}>
                            {p.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1a1918] truncate">{p.name}</p>
                            <p className="text-xs text-zinc-400 truncate">{p.job ?? p.email ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {p.start_date && (
                            <span className="text-[10px] text-zinc-400 hidden sm:block">🛫 {relDate(p.start_date)}</span>
                          )}
                          <span className="text-[10px] text-zinc-400">{relDate(p.date)}</span>
                          <span className="text-[#c8a96e] text-xs">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
