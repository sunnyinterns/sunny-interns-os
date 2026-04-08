'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface CompanyInfo { name: string; onboarding_completed_at?: string | null }

const COMPANY_TYPES = ['PT (Indonesia)', 'CV (Indonesia)', 'LLC', 'SARL', 'SAS', 'SA', 'LTD', 'Autre']

export default function CompanyOnboardingPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', company_type: '', registration_country: '', domiciliation: '', website: '',
    npwp: '', nib: '', siret: '', vat_number: '', legal_registration_number: '',
    hr_first_name: '', hr_last_name: '', hr_email: '', hr_whatsapp: '', hr_contact_title: '',
    terms_accepted: false,
  })

  useEffect(() => {
    if (!token) return
    fetch(`/api/onboarding/company/${token}`)
      .then(r => r.ok ? r.json() as Promise<CompanyInfo> : Promise.reject())
      .then(d => {
        setCompany(d)
        setForm(f => ({ ...f, name: d.name || '' }))
        if (d.onboarding_completed_at) setDone(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const isIndonesia = form.registration_country.toLowerCase().includes('indo')
  const isFrance = form.registration_country.toLowerCase().includes('fran')

  async function submit() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/onboarding/company/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDone(true)
    } else {
      const err = await res.json() as { error: string }
      setError(err.error || 'Erreur')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>Chargement...</div>
  if (!company) return <div style={{ textAlign: 'center', padding: '80px 20px', color: '#dc2626' }}>Lien invalide ou expiré.</div>

  if (done) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1918', marginBottom: 8 }}>Merci !</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Notre équipe va valider vos informations sous 24h.</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#c8a96e', marginBottom: 4 }}>Sunny Interns</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1918', marginBottom: 4 }}>Onboarding Partenaire</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>{company.name}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ width: 60, height: 4, borderRadius: 2, background: s <= step ? '#c8a96e' : '#e5e7eb', transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1918' }}>Informations générales</h2>
          <div>
            <label style={labelStyle}>Nom légal de la société *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={form.company_type} onChange={e => set('company_type', e.target.value)}>
              <option value="">Sélectionner...</option>
              {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pays d&apos;immatriculation *</label>
            <input style={inputStyle} value={form.registration_country} onChange={e => set('registration_country', e.target.value)} placeholder="Indonésie, France..." />
          </div>
          <div>
            <label style={labelStyle}>Adresse complète *</label>
            <input style={inputStyle} value={form.domiciliation} onChange={e => set('domiciliation', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Site web</label>
            <input style={inputStyle} type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!form.name || !form.registration_country || !form.domiciliation}
            style={{ width: '100%', padding: 12, background: '#c8a96e', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: (!form.name || !form.registration_country || !form.domiciliation) ? 0.5 : 1 }}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1918' }}>Documents légaux</h2>
          {isIndonesia && (
            <>
              <div><label style={labelStyle}>NPWP *</label><input style={inputStyle} value={form.npwp} onChange={e => set('npwp', e.target.value)} /></div>
              <div><label style={labelStyle}>NIB *</label><input style={inputStyle} value={form.nib} onChange={e => set('nib', e.target.value)} /></div>
            </>
          )}
          {isFrance && (
            <>
              <div><label style={labelStyle}>SIRET/SIREN *</label><input style={inputStyle} value={form.siret} onChange={e => set('siret', e.target.value)} /></div>
              <div><label style={labelStyle}>N° TVA intracommunautaire</label><input style={inputStyle} value={form.vat_number} onChange={e => set('vat_number', e.target.value)} /></div>
            </>
          )}
          {!isIndonesia && !isFrance && (
            <>
              <div><label style={labelStyle}>N° d&apos;enregistrement *</label><input style={inputStyle} value={form.legal_registration_number} onChange={e => set('legal_registration_number', e.target.value)} /></div>
              <div><label style={labelStyle}>N° TVA (si applicable)</label><input style={inputStyle} value={form.vat_number} onChange={e => set('vat_number', e.target.value)} /></div>
            </>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 12, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
            <button onClick={() => setStep(3)} style={{ flex: 1, padding: 12, background: '#c8a96e', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Suivant →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1918' }}>Contact RH</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Prénom *</label><input style={inputStyle} value={form.hr_first_name} onChange={e => set('hr_first_name', e.target.value)} /></div>
            <div><label style={labelStyle}>Nom *</label><input style={inputStyle} value={form.hr_last_name} onChange={e => set('hr_last_name', e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Email *</label><input style={inputStyle} type="email" value={form.hr_email} onChange={e => set('hr_email', e.target.value)} /></div>
          <div><label style={labelStyle}>WhatsApp</label><input style={inputStyle} value={form.hr_whatsapp} onChange={e => set('hr_whatsapp', e.target.value)} /></div>
          <div><label style={labelStyle}>Titre du poste</label><input style={inputStyle} value={form.hr_contact_title} onChange={e => set('hr_contact_title', e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.terms_accepted} onChange={e => set('terms_accepted', e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, color: '#6b7280' }}>J&apos;ai pris connaissance des conditions de partenariat avec Sunny Interns.</span>
          </label>
          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: 12, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
            <button
              onClick={() => { void submit() }}
              disabled={saving || !form.hr_first_name || !form.hr_last_name || !form.hr_email || !form.terms_accepted}
              style={{ flex: 1, padding: 12, background: '#c8a96e', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !form.terms_accepted ? 0.5 : 1 }}
            >
              {saving ? 'Envoi...' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
