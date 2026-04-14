'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Package {
  id: string
  name: string
  description: string | null
  price_eur: number
  visa_types: { id: string; code: string; name: string; required_fields: unknown; required_documents: unknown } | null
}

interface VisaField {
  key: string
  label: string
  source: string
  required: boolean
  type: 'text' | 'date' | 'file' | 'select'
  description?: string
}

interface VisaDocument {
  key: string
  label: string
  source: string
  required: boolean
  file_format?: string
  description?: string
}

function VisaOnlyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')

  const [pkg, setPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenError, setTokenError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [nationalities, setNationalities] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [passportExpiry, setPassportExpiry] = useState('')
  const [motherFirst, setMotherFirst] = useState('')
  const [motherLast, setMotherLast] = useState('')
  const [desiredStart, setDesiredStart] = useState('')
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) {
      setTokenError(true)
      setLoading(false)
      return
    }
    fetch(`/api/packages/by-direct-token?token=${encodeURIComponent(token)}`)
      .then(async r => {
        if (!r.ok) { setTokenError(true); return null }
        return r.json()
      })
      .then((p: Package | null) => { if (p) setPkg(p) })
      .finally(() => setLoading(false))
  }, [token])

  const visaFields: VisaField[] = pkg?.visa_types?.required_fields as VisaField[] ?? []
  const visaDocs: VisaDocument[] = pkg?.visa_types?.required_documents as VisaDocument[] ?? []

  // Fields we collect via static inputs (so we don't show them twice)
  const STATIC_KEYS = new Set(['first_name', 'last_name', 'email', 'whatsapp', 'birth_date', 'nationalities', 'passport_number', 'passport_expiry', 'mother_first_name', 'mother_last_name', 'desired_start_date'])
  const extraFields = visaFields.filter(f => !STATIC_KEYS.has(f.key))

  async function handleUpload(docKey: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'visa-only')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const d = await res.json() as { url: string }
      setUploads(p => ({ ...p, [docKey]: d.url }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pkg) return
    setSubmitting(true)
    const body = {
      token,
      package_id: pkg.id,
      first_name: firstName,
      last_name: lastName,
      email,
      whatsapp,
      birth_date: birthDate || null,
      nationalities,
      passport_number: passportNumber,
      passport_expiry: passportExpiry || null,
      mother_first_name: motherFirst,
      mother_last_name: motherLast,
      desired_start_date: desiredStart || null,
      dynamic_values: dynamicValues,
      documents: uploads,
    }
    try {
      const res = await fetch('/api/apply/visa-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        router.push('/apply/visa-only/confirmation')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center text-zinc-400">Chargement…</div>
  if (tokenError || !pkg) return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-6">
      <div className="max-w-md bg-white border border-zinc-100 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="text-lg font-semibold text-[#1a1918] mb-2">Lien invalide ou expiré</h1>
        <p className="text-sm text-zinc-500">Contactez Bali Interns pour obtenir un nouvel accès.</p>
      </div>
    </div>
  )

  const formatEUR = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="min-h-screen bg-[#fafaf7] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <p className="text-xs uppercase tracking-wider text-[#c8a96e] font-bold mb-1">Bali Interns — Visa only</p>
          <h1 className="text-2xl font-semibold text-[#1a1918]">{pkg.name}</h1>
          {pkg.description && <p className="text-sm text-zinc-500 mt-2">{pkg.description}</p>}
          <p className="text-sm font-bold text-[#1a1918] mt-3">{formatEUR(pkg.price_eur)}</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-6">
          <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Données personnelles</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Prénom" className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input required placeholder="Nom" className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} />
              <input required type="email" placeholder="Email" className={inputCls + ' col-span-2'} value={email} onChange={e => setEmail(e.target.value)} />
              <input required placeholder="WhatsApp" className={inputCls + ' col-span-2'} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              <div><label className="text-xs text-zinc-500">Date de naissance</label><input type="date" className={inputCls} value={birthDate} onChange={e => setBirthDate(e.target.value)} /></div>
              <div><label className="text-xs text-zinc-500">Nationalité(s)</label><input className={inputCls} value={nationalities} onChange={e => setNationalities(e.target.value)} /></div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Passeport & famille</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="N° passeport" className={inputCls} value={passportNumber} onChange={e => setPassportNumber(e.target.value)} />
              <div><label className="text-xs text-zinc-500">Expiration</label><input required type="date" className={inputCls} value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} /></div>
              <input placeholder="Prénom de la mère" className={inputCls} value={motherFirst} onChange={e => setMotherFirst(e.target.value)} />
              <input placeholder="Nom de la mère" className={inputCls} value={motherLast} onChange={e => setMotherLast(e.target.value)} />
              <div className="col-span-2"><label className="text-xs text-zinc-500">Date d'arrivée prévue</label><input type="date" className={inputCls} value={desiredStart} onChange={e => setDesiredStart(e.target.value)} /></div>
            </div>
          </section>

          {extraFields.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Informations supplémentaires</h2>
              <div className="grid grid-cols-2 gap-3">
                {extraFields.map(f => (
                  <div key={f.key} className="col-span-2">
                    <label className="text-xs text-zinc-500">{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type === 'date' ? 'date' : 'text'}
                      required={f.required}
                      className={inputCls}
                      value={dynamicValues[f.key] ?? ''}
                      onChange={e => setDynamicValues(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {visaDocs.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Documents requis</h2>
              <div className="space-y-3">
                {visaDocs.map(d => (
                  <div key={d.key} className="bg-zinc-50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1a1918]">{d.label}{d.required && ' *'}</p>
                        {d.description && <p className="text-xs text-zinc-500">{d.description}</p>}
                        {d.file_format && <p className="text-[10px] text-zinc-400">Format: {d.file_format}</p>}
                      </div>
                      {uploads[d.key] && <span className="text-xs text-[#0d9e75]">✅</span>}
                    </div>
                    <input
                      type="file"
                      className="mt-2 text-xs"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(d.key, f) }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <button type="submit" disabled={submitting} className="w-full py-3 bg-[#c8a96e] text-white font-bold rounded-xl disabled:opacity-50">
            {submitting ? 'Envoi…' : 'Envoyer ma demande'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function VisaOnlyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafaf7]" />}>
      <VisaOnlyForm />
    </Suspense>
  )
}
