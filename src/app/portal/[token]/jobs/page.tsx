'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PublicJob {
  submission_id: string
  job_id: string
  title: string
  sector?: string | null
  duration?: string | null
  public_description?: string | null
  intern_interested: boolean | null
  intern_priority?: number | null
  company_name?: string | null
  status: string
}

export default function PortalJobsPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}/jobs`)
      .then((r) => r.ok ? r.json() as Promise<PublicJob[]> : Promise.resolve([]))
      .then((d) => { setJobs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  async function respond(submissionId: string, interested: boolean) {
    setResponding(submissionId)
    try {
      await fetch(`/api/portal/${token}/jobs/${submissionId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interested }),
      })
      setJobs((prev) => prev.map((j) =>
        j.submission_id === submissionId ? { ...j, intern_interested: interested } : j
      ))
      // Notify manager when interested
      if (interested) {
        void fetch(`/api/portal/${token}/notify-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionId }),
        }).catch(() => null)
      }
    } finally {
      setResponding(null)
    }
  }

  async function movePriority(submissionId: string, direction: 'up' | 'down') {
    setMoving(submissionId)
    const interestedJobs = [...jobs].filter(j => j.intern_interested === true)
    const sorted = [...interestedJobs].sort((a, b) => (a.intern_priority ?? 99) - (b.intern_priority ?? 99))
    const idx = sorted.findIndex(j => j.submission_id === submissionId)
    if (direction === 'up' && idx <= 0) { setMoving(null); return }
    if (direction === 'down' && idx >= sorted.length - 1) { setMoving(null); return }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const newOrder = sorted.map((j, i) => {
      if (i === idx) return { id: sorted[swapIdx].submission_id, priority: idx + 1 }
      if (i === swapIdx) return { id: j.submission_id, priority: swapIdx + 1 }
      return { id: j.submission_id, priority: i + 1 }
    })

    try {
      await fetch(`/api/portal/${token}/jobs/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      }).catch(() => null)
      setJobs(prev => prev.map(j => {
        const entry = newOrder.find(e => e.id === j.submission_id)
        return entry ? { ...j, intern_priority: entry.priority } : j
      }))
    } finally {
      setMoving(null)
    }
  }

  const interestedJobs = [...jobs.filter(j => j.intern_interested === true)].sort((a, b) => (a.intern_priority ?? 99) - (b.intern_priority ?? 99))
  const pendingJobs = jobs.filter(j => j.intern_interested === null)
  const notInterestedJobs = jobs.filter(j => j.intern_interested === false)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/portal/${token}`} className="text-[#c8a96e] text-sm">← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>
          Offres de stage
        </h1>
      </div>

      {jobs.length > 0 && (
        <div style={{ background: '#fffbf0', border: '1px solid #c8a96e', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
            💡 Classe tes offres par ordre de préférence — ça aide ton conseiller à prioriser les démarches !
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} style={{ height: '120px', background: '#f4f4f0', borderRadius: '12px' }} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Aucune offre n&apos;a encore été proposée à ton profil.</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px' }}>Ton conseiller Bali Interns te contactera dès qu&apos;une opportunité correspond à ton profil.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Intéressé */}
          {interestedJobs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', marginBottom: '10px' }}>✓ Mes offres ({interestedJobs.length})</p>
              <div className="space-y-3">
                {interestedJobs.map((job, idx) => (
                  <JobCard
                    key={job.submission_id}
                    job={job}
                    responding={responding}
                    moving={moving}
                    onRespond={respond}
                    showPriority
                    priority={idx + 1}
                    totalPriority={interestedJobs.length}
                    onMove={movePriority}
                  />
                ))}
              </div>
            </div>
          )}

          {/* En attente */}
          {pendingJobs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '10px' }}>
                À évaluer ({pendingJobs.length})
              </p>
              <div className="space-y-3">
                {pendingJobs.map((job) => (
                  <JobCard key={job.submission_id} job={job} responding={responding} moving={moving} onRespond={respond} />
                ))}
              </div>
            </div>
          )}

          {/* Pas intéressé */}
          {notInterestedJobs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '10px' }}>
                Pas pour moi ({notInterestedJobs.length})
              </p>
              <div className="space-y-3">
                {notInterestedJobs.map((job) => (
                  <JobCard key={job.submission_id} job={job} responding={responding} moving={moving} onRespond={respond} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function JobCard({ job, responding, moving, onRespond, showPriority, priority, totalPriority, onMove }: {
  job: PublicJob
  responding: string | null
  moving: string | null
  onRespond: (id: string, interested: boolean) => Promise<void>
  showPriority?: boolean
  priority?: number
  totalPriority?: number
  onMove?: (id: string, dir: 'up' | 'down') => Promise<void>
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: `1.5px solid ${job.intern_interested === true ? '#0d9e75' : job.intern_interested === false ? '#e5e7eb' : '#e5e7eb'}`,
      padding: '20px',
      opacity: job.intern_interested === false ? 0.65 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1918', margin: 0, marginBottom: '4px' }}>
            {job.title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {job.company_name && (
              <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>{job.company_name}</span>
            )}
            {job.sector && (
              <span style={{ fontSize: '12px', color: '#6b7280', background: '#f9fafb', padding: '2px 8px', borderRadius: '6px' }}>
                {job.sector}
              </span>
            )}
            {job.duration && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{job.duration}</span>
            )}
          </div>
        </div>
        {/* Status + priority */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          {job.intern_interested === true && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: '#d1fae5', color: '#065f46', borderRadius: '20px' }}>
              ✓ Intéressé
            </span>
          )}
          {job.intern_interested === false && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: '#f3f4f6', color: '#9ca3af', borderRadius: '20px' }}>
              Pas pour moi
            </span>
          )}
          {showPriority && priority && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#c8a96e', fontWeight: 600 }}>#{priority}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <button
                  onClick={() => void onMove?.(job.submission_id, 'up')}
                  disabled={priority === 1 || moving === job.submission_id}
                  style={{ width: '20px', height: '18px', background: priority === 1 ? '#f3f4f6' : '#f0fdf4', border: '1px solid', borderColor: priority === 1 ? '#e5e7eb' : '#86efac', borderRadius: '4px', cursor: priority === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: priority === 1 ? '#9ca3af' : '#15803d' }}
                >↑</button>
                <button
                  onClick={() => void onMove?.(job.submission_id, 'down')}
                  disabled={priority === totalPriority || moving === job.submission_id}
                  style={{ width: '20px', height: '18px', background: priority === totalPriority ? '#f3f4f6' : '#f0fdf4', border: '1px solid', borderColor: priority === totalPriority ? '#e5e7eb' : '#86efac', borderRadius: '4px', cursor: priority === totalPriority ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: priority === totalPriority ? '#9ca3af' : '#15803d' }}
                >↓</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {job.public_description && (
        <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6, marginBottom: '16px' }}>
          {job.public_description}
        </p>
      )}

      {/* Actions */}
      {job.intern_interested === null && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            disabled={responding === job.submission_id}
            onClick={() => void onRespond(job.submission_id, true)}
            style={{
              flex: 1, padding: '10px', background: '#d1fae5', color: '#065f46',
              border: '1.5px solid #0d9e75', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: responding === job.submission_id ? 0.6 : 1,
            }}
          >
            {responding === job.submission_id ? '…' : 'Je suis intéressé(e) ✓'}
          </button>
          <button
            disabled={responding === job.submission_id}
            onClick={() => void onRespond(job.submission_id, false)}
            style={{
              flex: 1, padding: '10px', background: '#f9fafb', color: '#6b7280',
              border: '1.5px solid #e5e7eb', borderRadius: '10px',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              opacity: responding === job.submission_id ? 0.6 : 1,
            }}
          >
            Pas pour moi
          </button>
        </div>
      )}
      {job.intern_interested === true && (
        <button
          onClick={() => void onRespond(job.submission_id, false)}
          disabled={responding === job.submission_id}
          style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
        >
          Annuler mon intérêt
        </button>
      )}
    </div>
  )
}
