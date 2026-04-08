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
  flight_number?: string | null
  flight_departure_city?: string | null
  interns?: {
    passport_page4_url?: string | null
    photo_id_url?: string | null
    bank_statement_url?: string | null
    return_plane_ticket_url?: string | null
    mother_first_name?: string | null
    mother_last_name?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
  } | null
}

const DOC_SECTIONS: DocSection[] = [
  { key: 'passport_page4_url', label: 'Passeport page 4 (haute résolution)', instruction: 'La page avec votre photo et informations. Photo nette, tous les textes lisibles.', apiField: 'passport_page4_url' },
  { key: 'photo_id_url', label: 'Photo fond blanc', instruction: 'Photo récente, fond blanc, format passeport. Tête droite, expression neutre.', apiField: 'photo_id_url' },
  { key: 'bank_statement_url', label: 'Relevé bancaire (2000€ min)', instruction: 'Relevé montrant un solde d\'au moins 2000€. Votre nom doit être visible.', apiField: 'bank_statement_url' },
  { key: 'return_plane_ticket_url', label: 'Billet avion aller-retour', instruction: 'Billet confirmé avec dates de vol.', apiField: 'return_plane_ticket_url' },
]

export default function PortalVisaPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [extras, setExtras] = useState({
    flight_number: '', flight_departure_city: '', flight_arrival_time: '',
    mother_first_name: '', mother_last_name: '',
    emergency_name: '', emergency_email: '', emergency_phone: '',
  })
  const [savingExtras, setSavingExtras] = useState(false)
  const [extrasSaved, setExtrasSaved] = useState(false)

  async function loadData() {
    const res = await fetch(`/api/portal/${token}`)
    if (res.ok) {
      const d = await res.json() as PortalData
      setData(d)
      setExtras(e => ({
        ...e,
        flight_number: d.flight_number ?? '',
        flight_departure_city: d.flight_departure_city ?? '',
        mother_first_name: d.interns?.mother_first_name ?? '',
        mother_last_name: d.interns?.mother_last_name ?? '',
        emergency_name: d.interns?.emergency_contact_name ?? '',
        emergency_phone: d.interns?.emergency_contact_phone ?? '',
      }))
    }
    setLoading(false)
  }

  useEffect(() => { if (token) void loadData() }, [token])

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
      const res = await fetch(`/api/portal/${token}/visa`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erreur upload')
      await loadData()
    } catch (e) {
      setErrors(p => ({ ...p, [section.key]: e instanceof Error ? e.message : 'Erreur' }))
    } finally {
      setUploadingKey(null)
    }
  }

  async function saveExtras() {
    setSavingExtras(true)
    await fetch(`/api/portal/${token}/visa`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extras),
    })
    setExtrasSaved(true)
    setSavingExtras(false)
    setTimeout(() => setExtrasSaved(false), 3000)
  }

  if (loading) return <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 48 }}>Chargement…</p>
  if (!data) return <p style={{ color: '#dc2626', textAlign: 'center', marginTop: 48 }}>Lien invalide.</p>

  const allDocsComplete = DOC_SECTIONS.every(s => !!data.interns?.[s.key])
  const completedCount = DOC_SECTIONS.filter(s => !!data.interns?.[s.key]).length

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← Retour
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1918', marginBottom: 6 }}>Documents visa</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Uploadez vos documents et remplissez les informations complémentaires.</p>

      {/* Progress */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1918' }}>{completedCount}/4 documents</span>
          <span style={{ fontSize: 12, color: completedCount === 4 ? '#0d9e75' : '#9ca3af' }}>{completedCount === 4 ? '✓ Complet' : 'En cours'}</span>
        </div>
        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(completedCount / 4) * 100}%`, background: '#c8a96e', transition: 'width 0.4s', borderRadius: 3 }} />
        </div>
      </div>

      {allDocsComplete && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #0d9e75', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontWeight: 700, color: '#0d9e75', fontSize: 14, marginBottom: 2 }}>✓ Tous vos documents sont complets !</p>
          <p style={{ color: '#166534', fontSize: 13 }}>Notre équipe va les vérifier et soumettre votre dossier visa.</p>
        </div>
      )}

      {/* Upload sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {DOC_SECTIONS.map(section => {
          const uploaded = !!data.interns?.[section.key]
          const isUploading = uploadingKey === section.key
          const err = errors[section.key]
          return (
            <div key={section.key} style={{ background: 'white', border: `1.5px solid ${uploaded ? '#0d9e75' : '#e5e7eb'}`, borderRadius: 12, padding: 16, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#1a1918', flex: 1 }}>{section.label}</p>
                {uploaded && <span style={{ color: '#0d9e75', fontSize: 16, marginLeft: 8 }}>✅</span>}
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{section.instruction}</p>
              {err && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{err}</p>}
              <input ref={el => { inputRefs.current[section.key] = el }} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) void handleUpload(file, section) }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => inputRefs.current[section.key]?.click()} disabled={isUploading} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', border: 'none', background: uploaded ? '#dcfce7' : '#c8a96e', color: uploaded ? '#0d9e75' : 'white', opacity: isUploading ? 0.7 : 1 }}>
                  {isUploading ? 'Upload…' : uploaded ? '✓ Remplacer' : 'Uploader'}
                </button>
                {uploaded && <a href={data.interns?.[section.key] ?? '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'underline' }}>Voir</a>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Flight info */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Informations de vol</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>N° de vol arrivant à Bali</label><input style={inputStyle} placeholder="ex: SQ321" value={extras.flight_number} onChange={e => setExtras(x => ({ ...x, flight_number: e.target.value }))} /></div>
          <div><label style={labelStyle}>Ville de départ dernier vol</label><input style={inputStyle} placeholder="ex: Singapore SIN" value={extras.flight_departure_city} onChange={e => setExtras(x => ({ ...x, flight_departure_city: e.target.value }))} /></div>
        </div>
        <div style={{ marginTop: 12 }}><label style={labelStyle}>Heure d&apos;arrivée locale à Bali</label><input style={inputStyle} placeholder="ex: 14h35" value={extras.flight_arrival_time} onChange={e => setExtras(x => ({ ...x, flight_arrival_time: e.target.value }))} /></div>
      </div>

      {/* Mother identity */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Identité de votre mère</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Prénom</label><input style={inputStyle} value={extras.mother_first_name} onChange={e => setExtras(x => ({ ...x, mother_first_name: e.target.value }))} /></div>
          <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={extras.mother_last_name} onChange={e => setExtras(x => ({ ...x, mother_last_name: e.target.value }))} /></div>
        </div>
      </div>

      {/* Emergency contact */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1918', marginBottom: 12 }}>Contact d&apos;urgence</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={labelStyle}>Nom complet</label><input style={inputStyle} value={extras.emergency_name} onChange={e => setExtras(x => ({ ...x, emergency_name: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={extras.emergency_email} onChange={e => setExtras(x => ({ ...x, emergency_email: e.target.value }))} /></div>
            <div><label style={labelStyle}>Téléphone</label><input style={inputStyle} value={extras.emergency_phone} onChange={e => setExtras(x => ({ ...x, emergency_phone: e.target.value }))} /></div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { void saveExtras() }}
        disabled={savingExtras}
        style={{ width: '100%', padding: 14, background: extrasSaved ? '#0d9e75' : '#c8a96e', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', marginBottom: 24 }}
      >
        {savingExtras ? 'Enregistrement…' : extrasSaved ? '✓ Enregistré !' : 'Enregistrer les informations'}
      </button>

      <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
        Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
      </p>
    </div>
  )
}
