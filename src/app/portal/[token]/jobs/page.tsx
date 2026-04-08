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
  status: string
}

export default function PortalJobsPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [jobs, setJobs] = useState<PublicJob[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

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
      await fetch(`/api/job-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intern_interested: interested }),
      })
      setJobs((prev) => prev.map((j) =>
        j.submission_id === submissionId ? { ...j, intern_interested: interested } : j
      ))
    } finally {
      setResponding(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/portal/${token}`} className="text-[#c8a96e] text-sm">← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>
          Offres de stage
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} style={{ height: '120px', background: '#f4f4f0', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Aucune offre n'a encore été proposée à ton profil.</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px' }}>Ton conseiller Bali Interns te contactera dès qu'une opportunité correspond à ton profil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.submission_id}
              style={{
                background: 'white',
                borderRadius: '16px',
                border: `1.5px solid ${job.intern_interested === true ? '#0d9e75' : job.intern_interested === false ? '#e5e7eb' : '#e5e7eb'}`,
                padding: '20px',
                opacity: job.intern_interested === false ? 0.65 : 1,
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1918', margin: 0 }}>
                    {job.title}
                  </h3>
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
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {job.sector && (
                    <span style={{ fontSize: '12px', color: '#6b7280', background: '#f9fafb', padding: '2px 8px', borderRadius: '6px' }}>
                      {job.sector}
                    </span>
                  )}
                  {job.duration && (
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {job.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Description publique */}
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
                    onClick={() => void respond(job.submission_id, true)}
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
                    onClick={() => void respond(job.submission_id, false)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
