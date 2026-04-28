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
  employer_first_name?: string | null
  submission_status: string
  candidate_decision?: string | null  // sent / pending / retained / cancelled
  employer_decision?: string | null
  candidate_decision?: string | null
  employer_decision?: string | null   // pending / interested / not_interested
  candidate_decision?: string | null  // pending / interested / not_interested
}

export default function PortalJobsPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [candidateResponding, setCandidateResponding] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}/jobs`)
      .then((r) => r.ok ? r.json() as Promise<PublicJob[]> : Promise.resolve([]))
      .then((d) => { setJobs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])
  async function handleCandidateDecision(subId: string, decision: 'interested' | 'not_interested') {
    const res = await fetch(`/api/portal/${token}/jobs/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_decision: decision }),
    })
    if (res.ok) {
      setJobs(prev => prev.map(j =>
        j.submission_id === subId ? { ...j, candidate_decision: decision } : j
      ))
    }
  }


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
        <Link href={`/portal/${token}`} className="text-[#FFCC00] text-sm">← Back</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
          Internship offers
        </h1>
      </div>

      {jobs.length > 0 && (
        <div style={{ background: '#fffbf0', border: '1px solid #FFCC00', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
            💡 Rank your offers by preference — it helps your advisor prioritise outreach!
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
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No offers have been proposed to your profile yet.</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px' }}>Your Bali Interns advisor will reach out as soon as a match is found.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interested */}
          {interestedJobs.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', marginBottom: '10px' }}>✓ My shortlist ({interestedJobs.length})</p>
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
                To review ({pendingJobs.length})
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
                Not for me ({notInterestedJobs.length})
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
  token?: string
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
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A', margin: 0, marginBottom: '4px' }}>
            {job.title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {job.employer_first_name && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Contact: {job.employer_first_name}</span>
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
          {job.submission_status === 'interview' && !job.candidate_decision && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6d28d9' }}>🗓️ Interview stage — what do you think?</span>
              <button
                onClick={() => void handleCandidateDecision(job.submission_id, 'interested')}
                style={{ padding: '6px 12px', background: '#FFCC00', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >🙋 I want to join</button>
              <button
                onClick={() => void handleCandidateDecision(job.submission_id, 'not_interested')}
                style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >❌ Not for me</button>
            </div>
          )}
          {job.candidate_decision === 'interested' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#d1fae5', color: '#059669', borderRadius: '99px', marginBottom: '2px' }}>
              🙋 You said yes — waiting for confirmation
            </span>
          )}
          {job.candidate_decision === 'not_interested' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#fee2e2', color: '#dc2626', borderRadius: '99px', marginBottom: '2px' }}>
              ❌ Not for me
            </span>
          )}
          {job.submission_status === 'sent' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '99px', marginBottom: '2px' }}>
              ✉ Application sent
            </span>
          )}
          {job.submission_status === 'interview' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#ede9fe', color: '#6d28d9', borderRadius: '99px', marginBottom: '2px' }}>
              🗓️ Interview in progress
            </span>
          )}
          {job.submission_status === 'pending' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#f3f4f6', color: '#6b7280', borderRadius: '99px', marginBottom: '2px' }}>
              ⏳ Not sent yet
            </span>
          )}
          {/* After interview: candidate can confirm their decision */}
          {job.submission_status === 'interview' && !job.candidate_decision && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', width: '100%' }}>
              <button
                onClick={() => void handleCandidateDecision(job.submission_id, 'interested')}
                style={{ flex: 1, padding: '8px 0', background: '#FFCC00', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                🙋 I want to join
              </button>
              <button
                onClick={() => void handleCandidateDecision(job.submission_id, 'not_interested')}
                style={{ flex: 1, padding: '8px 0', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Not for me
              </button>
            </div>
          )}
          {job.candidate_decision === 'interested' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#d1fae5', color: '#065f46', borderRadius: '99px', marginBottom: '2px' }}>
              ✅ You confirmed your interest
            </span>
          )}
          {job.candidate_decision === 'not_interested' && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', background: '#f3f4f6', color: '#6b7280', borderRadius: '99px', marginBottom: '2px' }}>
              You declined this offer
            </span>
          )}
          {job.intern_interested === true && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: '#d1fae5', color: '#065f46', borderRadius: '20px' }}>
              ✓ Interested
            </span>
          )}

          {/* Candidate decision buttons — show when employer is interested */}
          {job.submission_status === 'interview' && !job.candidate_decision && (
            <div style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#fffbf0', borderRadius: '8px', border: '1px solid #FFCC00' }}>
              <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '8px', fontWeight: 500 }}>The employer wants to meet you — what would you like to do?</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => void handleCandidateDecision(job.submission_id, 'interested')}
                  disabled={candidateResponding === job.submission_id}
                  style={{ flex: 1, padding: '8px', background: '#FFCC00', color: '#1A1A1A', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  {candidateResponding === job.submission_id ? '…' : '🙋 I want to join'}
                </button>
                <button
                  onClick={() => void handleCandidateDecision(job.submission_id, 'not_interested')}
                  disabled={candidateResponding === job.submission_id}
                  style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  {candidateResponding === job.submission_id ? '…' : '❌ Not the right fit'}
                </button>
              </div>
            </div>
          )}
          {job.candidate_decision === 'interested' && (
            <span style={{ fontSize: '11px', padding: '2px 8px', background: '#d1fae5', color: '#059669', borderRadius: '99px' }}>✅ You want to join</span>
          )}
          {job.candidate_decision === 'not_interested' && (
            <span style={{ fontSize: '11px', padding: '2px 8px', background: '#f3f4f6', color: '#9ca3af', borderRadius: '99px' }}>Declined</span>
          )}
          {job.intern_interested === false && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', background: '#f3f4f6', color: '#9ca3af', borderRadius: '20px' }}>
              Not for me
            </span>
          )}
          {showPriority && priority && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#FFCC00', fontWeight: 600 }}>#{priority}</span>
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
            {responding === job.submission_id ? '…' : 'I\'m interested ✓'}
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
            Not for me
          </button>
        </div>
      )}
      {job.intern_interested === true && (
        <button
          onClick={() => void onRespond(job.submission_id, false)}
          disabled={responding === job.submission_id}
          style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
        >
          Remove interest
        </button>
      )}
    </div>
  )
}
