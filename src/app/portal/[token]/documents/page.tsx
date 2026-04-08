'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CvVersion {
  id: string
  url: string
  filename?: string | null
  uploaded_by: string
  version_number: number
  is_current: boolean
  created_at: string
}

interface PortalData {
  id: string
  intern_id?: string | null
  interns?: { id: string; cv_revision_requested?: boolean } | null
}

export default function PortalDocumentsPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [versions, setVersions] = useState<CvVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}`)
      .then((r) => r.ok ? r.json() as Promise<PortalData> : Promise.reject())
      .then(async (d) => {
        setPortalData(d)
        const internId = d.interns?.id ?? d.intern_id ?? null
        if (internId) {
          const res = await fetch(`/api/cv-versions?intern_id=${internId}`)
          if (res.ok) setVersions(await res.json() as CvVersion[])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  async function handleUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) { setError('Fichier trop large (max 10 MB)'); return }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'intern-cvs')
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error('Upload échoué')
      const { url, filename } = await uploadRes.json() as { url: string; filename: string }

      const internId = portalData?.interns?.id ?? portalData?.intern_id ?? null
      const saveRes = await fetch('/api/cv-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intern_id: internId, url, filename, uploaded_by: 'intern' }),
      })
      if (!saveRes.ok) throw new Error('Sauvegarde échouée')

      const newVersion = await saveRes.json() as CvVersion
      setVersions((prev) => [newVersion, ...prev.map((v) => ({ ...v, is_current: false }))])
      setSuccess('CV mis à jour avec succès !')
      setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const revisionRequested = (portalData?.interns as { cv_revision_requested?: boolean } | null)?.cv_revision_requested

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Mes documents</h1>
      </div>

      {/* Revision request alert */}
      {revisionRequested && (
        <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 600, color: '#92400e', fontSize: '14px', margin: 0 }}>Nouvelle version demandée</p>
            <p style={{ color: '#b45309', fontSize: '12px', marginTop: '2px' }}>Charly vous demande de déposer une nouvelle version de votre CV.</p>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '16px' }}>Déposer mon CV</h2>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c8a96e')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
        >
          {uploading ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Upload en cours…</p>
          ) : (
            <>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>📄</p>
              <p style={{ color: '#374151', fontSize: '14px', fontWeight: 500 }}>Cliquer pour choisir un fichier</p>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>PDF, DOC, DOCX — max 10 MB</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleUpload(f)
            e.target.value = ''
          }}
        />

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>{error}</p>}
        {success && <p style={{ color: '#0d9e75', fontSize: '13px', marginTop: '10px' }}>{success}</p>}
      </div>

      {/* Version history */}
      {!loading && versions.length > 0 && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '14px' }}>Historique des versions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {versions.map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  border: `1.5px solid ${v.is_current ? '#c8a96e' : '#f3f4f6'}`,
                  borderRadius: '10px',
                  background: v.is_current ? '#fffdf7' : '#fafafa',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1918' }}>
                      {v.filename ?? `CV v${v.version_number}`}
                    </span>
                    {v.is_current && (
                      <span style={{ fontSize: '10px', padding: '1px 6px', background: '#c8a96e', color: 'white', borderRadius: '4px', fontWeight: 600 }}>
                        ACTUEL
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                    {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{v.uploaded_by === 'intern' ? 'Par toi' : 'Par Bali Interns'}
                  </p>
                </div>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#c8a96e', textDecoration: 'none', fontWeight: 500 }}
                >
                  Voir →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
