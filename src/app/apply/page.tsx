'use client'

import { useState, useRef, useEffect } from 'react'

const COUNTRY_CODES = [
  { flag: '🇫🇷', code: '+33', label: 'France' },
  { flag: '🇧🇪', code: '+32', label: 'Belgique' },
  { flag: '🇨🇭', code: '+41', label: 'Suisse' },
  { flag: '🇨🇦', code: '+1', label: 'Canada' },
  { flag: '🇲🇦', code: '+212', label: 'Maroc' },
  { flag: '🇩🇿', code: '+213', label: 'Algérie' },
  { flag: '🇹🇳', code: '+216', label: 'Tunisie' },
  { flag: '🇪🇸', code: '+34', label: 'Espagne' },
  { flag: '🇩🇪', code: '+49', label: 'Allemagne' },
  { flag: '🇬🇧', code: '+44', label: 'Royaume-Uni' },
  { flag: '🇺🇸', code: '+1', label: 'États-Unis' },
]

const NATIONALITIES = ['Française', 'Belge', 'Suisse', 'Canadienne', 'Marocaine', 'Algérienne', 'Tunisienne', 'Espagnole', 'Autre']

const JOB_TYPES = [
  'Assistant marketing digital', 'Création de contenu', 'Community Manager',
  'Stratégie social media', 'SEO/SEA', 'Email CRM', 'RP/Events',
  'Études de marché', 'Prospection B2B', 'Négociation/Sales',
  'Account manager', 'E-commerce', 'Autre',
]

const DURATIONS = ['3 mois', '4 mois', '5 mois', '6 mois', 'Plus de 6 mois']

const LANGUAGES = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Mandarin', 'Arabe', 'Autre']

const TOUCHPOINTS = ['Instagram', 'TikTok', 'Facebook', 'Google', 'Bouche à oreille', 'École', 'Ambassadeur Bali Interns']

const STEP_TITLES = [
  'Commençons par faire connaissance 👋',
  'Parle-nous de toi 🌍',
  'Montre-nous ce que tu sais faire ✨',
  'Dis-nous ce que tu cherches 🎯',
  'Décris ton stage idéal à Bali 🌴',
  'On est transparents ✅',
  'Dernière étape ! Choisis un créneau 📅',
]

const STEP_SUBTITLES = [
  'Dis-nous qui tu es pour qu\'on puisse personnaliser ton expérience.',
  '', '', '', '', '', 'Un entretien de qualification de 20 minutes avec notre équipe.',
]

