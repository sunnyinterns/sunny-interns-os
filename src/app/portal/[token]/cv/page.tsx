'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CvVersion {
  id: string
  filename: string
  url: string
  uploaded_at: string
  version_number: number
}

interface PortalData {
  id: string
  portal_token: string
  cv_revision_requested?: boolean | null
  interns?: {
    id?: string | null
    cv_url?: string | null
  } | null
}

export default function PortalCvPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [versions, setVersions] = useState<CvVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch(`/api/portal/${token}`).then(r => r.ok ? r.json() as Promise<PortalData> : null),
      fetch(`/api/portal/${token}/cv-versions`).then(r => r.ok ? r.json() as Promise<CvVersion[]> : []),
    ]).then(([d, v]) => {
      if (d) setData(d)
      setVersions(Array.isArray(v) ? v : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  async function handleUpload(file: File) {
    if (!data) return
    if (file.size > 10 * 1024 * 1024) { setError('Fichier trop lourd (max 10MB)'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) { setError('Format accepté : PDF, DOC, DOCX'); return }

    setUploading(true)
    setError(null)
    setUploadProgress('Upload en cours…')

    try {
      // Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('token', token)
      formData.append('type', 'cv')

      const res = await fetch(`/api/portal/${token}/cv`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Erreur lors de l\'upload')
      setSuccess(true)
      setUploadProgress(null)
      // Refresh data
      const [d, v] = await Promise.all([
        fetch(`/api/portal/${token}`).then(r => r.json() as Promise<PortalData>),
        fetch(`/api/portal/${token}/cv-versions`).then(r => r.json() as Promise<CvVersion[]>),
      ])
      setData(d)
      setVersions(Array.isArray(v) ? v : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'upload')
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleUpload(file)
  }

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '48px' }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '48px' }}>Lien invalide.</p>

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        ← Retour
      </Link>

      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1918', marginBottom: '6px' }}>Votre CV</h1>

      {/* Banner révision */}
      {data.cv_revision_requested && !success && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #d97706', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, color: '#d97706', fontSize: '14px', marginBottom: '2px' }}>Charly vous demande une nouvelle version</p>
          <p style={{ color: '#78350f', fontSize: '13px' }}>Uploadez votre nouveau CV puis cliquez sur Valider.</p>
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #0d9e75', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, color: '#0d9e75', fontSize: '14px' }}>✓ CV uploadé avec succès !</p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>
        </div>
      )}

      {/* Zone upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void handleUpload(file)
        }}
        style={{
          border: '2px dashed #d1d5db', borderRadius: '12px', padding: '36px 24px',
          textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
          background: '#fafaf7', marginBottom: '24px',
          transition: 'border-color 0.2s',
        }}
      >
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>📎</p>
        {uploading ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>{uploadProgress}</p>
        ) : (
          <>
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#1a1918', marginBottom: '4px' }}>
              Glissez votre CV ici ou cliquez pour parcourir
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>PDF, DOC, DOCX — max 10MB</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} style={{ display: 'none' }} />

      {/* Historique versions */}
      {versions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1918', marginBottom: '10px' }}>Historique des versions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {versions.map((v, i) => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: 'white', borderRadius: '10px',
                border: `1px solid ${i === 0 ? '#c8a96e' : '#e5e7eb'}`,
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1918' }}>{v.filename}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(v.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {i === 0 && <span style={{ marginLeft: '6px', color: '#c8a96e', fontWeight: 600 }}>· Version actuelle</span>}
                  </p>
                </div>
                <a href={v.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '12px', color: '#c8a96e', fontWeight: 600, textDecoration: 'none',
                  padding: '4px 10px', borderRadius: '6px', background: '#faf6ef',
                }}>
                  Télécharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
