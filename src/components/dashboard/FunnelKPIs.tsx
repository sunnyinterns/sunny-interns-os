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

interface Stage {
  key: string
  label: string
  emoji: string
  count: number
  color: string
  profiles: Profile[]
  conv_prev: string
  conv_embauche: string
  description: string
}

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string; convBg: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-600',    text: 'text-blue-700',    convBg: 'bg-blue-100' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  badge: 'bg-indigo-600',  text: 'text-indigo-700',  convBg: 'bg-indigo-100' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-500',     text: 'text-red-700',     convBg: 'bg-red-100' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-500',   text: 'text-amber-700',   convBg: 'bg-amber-100' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-600',  text: 'text-violet-700',  convBg: 'bg-violet-100' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  badge: 'bg-orange-500',  text: 'text-orange-700',  convBg: 'bg-orange-100' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',   badge: 'bg-green-600',   text: 'text-green-700',   convBg: 'bg-green-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', convBg: 'bg-emerald-100' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',    badge: 'bg-teal-600',    text: 'text-teal-700',    convBg: 'bg-teal-100' },
  yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-200',  badge: 'bg-yellow-500',  text: 'text-yellow-700',  convBg: 'bg-yellow-100' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-200',     badge: 'bg-sky-500',     text: 'text-sky-700',     convBg: 'bg-sky-100' },
  zinc:    { bg: 'bg-zinc-50',    border: 'border-zinc-200',    badge: 'bg-zinc-500',    text: 'text-zinc-600',    convBg: 'bg-zinc-100' },
}

function convColor(rate: string): string {
  if (rate === '—' || rate === '0%') return 'text-zinc-400'
  const n = parseInt(rate)
  if (n >= 70) return 'text-emerald-600 font-semibold'
  if (n >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function relDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface Props {
  locale?: string
}

export function FunnelKPIs({ locale = 'fr' }: Props) {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [openStage, setOpenStage] = useState<string | null>(null)

  const fetchFunnel = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dashboard/funnel')
      if (!r.ok) throw new Error()
      const d = await r.json() as { stages: Stage[] }
      setStages(d.stages)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchFunnel() }, [fetchFunnel])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const selectedStage = openStage ? stages.find(s => s.key === openStage) : null

  return (
    <div className="mb-8">
      {/* Grid de cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stages.map(stage => {
          const c = COLOR_MAP[stage.color] ?? COLOR_MAP.zinc
          const isOpen = openStage === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setOpenStage(isOpen ? null : stage.key)}
              className={`relative text-left rounded-xl border p-3.5 transition-all hover:shadow-md ${
                isOpen
                  ? `${c.bg} ${c.border} shadow-md ring-2 ring-offset-1 ring-${stage.color}-300`
                  : `bg-white border-zinc-200 hover:${c.border}`
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-base">{stage.emoji}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${c.badge}`}>
                  {stage.count}
                </span>
              </div>

              {/* Label */}
              <p className={`text-xs font-semibold leading-tight mb-0.5 ${isOpen ? c.text : 'text-[#1a1918]'}`}>
                {stage.label}
              </p>
              <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1">
                {stage.description}
              </p>

              {/* Taux de conversion en bas à droite */}
              {stage.conv_prev !== '—' && (
                <div className="absolute bottom-2.5 right-3 flex flex-col items-end">
                  <span className={`text-[10px] ${convColor(stage.conv_prev)}`}>
                    ↗ {stage.conv_prev}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Panneau de détail déroulant */}
      {selectedStage && (
        <div className={`mt-3 rounded-xl border p-5 ${COLOR_MAP[selectedStage.color]?.bg ?? 'bg-zinc-50'} ${COLOR_MAP[selectedStage.color]?.border ?? 'border-zinc-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1a1918] flex items-center gap-2">
                <span>{selectedStage.emoji}</span>
                {selectedStage.label}
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${COLOR_MAP[selectedStage.color]?.badge}`}>
                  {selectedStage.count}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{selectedStage.description}</p>
            </div>
            <div className="text-right text-xs text-zinc-500 space-y-1">
              {selectedStage.conv_prev !== '—' && (
                <p>Conversion depuis étape précédente : <span className={`font-semibold ${convColor(selectedStage.conv_prev)}`}>{selectedStage.conv_prev}</span></p>
              )}
              {selectedStage.conv_embauche !== '—' && (
                <p>Taux global embauche : <span className={`font-semibold ${convColor(selectedStage.conv_embauche)}`}>{selectedStage.conv_embauche}</span></p>
              )}
            </div>
          </div>

          {selectedStage.profiles.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">Aucun profil pour cette étape</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {selectedStage.profiles.map(p => (
                <div
                  key={p.case_id}
                  onClick={() => router.push(`/${locale}/cases/${p.case_id}`)}
                  className="bg-white border border-zinc-200 rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-[#c8a96e] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${COLOR_MAP[selectedStage.color]?.badge}`}>
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1a1918] truncate">{p.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{p.job ?? p.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {p.start_date && (
                      <span className="text-xs text-zinc-400 hidden sm:block">
                        🛫 {relDate(p.start_date)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">{relDate(p.date)}</span>
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
}
