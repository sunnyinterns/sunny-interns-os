'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface DocSection {
  key: 'passport_page4_url' | 'photo_id_url' | 'bank_statement_url' | 'return_plane_ticket_url'
  label: string
  instruction: string
  apiField: string
}

interface PortalData {
  id: string
  portal_token: string
  papiers_visas?: boolean | null
  interns?: {
    passport_page4_url?: string | null
    photo_id_url?: string | null
    bank_statement_url?: string | null
    return_plane_ticket_url?: string | null
  } | null
}

const DOC_SECTIONS: DocSection[] = [
  {
    key: 'passport_page4_url',
    label: 'Passeport page 4 (haute résolution)',
    instruction: 'La page avec votre photo et vos informations personnelles. Photo nette, tous les textes lisibles.',
    apiField: 'passport_page4_url',
  },
  {
    key: 'photo_id_url',
    label: 'Photo fond blanc',
    instruction: 'Photo récente, fond blanc, format passeport. Tête droite, expression neutre.',
    apiField: 'photo_id_url',
  },
  {
    key: 'bank_statement_url',
    label: 'Relevé bancaire (3 derniers mois)',
    instruction: 'Les 3 derniers relevés de votre compte bancaire principal. Votre nom doit être visible.',
    apiField: 'bank_statement_url',
  },
  {
    key: 'return_plane_ticket_url',
    label: 'Billet de retour (ou billet aller confirmé)',
    instruction: 'Votre billet d\'avion confirmé pour l\'arrivée à Bali (et idéalement le retour).',
    apiField: 'return_plane_ticket_url',
  },
]

export default function PortalVisaPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function loadData() {
    const res = await fetch(`/api/portal/${token}`)
    if (res.ok) {
      const d = await res.json() as PortalData
      setData(d)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!token) return
    void loadData()
  }, [token])

  async function handleUpload(file: File, section: DocSection) {
    if (file.size > 15 * 1024 * 1024) {
      setErrors(p => ({ ...p, [section.key]: 'Fichier trop lourd (max 15MB)' }))
      return
    }
    setUploadingKey(section.key)
    setErrors(p => ({ ...p, [section.key]: '' }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('token', token)
      formData.append('field', section.apiField)
      formData.append('type', 'visa-doc')

      const res = await fetch(`/api/portal/${token}/visa`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Erreur upload')
      await loadData()
    } catch (e) {
      setErrors(p => ({ ...p, [section.key]: e instanceof Error ? e.message : 'Erreur upload' }))
    } finally {
      setUploadingKey(null)
    }
  }

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '48px' }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '48px' }}>Lien invalide.</p>

  const allComplete = DOC_SECTIONS.every(s => !!data.interns?.[s.key])
  const completedCount = DOC_SECTIONS.filter(s => !!data.interns?.[s.key]).length

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        ← Retour
      </Link>

      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1918', marginBottom: '6px' }}>Documents visa</h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
        Ces documents sont nécessaires pour constituer votre dossier visa. Uploadez-les dès que possible.
      </p>

      {/* Progression */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1918' }}>{completedCount}/4 documents</span>
          <span style={{ fontSize: '12px', color: completedCount === 4 ? '#0d9e75' : '#9ca3af' }}>
            {completedCount === 4 ? '✓ Complet' : 'En cours'}
          </span>
        </div>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(completedCount / 4) * 100}%`, background: '#c8a96e', transition: 'width 0.4s', borderRadius: '3px' }} />
        </div>
      </div>

      {allComplete && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #0d9e75', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 700, color: '#0d9e75', fontSize: '14px', marginBottom: '2px' }}>✓ Tous vos documents sont complets !</p>
          <p style={{ color: '#166534', fontSize: '13px' }}>Notre équipe va les vérifier et soumettre votre dossier visa.</p>
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {DOC_SECTIONS.map(section => {
          const uploaded = !!data.interns?.[section.key]
          const isUploading = uploadingKey === section.key
          const err = errors[section.key]

          return (
            <div key={section.key} style={{
              background: 'white', border: `1.5px solid ${uploaded ? '#0d9e75' : '#e5e7eb'}`,
              borderRadius: '12px', padding: '16px',
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#1a1918', flex: 1 }}>{section.label}</p>
                {uploaded && <span style={{ color: '#0d9e75', fontSize: '16px', marginLeft: '8px' }}>✅</span>}
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{section.instruction}</p>

              {err && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{err}</p>}

              <input
                ref={el => { inputRefs.current[section.key] = el }}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void handleUpload(file, section)
                }}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => inputRefs.current[section.key]?.click()}
                  disabled={isUploading}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: isUploading ? 'not-allowed' : 'pointer', border: 'none',
                    background: uploaded ? '#dcfce7' : '#c8a96e',
                    color: uploaded ? '#0d9e75' : 'white',
                    opacity: isUploading ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {isUploading ? 'Upload…' : uploaded ? '✓ Remplacer' : 'Uploader'}
                </button>
                {uploaded && (
                  <a
                    href={data.interns?.[section.key] ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'underline' }}
                  >
                    Voir le document
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
