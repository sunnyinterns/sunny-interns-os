'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface JobData {
  id?: string
  title?: string | null
  public_title?: string | null
  companies?: { name: string } | null
}

interface Recommendation {
  job_id: string
  score: number
  reason: string
  job?: JobData
}

interface AIRecommendationsProps {
  caseId: string
  onSelectJob?: (jobId: string) => void
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? '#0d9e75' : score >= 40 ? '#d97706' : '#dc2626'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

export function AIRecommendations({ caseId, onSelectJob }: AIRecommendationsProps) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchRecommendations() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId }),
      })
      const data = await res.json() as { recommendations: Recommendation[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
      setRecommendations(data.recommendations)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      {recommendations === null ? (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#c8a96e]/10 to-[#c8a96e]/5 border border-[#c8a96e]/30 rounded-xl">
          <div>
            <p className="text-sm font-medium text-[#1a1918]">Matching IA</p>
            <p className="text-xs text-zinc-500 mt-0.5">Trouvez les meilleures offres pour ce stagiaire</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => { void fetchRecommendations() }}
          >
            ✨ Recommandations IA
          </Button>
        </div>
      ) : error ? (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626] flex items-center justify-between">
          <span>Erreur IA — affichage de tous les jobs disponibles</span>
          <button
            onClick={() => { setRecommendations(null); setError(null) }}
            className="text-xs underline ml-3"
          >
            Réessayer
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-500 flex items-center justify-between">
          <span>Aucun job correspondant trouvé</span>
          <button
            onClick={() => setRecommendations(null)}
            className="text-xs underline ml-3"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#1a1918]">✨ Recommandations IA ({recommendations.length})</p>
            <button
              onClick={() => setRecommendations(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Fermer
            </button>
          </div>
          {recommendations.map((rec) => {
            const title = rec.job?.public_title ?? rec.job?.title ?? 'Offre sans titre'
            const company = rec.job?.companies?.name ?? null
            return (
              <div
                key={rec.job_id}
                className="px-4 py-3 bg-white border border-zinc-100 rounded-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1918] truncate">{title}</p>
                    {company && (
                      <p className="text-xs text-zinc-500">{company}</p>
                    )}
                  </div>
                  {onSelectJob && (
                    <button
                      onClick={() => onSelectJob(rec.job_id)}
                      className="flex-shrink-0 px-3 py-1 text-xs font-medium bg-[#c8a96e]/10 text-[#c8a96e] hover:bg-[#c8a96e]/20 rounded-lg transition-colors"
                    >
                      Proposer ce job
                    </button>
                  )}
                </div>
                <ScoreBar score={rec.score} />
                <p className="text-xs text-zinc-500 italic">{rec.reason}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
