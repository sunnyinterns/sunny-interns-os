'use client'

import { useEffect, useState } from 'react'

interface UGCSubmission {
  id: string
  case_id: string
  testimonial: string | null
  photo_url: string | null
  video_url: string | null
  rating: number | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  cases?: {
    first_name?: string
    last_name?: string
  } | null
}

interface TouchpointPending {
  caseId: string
  internName: string
  email: string
  touchpointKey: string
  triggerDate: string
  daysOverdue: number
}

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-[#0d9e75]',
  rejected: 'bg-red-100 text-[#dc2626]',
}

const STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
}

export default function UGCPage() {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([])
  const [pendingTouchpoints, setPendingTouchpoints] = useState<TouchpointPending[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [loadingTouchpoints, setLoadingTouchpoints] = useState(true)
  const [sendingTouchpoint, setSendingTouchpoint] = useState<string | null>(null)
  const [tab, setTab] = useState<'submissions' | 'touchpoints'>('submissions')

  async function fetchSubmissions() {
    setLoadingSubmissions(true)
    try {
      const res = await fetch('/api/submit-content')
      if (!res.ok) throw new Error()
      setSubmissions(await res.json() as UGCSubmission[])
    } catch {
      setSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  async function fetchTouchpoints() {
    setLoadingTouchpoints(true)
    try {
      const res = await fetch('/api/touchpoints')
      if (!res.ok) throw new Error()
      setPendingTouchpoints(await res.json() as TouchpointPending[])
    } catch {
      setPendingTouchpoints([])
    } finally {
      setLoadingTouchpoints(false)
    }
  }

  useEffect(() => {
    void fetchSubmissions()
    void fetchTouchpoints()
  }, [])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s))
    await fetch(`/api/submit-content?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function sendTouchpoint(caseId: string, touchpointKey: string) {
    const key = `${caseId}:${touchpointKey}`
    setSendingTouchpoint(key)
    try {
      await fetch('/api/touchpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, touchpoint_key: touchpointKey }),
      })
      setPendingTouchpoints((prev) =>
        prev.filter((t) => !(t.caseId === caseId && t.touchpointKey === touchpointKey))
      )
    } finally {
      setSendingTouchpoint(null)
    }
  }

  const pendingCount = submissions.filter((s) => s.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-[#1a1918]">Touchpoints & UGC</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Automations marketing et témoignages stagiaires</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('submissions')}
            className={[
              'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5',
              tab === 'submissions' ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            Témoignages
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#d97706] text-white text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('touchpoints')}
            className={[
              'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5',
              tab === 'touchpoints' ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            Touchpoints à envoyer
            {pendingTouchpoints.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#dc2626] text-white text-xs font-bold">
                {pendingTouchpoints.length}
              </span>
            )}
          </button>
        </div>

        {/* Submissions tab */}
        {tab === 'submissions' && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
            {loadingSubmissions ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400">Aucun témoignage reçu</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {submissions.map((s) => (
                  <div key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[#1a1918]">
                            {s.cases?.first_name} {s.cases?.last_name}
                          </p>
                          <span className={['text-xs px-1.5 py-0.5 rounded font-medium', STATUS_STYLES[s.status]].join(' ')}>
                            {STATUS_LABELS[s.status]}
                          </span>
                          {s.rating && (
                            <span className="text-xs text-[#c8a96e] font-medium">{'★'.repeat(s.rating)}</span>
                          )}
                        </div>
                        {s.testimonial && (
                          <p className="text-sm text-zinc-600 line-clamp-3">{s.testimonial}</p>
                        )}
                        {s.photo_url && (
                          <a
                            href={s.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#c8a96e] hover:underline mt-1 inline-block"
                          >
                            Voir la photo/vidéo →
                          </a>
                        )}
                        <p className="text-xs text-zinc-400 mt-1">
                          {new Date(s.submitted_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                      {s.status === 'pending' && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => void updateStatus(s.id, 'approved')}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-100 text-[#0d9e75] hover:bg-green-200 transition-colors"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => void updateStatus(s.id, 'rejected')}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-[#dc2626] hover:bg-red-100 transition-colors"
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Touchpoints tab */}
        {tab === 'touchpoints' && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
            {loadingTouchpoints ? (
              <div className="space-y-3 p-4">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
              </div>
            ) : pendingTouchpoints.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400">Aucun touchpoint en attente</p>
                <p className="text-xs text-zinc-300 mt-1">Tous les touchpoints ont été envoyés</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {pendingTouchpoints.map((t) => {
                  const key = `${t.caseId}:${t.touchpointKey}`
                  const isSending = sendingTouchpoint === key
                  return (
                    <div key={key} className="flex items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1918]">{t.internName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {t.touchpointKey.toUpperCase()}
                          </span>
                          {t.daysOverdue > 0 && (
                            <span className="text-xs text-[#dc2626]">
                              En retard de {t.daysOverdue}j
                            </span>
                          )}
                          <span className="text-xs text-zinc-400">{t.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => void sendTouchpoint(t.caseId, t.touchpointKey)}
                        disabled={isSending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        {isSending ? 'Envoi…' : 'Envoyer'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