function getWorkingDays(count: number): Date[] {
  const days: Date[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (days.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

const SLOTS = ['9h00', '10h00', '11h00', '14h00', '15h00', '16h00']

function addMonths(date: string, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function parseDurationMonths(dur: string): number {
  const m = dur.match(/^(\d+)/)
  return m ? parseInt(m[1]) : 6
}

export default function ApplyPage() {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [price, setPrice] = useState(990)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    whatsapp_code: '+33',
    whatsapp_number: '',
    nationality: '',
    gender: '',
    birth_date: '',
    passport_expiry: '',
    linkedin_url: '',
    cv_file: null as File | null,
    cv_filename: '',
    spoken_languages: [] as string[],
    desired_jobs: [] as string[],
    duration: '',
    start_date: '',
    stage_ideal: '',
    commitment_price: false,
    commitment_budget: false,
    commitment_terms: false,
    touchpoint: '',
    referred_by_code: '',
    rdv_date: '',
    rdv_slot: '',
  })

  useEffect(() => {
    fetch('/api/settings/form_price')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) setPrice(Number(d.value)) })
      .catch(() => {})
  }, [])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleArray(key: 'spoken_languages' | 'desired_jobs', value: string, max?: number) {
    setForm(f => {
      const arr = f[key]
      if (arr.includes(value)) return { ...f, [key]: arr.filter(v => v !== value) }
      if (max && arr.length >= max) return f
      return { ...f, [key]: [...arr, value] }
    })
  }

  const minStartDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const computedEndDate = form.start_date && form.duration
    ? addMonths(form.start_date, parseDurationMonths(form.duration))
    : ''

  const passportWarning = (() => {
    if (!form.passport_expiry || !form.start_date) return false
    const startPlus6 = new Date(form.start_date)
    startPlus6.setMonth(startPlus6.getMonth() + 6)
    return new Date(form.passport_expiry) < startPlus6
  })()

  function canNext(): boolean {
    switch (step) {
      case 0: return !!(form.first_name && form.last_name && form.email && form.whatsapp_number)
      case 1: return !!(form.nationality && form.gender && form.birth_date && form.passport_expiry)
      case 2: return !!(form.cv_file && form.spoken_languages.length > 0)
      case 3: return !!(form.desired_jobs.length > 0 && form.duration && form.start_date)
      case 4: return form.stage_ideal.length >= 50
      case 5: return !!(form.commitment_price && form.commitment_budget && form.commitment_terms && form.touchpoint)
      case 6: return !!(form.rdv_date && form.rdv_slot)
      default: return false
    }
  }

  async function handleSubmit() {
    if (!canNext()) return
    setSubmitting(true)
    setError('')
    try {
      // Upload CV
      let cv_url = ''
      if (form.cv_file) {
        const fd = new FormData()
        fd.append('file', form.cv_file)
        fd.append('bucket', 'intern-cvs')
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!upRes.ok) throw new Error('Erreur upload CV')
        const upData = await upRes.json() as { url: string }
        cv_url = upData.url
      }

      const body = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        whatsapp: `${form.whatsapp_code}${form.whatsapp_number}`,
        nationality: form.nationality,
        gender: form.gender,
        birth_date: form.birth_date,
        passport_expiry: form.passport_expiry,
        linkedin_url: form.linkedin_url || null,
        cv_url,
        spoken_languages: form.spoken_languages,
        desired_jobs: form.desired_jobs,
        duration: form.duration,
        start_date: form.start_date,
        stage_ideal: form.stage_ideal,
        touchpoint: form.touchpoint,
        referred_by_code: form.referred_by_code || null,
        commitment_price_accepted: form.commitment_price,
        commitment_budget_accepted: form.commitment_budget,
        commitment_terms_accepted: form.commitment_terms,
        rdv_slot: `${form.rdv_date}T${form.rdv_slot.replace('h', ':')}:00`,
      }

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? 'Erreur lors de la soumission')
      }

      window.location.href = `/apply/confirmation?name=${encodeURIComponent(form.first_name)}&date=${encodeURIComponent(form.rdv_date)}&time=${encodeURIComponent(form.rdv_slot)}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  const workingDays = getWorkingDays(10)

  const inputClass = 'w-full px-4 py-3 bg-[#2a2318] border border-[#3d3428] rounded-xl text-[#f5f0e6] placeholder-[#6b5d4d] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm'
  const labelClass = 'block text-sm font-medium text-[#c8a96e] mb-1.5'

  return (
    <div className="min-h-screen bg-[#1a1410] text-[#f5f0e6]">
      {/* Progress bar */}
      <div className="sticky top-0 z-50 bg-[#1a1410]/95 backdrop-blur border-b border-[#2a2318]">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center gap-1.5">
                <div className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#c8a96e]' : 'bg-[#2a2318]'}`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6b5d4d] mt-1.5 text-center">Étape {step + 1} / 7</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#f5f0e6] mb-1">{STEP_TITLES[step]}</h1>
        {STEP_SUBTITLES[step] && <p className="text-sm text-[#8a7d6d] mb-6">{STEP_SUBTITLES[step]}</p>}
        {!STEP_SUBTITLES[step] && <div className="mb-6" />}

        {/* ── STEP 1 ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Prénom *</label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputClass} placeholder="Prénom" />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputClass} placeholder="Nom" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="ton@email.com" />
            </div>
            <div>
              <label className={labelClass}>WhatsApp *</label>
              <div className="flex gap-2">
                <select value={form.whatsapp_code} onChange={e => set('whatsapp_code', e.target.value)} className={`${inputClass} w-32 flex-shrink-0`}>
                  {COUNTRY_CODES.map(c => (
                    <option key={`${c.label}-${c.code}`} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input type="tel" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} className={inputClass} placeholder="6 12 34 56 78" />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nationalité *</label>
              <select value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inputClass}>
                <option value="">— Choisir —</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Genre *</label>
              <div className="flex gap-3">
                {['Femme', 'Homme', 'Autre'].map(g => (
                  <button key={g} type="button" onClick={() => set('gender', g)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${form.gender === g ? 'bg-[#c8a96e] text-[#1a1410]' : 'bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e]'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Date de naissance *</label>
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date d&apos;expiration passeport *</label>
              <input type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} className={inputClass} />
              {passportWarning && (
                <p className="mt-2 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  ⚠️ Ton passeport doit être valide au moins 6 mois après ton arrivée à Bali
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>LinkedIn URL</label>
              <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className={labelClass}>CV * (PDF/DOC, max 5MB)</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => {
                const f = e.target.files?.[0]
                if (f) {
                  if (f.size > 5 * 1024 * 1024) { setError('Fichier trop volumineux (max 5MB)'); return }
                  set('cv_file', f)
                  set('cv_filename', f.name)
                  setError('')
                }
              }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className={`w-full py-8 border-2 border-dashed rounded-xl text-center transition-all ${form.cv_filename ? 'border-[#c8a96e] bg-[#c8a96e]/10' : 'border-[#3d3428] hover:border-[#c8a96e] bg-[#2a2318]'}`}>
                {form.cv_filename ? (
                  <span className="text-sm text-[#c8a96e] font-medium">📄 {form.cv_filename}</span>
                ) : (
                  <span className="text-sm text-[#6b5d4d]">Glisse ton CV ici ou clique pour sélectionner</span>
                )}
              </button>
            </div>
            <div>
              <label className={labelClass}>Langues parlées *</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} type="button" onClick={() => toggleArray('spoken_languages', l)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${form.spoken_languages.includes(l) ? 'bg-[#c8a96e] text-[#1a1410]' : 'bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e]'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Type de poste souhaité * (max 2)</label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map(j => (
                  <button key={j} type="button" onClick={() => toggleArray('desired_jobs', j, 2)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${form.desired_jobs.includes(j) ? 'bg-[#c8a96e] text-[#1a1410]' : 'bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e]'}`}>
                    {j}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Durée souhaitée *</label>
              <select value={form.duration} onChange={e => set('duration', e.target.value)} className={inputClass}>
                <option value="">— Choisir —</option>
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date de début souhaitée *</label>
              <input type="date" min={minStartDate} value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputClass} />
            </div>
            {computedEndDate && (
              <div>
                <label className={labelClass}>Date de fin estimée</label>
                <p className="text-sm text-[#6b5d4d] bg-[#2a2318] rounded-xl px-4 py-3">
                  {new Date(computedEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>En quelques lignes, décris ton stage idéal...</label>
              <textarea
                value={form.stage_ideal}
                onChange={e => set('stage_ideal', e.target.value)}
                rows={6}
                maxLength={1000}
                placeholder="Je souhaite travailler dans une agence créative à Canggu, gérer les réseaux sociaux d'une marque lifestyle, dans une équipe internationale..."
                className={`${inputClass} resize-none`}
              />
              <p className={`text-xs mt-1 ${form.stage_ideal.length < 50 ? 'text-red-400' : 'text-[#6b5d4d]'}`}>
                {form.stage_ideal.length}/1000 caractères (min 50)
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 6 ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-[#2a2318] border border-[#3d3428] rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-[#c8a96e] mb-2">Avant de continuer, quelques points importants</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.commitment_price} onChange={e => set('commitment_price', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#c8a96e] flex-shrink-0" />
                <span className="text-sm text-[#d4cfc5]">
                  J&apos;ai bien compris que le programme Bali Interns est un service payant d&apos;accompagnement de stage d&apos;un montant de {price}€ HT
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.commitment_budget} onChange={e => set('commitment_budget', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#c8a96e] flex-shrink-0" />
                <span className="text-sm text-[#d4cfc5]">
                  J&apos;ai bien compris que je dois prévoir un budget de vie à Bali de 900€/mois minimum (logement, nourriture, transport)
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.commitment_terms} onChange={e => set('commitment_terms', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#c8a96e] flex-shrink-0" />
                <span className="text-sm text-[#d4cfc5]">
                  J&apos;accepte les conditions générales de vente de Bali Interns
                </span>
              </label>
            </div>

            <div className="border-t border-[#2a2318] pt-4">
              <label className={labelClass}>Comment tu nous as trouvé ? *</label>
              <select value={form.touchpoint} onChange={e => set('touchpoint', e.target.value)} className={inputClass}>
                <option value="">— Choisir —</option>
                {TOUCHPOINTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.touchpoint === 'Ambassadeur Bali Interns' && (
              <div>
                <label className={labelClass}>Code de parrainage</label>
                <input type="text" value={form.referred_by_code} onChange={e => set('referred_by_code', e.target.value)} className={inputClass} placeholder="CODE123" />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 7 ── */}
        {step === 6 && (
          <div className="space-y-4">
            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {workingDays.map(d => {
                const iso = d.toISOString().slice(0, 10)
                const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' })
                const dayNum = d.getDate()
                const monthName = d.toLocaleDateString('fr-FR', { month: 'short' })
                return (
                  <button key={iso} type="button" onClick={() => { set('rdv_date', iso); set('rdv_slot', '') }}
                    className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${form.rdv_date === iso ? 'bg-[#c8a96e] text-[#1a1410]' : 'bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e]'}`}>
                    <p className="text-[10px] uppercase font-medium">{dayName}</p>
                    <p className="text-lg font-bold">{dayNum}</p>
                    <p className="text-[10px]">{monthName}</p>
                  </button>
                )
              })}
            </div>

            {/* Time slots */}
            {form.rdv_date && (
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map(s => (
                  <button key={s} type="button" onClick={() => set('rdv_slot', s)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${form.rdv_slot === s ? 'bg-[#c8a96e] text-[#1a1410]' : 'bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-900/20 border border-red-800/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-[#2a2318] text-[#8a7d6d] border border-[#3d3428] hover:border-[#c8a96e] transition-all">
              Retour
            </button>
          )}
          {step < 6 ? (
            <button type="button" disabled={!canNext()} onClick={() => { setStep(s => s + 1); setError('') }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#c8a96e] text-[#1a1410] hover:bg-[#b8945a]">
              Continuer
            </button>
          ) : (
            <button type="button" disabled={!canNext() || submitting} onClick={() => { void handleSubmit() }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#c8a96e] text-[#1a1410] hover:bg-[#b8945a]">
              {submitting ? 'Envoi en cours...' : 'Confirmer ma candidature 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
