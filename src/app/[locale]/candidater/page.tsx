'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TYPES_DEFAULT = [
  'Assistant marketing digital', 'Création de contenu', 'Community Manager',
  'Stratégie social media', 'SEO/SEA', 'Email CRM', 'RP/Events',
  'Études de marché', 'Prospection B2B', 'Négociation/sales',
  'Account manager', 'Onboarding/support', 'E-commerce', 'Autre',
]

const LANGUAGES = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Mandarin', 'Arabe', 'Autre']

const DURATIONS: { label: string; value: string; months: number | null }[] = [
  { label: '3 mois', value: '3', months: 3 },
  { label: '4 mois', value: '4', months: 4 },
  { label: '5 mois', value: '5', months: 5 },
  { label: '6 mois', value: '6', months: 6 },
  { label: 'Plus de 6 mois', value: 'plus_6', months: null },
]

const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
]

const TOUCHPOINTS = [
  'Instagram', 'TikTok', 'Facebook', 'Google',
  'Bouche à oreille', 'École', 'Ambassadeur Bali Interns',
]

const TOTAL_STEPS = 7

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  first_name: string
  last_name: string
  email: string
  whatsapp_code: string
  whatsapp_number: string
  // Step 2
  nationalities: string[]
  sexe: string
  birth_date: string
  passport_expiry: string
  // Step 3
  linkedin_url: string
  cv_file: File | null
  cv_url: string
  extra_docs: File[]
  spoken_languages: string[]
  // Step 4
  desired_duration: string
  desired_start_date: string
  desired_end_date: string
  main_desired_jobs: string[]
  main_desired_job_autre: string
  // Step 5
  stage_ideal: string
  // Step 6
  commitment_price_accepted: boolean
  commitment_budget_accepted: boolean
  commitment_terms_accepted: boolean
  touchpoint: string
  affiliate_code: string
  // Step 7 — RDV
  rdv_slot: string | null
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '',
  whatsapp_code: '+33', whatsapp_number: '',
  nationalities: [], sexe: '', birth_date: '', passport_expiry: '',
  linkedin_url: '', cv_file: null, cv_url: '', extra_docs: [], spoken_languages: [],
  desired_duration: '', desired_start_date: '', desired_end_date: '', main_desired_jobs: [], main_desired_job_autre: '',
  stage_ideal: '',
  commitment_price_accepted: false, commitment_budget_accepted: false, commitment_terms_accepted: false,
  touchpoint: '', affiliate_code: '',
  rdv_slot: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-3 border border-white/20 rounded-xl bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent transition-all text-lg'

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function passportStatus(expiry: string, startDate: string): 'valid' | 'invalid' | null {
  if (!expiry || !startDate) return null
  const exp = new Date(expiry)
  const limit = addMonths(new Date(startDate), 6)
  return exp >= limit ? 'valid' : 'invalid'
}

// ─── Slot types ───────────────────────────────────────────────────────────────

interface Slot {
  start: string
  end: string
  label: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CandidaterPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const refCode = searchParams?.get('ref') ?? ''

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [form, setForm] = useState<FormData>({ ...INITIAL, affiliate_code: refCode })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [nationalityInput, setNationalityInput] = useState('')
  const [jobTypes, setJobTypes] = useState<string[]>(JOB_TYPES_DEFAULT)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [affiliateValid, setAffiliateValid] = useState<null | { valid: boolean; prenom?: string }>(null)
  const [affiliateChecking, setAffiliateChecking] = useState(false)
  const [uploadingCv, setUploadingCv] = useState(false)
  const cvRef = useRef<HTMLInputElement>(null)
  const extraRef = useRef<HTMLInputElement>(null)
  const abandonSent = useRef(false)

  const PRICE = 990

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Load job types from settings
  useEffect(() => {
    fetch('/api/settings/job-types')
      .then((r) => r.ok ? r.json() as Promise<{ name: string }[]> : Promise.resolve([]))
      .then((data) => { if (data.length > 0) setJobTypes(data.map((d) => d.name)) })
      .catch(() => {})
  }, [])

  // Email uniqueness check
  useEffect(() => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email || !regex.test(form.email)) { setEmailChecked(false); setEmailExists(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cases?email=${encodeURIComponent(form.email)}`)
        if (res.ok) {
          const d = await res.json() as { exists: boolean }
          setEmailExists(d.exists); setEmailChecked(true)
        }
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [form.email])

  // Auto-calculate end date
  useEffect(() => {
    const dur = DURATIONS.find((d) => d.value === form.desired_duration)
    if (!dur || !form.desired_start_date || dur.months === null) {
      if (form.desired_duration === 'plus_6') set('desired_end_date', 'plus_6')
      return
    }
    const end = addMonths(new Date(form.desired_start_date), dur.months)
    set('desired_end_date', formatDate(end))
  }, [form.desired_duration, form.desired_start_date])

  // Load calendar slots when reaching step 7
  useEffect(() => {
    if (step !== 7) return
    setSlotsLoading(true)
    fetch('/api/calendar/slots')
      .then((r) => r.ok ? r.json() as Promise<Slot[]> : Promise.resolve([]))
      .then((data) => { setSlots(data); setSlotsLoading(false) })
      .catch(() => { setSlots(generateMockSlots()); setSlotsLoading(false) })
  }, [step])

  // Affiliate code validation
  useEffect(() => {
    if (!form.affiliate_code || form.affiliate_code.length < 4) { setAffiliateValid(null); return }
    const t = setTimeout(async () => {
      setAffiliateChecking(true)
      try {
        const res = await fetch(`/api/affiliates/${form.affiliate_code}/validate`)
        if (res.ok) {
          const d = await res.json() as { valid: boolean; prenom?: string }
          setAffiliateValid(d)
        } else {
          setAffiliateValid({ valid: false })
        }
      } catch {
        setAffiliateValid(null)
      } finally {
        setAffiliateChecking(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [form.affiliate_code])

  // Abandon tracking (step 3+)
  useEffect(() => {
    if (step < 3 || abandonSent.current) return
    const handler = () => {
      if (!form.email || abandonSent.current) return
      abandonSent.current = true
      navigator.sendBeacon('/api/form-abandonments', JSON.stringify({
        email: form.email,
        step_reached: step,
        data_collected: { first_name: form.first_name, last_name: form.last_name },
      }))
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [step, form.email, form.first_name, form.last_name])

  function generateMockSlots(): Slot[] {
    const slots: Slot[] = []
    const now = new Date()
    for (let d = 1; d <= 14; d++) {
      const date = new Date(now)
      date.setDate(date.getDate() + d)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      const hours = [9, 10, 11, 14, 15, 16, 17]
      for (const h of hours) {
        const start = new Date(date)
        start.setHours(h, 0, 0, 0)
        const end = new Date(start)
        end.setMinutes(45)
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: `${date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ${h}h00`,
        })
      }
    }
    return slots
  }

  function validateStep(): boolean {
    setError(null)
    if (step === 1) {
      if (!form.first_name.trim()) { setError('Le prénom est requis'); return false }
      if (!form.last_name.trim()) { setError('Le nom est requis'); return false }
      if (!form.email.trim() || !form.email.includes('@')) { setError('Email invalide'); return false }
      if (emailExists) { setError('Cette adresse email est déjà utilisée'); return false }
      if (!form.whatsapp_number.trim()) { setError('Le numéro WhatsApp est requis'); return false }
    }
    if (step === 2) {
      if (form.nationalities.length === 0) { setError('Indique au moins une nationalité'); return false }
      if (!form.sexe) { setError('Le genre est requis'); return false }
      if (!form.birth_date) { setError('La date de naissance est requise'); return false }
      const age = Math.floor((Date.now() - new Date(form.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 18) { setError('Tu dois avoir au moins 18 ans'); return false }
      if (!form.passport_expiry) { setError("La date d'expiration du passeport est requise"); return false }
    }
    if (step === 3) {
      if (!form.cv_url && !form.cv_file) { setError('Le CV est requis'); return false }
    }
    if (step === 4) {
      if (!form.desired_duration) { setError('La durée souhaitée est requise'); return false }
      if (!form.desired_start_date) { setError('La date de démarrage est requise'); return false }
      if (form.main_desired_jobs.length === 0) { setError('Choisis au moins un métier'); return false }
      if (form.main_desired_jobs.length > 3) { setError('Maximum 3 métiers'); return false }
    }
    if (step === 5) {
      if (form.stage_ideal.trim().length < 20) { setError('Décris ton stage idéal en quelques lignes minimum'); return false }
    }
    if (step === 6) {
      if (!form.commitment_price_accepted) { setError('Tu dois confirmer avoir compris le prix'); return false }
      if (!form.commitment_budget_accepted) { setError('Tu dois confirmer disposer du budget'); return false }
      if (!form.commitment_terms_accepted) { setError('Tu dois accepter les éléments contractuels'); return false }
      if (!form.touchpoint) { setError('Comment tu nous as trouvé ?'); return false }
    }
    if (step === 7) {
      if (!form.rdv_slot) { setError('Choisis un créneau pour ton appel'); return false }
    }
    return true
  }

  function goTo(next: number, dir: 'forward' | 'back') {
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 200)
  }

  function nextStep() {
    if (!validateStep()) return
    goTo(step + 1, 'forward')
  }

  function prevStep() {
    goTo(step - 1, 'back')
  }

  async function uploadCv(file: File): Promise<string> {
    setUploadingCv(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'intern-cvs')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload échoué')
      const d = await res.json() as { url: string }
      return d.url
    } finally {
      setUploadingCv(false)
    }
  }

  async function handleSubmit() {
    if (!validateStep()) return
    setSubmitting(true)
    setError(null)
    try {
      // Upload CV if file selected and not yet uploaded
      let cvUrl = form.cv_url
      if (form.cv_file && !cvUrl) {
        try { cvUrl = await uploadCv(form.cv_file) } catch { /* continue without url */ }
      }

      const whatsapp = `${form.whatsapp_code}${form.whatsapp_number.replace(/\s/g, '')}`
      const mainJob = form.main_desired_jobs.includes('Autre') && form.main_desired_job_autre
        ? [...form.main_desired_jobs.filter((j) => j !== 'Autre'), form.main_desired_job_autre].join(', ')
        : form.main_desired_jobs.join(', ')

      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        whatsapp,
        nationalities: form.nationalities,
        sexe: form.sexe,
        birth_date: form.birth_date,
        passport_expiry: form.passport_expiry,
        linkedin_url: form.linkedin_url,
        cv_url: cvUrl,
        spoken_languages: form.spoken_languages,
        desired_duration: form.desired_duration,
        desired_start_date: form.desired_start_date,
        desired_end_date: form.desired_end_date === 'plus_6' ? null : form.desired_end_date,
        main_desired_job: mainJob,
        stage_ideal: form.stage_ideal,
        commitment_price_accepted: form.commitment_price_accepted,
        commitment_budget_accepted: form.commitment_budget_accepted,
        commitment_terms_accepted: form.commitment_terms_accepted,
        touchpoint: form.touchpoint,
        referred_by_code: form.affiliate_code || null,
        rdv_slot_start: form.rdv_slot,
        rgpd: true,
      }

      const res = await fetch('/api/public/candidater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        if (res.status === 409) { setError("Cette adresse email est déjà utilisée."); setStep(1); return }
        setError(d.error ?? 'Une erreur est survenue')
        return
      }

      const d = await res.json() as { portal_token?: string }
      abandonSent.current = true
      router.push(`/${locale}/candidature-confirmee${d.portal_token ? `?token=${d.portal_token}` : ''}`)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const psStatus = passportStatus(form.passport_expiry, form.desired_start_date)
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  const stepTitles = [
    'On fait connaissance',
    'Ton identité',
    'Ton parcours',
    'Ton stage',
    'Ton stage idéal',
    'Prix & Engagement',
    'Prends ton rendez-vous',
  ]

  return (
    <div className="min-h-screen bg-[#111110] text-white flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#c8a96e] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-6 py-3 bg-[#111110]/90 backdrop-blur-sm border-b border-white/10">
          <span className="text-[#c8a96e] font-bold text-lg">S</span>
          <span className="text-xs text-white/40">{step} / {TOTAL_STEPS}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center pt-20 pb-10 px-4">
        <div
          className="w-full max-w-xl"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateY(${direction === 'forward' ? '20px' : '-20px'})`
              : 'translateY(0)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <p className="text-white/40 text-sm mb-2">{stepTitles[step - 1]}</p>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Bienvenue ! Commençons par faire connaissance. 👋
              </h1>
              <p className="text-white/50">Tout le monde utilise WhatsApp à Bali — assure-toi que le numéro est joignable !</p>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ton prénom *</label>
                  <input
                    className={inputCls}
                    placeholder="Marie"
                    value={form.first_name}
                    onChange={(e) => set('first_name', e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ton nom de famille *</label>
                  <input
                    className={inputCls}
                    placeholder="Dupont"
                    value={form.last_name}
                    onChange={(e) => set('last_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ton email *</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      type="email"
                      placeholder="marie@exemple.com"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                    {emailChecked && !emailExists && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0d9e75] font-bold">✓</span>
                    )}
                    {emailChecked && emailExists && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#dc2626] font-bold">✗</span>
                    )}
                  </div>
                  {emailExists && <p className="text-[#dc2626] text-xs mt-1">Cet email est déjà utilisé.</p>}
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ton WhatsApp *</label>
                  <div className="flex gap-2">
                    <select
                      value={form.whatsapp_code}
                      onChange={(e) => set('whatsapp_code', e.target.value)}
                      className="px-3 py-3 border border-white/20 rounded-xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={`${c.code}-${c.name}`} value={c.code} className="bg-[#111110]">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`${inputCls} flex-1`}
                      type="tel"
                      placeholder="6 12 34 56 78"
                      value={form.whatsapp_number}
                      onChange={(e) => set('whatsapp_number', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Parle-nous de toi. 🪪
              </h1>

              <div className="space-y-4 mt-6">
                {/* Nationalité(s) */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Nationalité(s) *</label>
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Ex: Française"
                      value={nationalityInput}
                      onChange={(e) => setNationalityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && nationalityInput.trim()) {
                          e.preventDefault()
                          if (!form.nationalities.includes(nationalityInput.trim())) {
                            set('nationalities', [...form.nationalities, nationalityInput.trim()])
                          }
                          setNationalityInput('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (nationalityInput.trim() && !form.nationalities.includes(nationalityInput.trim())) {
                          set('nationalities', [...form.nationalities, nationalityInput.trim()])
                          setNationalityInput('')
                        }
                      }}
                      className="px-4 py-3 bg-[#c8a96e] text-white rounded-xl font-medium text-sm"
                    >
                      + Ajouter
                    </button>
                  </div>
                  {form.nationalities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.nationalities.map((n) => (
                        <span key={n} className="flex items-center gap-1.5 px-3 py-1 bg-[#c8a96e]/20 border border-[#c8a96e]/40 rounded-full text-sm text-[#c8a96e]">
                          {n}
                          <button type="button" onClick={() => set('nationalities', form.nationalities.filter((x) => x !== n))} className="text-white/40 hover:text-white">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sexe */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Genre *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Femme', 'Homme'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => set('sexe', g)}
                        className={[
                          'py-4 rounded-xl border text-base font-medium transition-all',
                          form.sexe === g
                            ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e]'
                            : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40',
                        ].join(' ')}
                      >
                        {g === 'Femme' ? '♀ Femme' : '♂ Homme'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Date de naissance * (18 ans min)</label>
                  <input
                    className={inputCls}
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => set('birth_date', e.target.value)}
                    max={formatDate(new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000))}
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Date d'expiration du passeport *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      className={`${inputCls} flex-1`}
                      type="date"
                      value={form.passport_expiry}
                      onChange={(e) => set('passport_expiry', e.target.value)}
                    />
                    {psStatus === 'valid' && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0d9e75]/20 text-[#0d9e75] border border-[#0d9e75]/40 whitespace-nowrap">
                        ✓ VALIDE
                      </span>
                    )}
                    {psStatus === 'invalid' && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]/40 whitespace-nowrap">
                        ✗ INVALIDE
                      </span>
                    )}
                  </div>
                  {psStatus === 'invalid' && (
                    <div className="mt-2 px-4 py-3 bg-[#dc2626]/10 border border-[#dc2626]/30 rounded-xl text-sm text-[#dc2626]">
                      Ton passeport expire avant la fin de ton stage. Tu dois le renouveler.
                    </div>
                  )}
                  {!form.desired_start_date && (
                    <p className="text-xs text-white/30 mt-1">La validation en temps réel apparaît après avoir choisi ta date de démarrage (étape 4).</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Montre-nous ton parcours. 📄
              </h1>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">LinkedIn (optionnel)</label>
                  <input
                    className={inputCls}
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedin_url}
                    onChange={(e) => set('linkedin_url', e.target.value)}
                  />
                </div>

                {/* CV Upload */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ton CV * (PDF, DOC, DOCX — max 10 MB)</label>
                  <div
                    onClick={() => cvRef.current?.click()}
                    className={[
                      'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                      form.cv_file || form.cv_url
                        ? 'border-[#c8a96e]/60 bg-[#c8a96e]/10'
                        : 'border-white/20 hover:border-white/40 bg-white/5',
                    ].join(' ')}
                  >
                    {uploadingCv ? (
                      <p className="text-white/60 text-sm">Upload en cours…</p>
                    ) : form.cv_file ? (
                      <div>
                        <p className="text-[#c8a96e] font-medium">{form.cv_file.name}</p>
                        <p className="text-white/40 text-xs mt-1">{(form.cv_file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    ) : form.cv_url ? (
                      <p className="text-[#c8a96e] font-medium">CV uploadé ✓</p>
                    ) : (
                      <div>
                        <p className="text-white/60">Glisse ton CV ici ou clique pour le choisir</p>
                        <p className="text-white/30 text-sm mt-1">PDF, DOC, DOCX</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={cvRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        if (f.size > 10 * 1024 * 1024) { setError('Le CV ne doit pas dépasser 10 MB'); return }
                        set('cv_file', f)
                      }
                    }}
                  />
                </div>

                {/* Extra docs */}
                {form.extra_docs.length < 3 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => extraRef.current?.click()}
                      className="text-sm text-white/50 hover:text-white/70 underline"
                    >
                      + Ajouter un document supplémentaire (portfolio, lettre de motivation…) — max 3
                    </button>
                    <input
                      ref={extraRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f && form.extra_docs.length < 3) set('extra_docs', [...form.extra_docs, f])
                      }}
                    />
                  </div>
                )}
                {form.extra_docs.length > 0 && (
                  <div className="space-y-2">
                    {form.extra_docs.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                        <span className="text-sm text-white/60">{f.name}</span>
                        <button type="button" onClick={() => set('extra_docs', form.extra_docs.filter((_, j) => j !== i))} className="text-white/30 hover:text-white/60">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Langues */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">Langues parlées en environnement professionnel</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          const langs = form.spoken_languages.includes(lang)
                            ? form.spoken_languages.filter((l) => l !== lang)
                            : [...form.spoken_languages, lang]
                          set('spoken_languages', langs)
                        }}
                        className={[
                          'px-4 py-2 rounded-full border text-sm transition-all',
                          form.spoken_languages.includes(lang)
                            ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e]'
                            : 'border-white/20 text-white/60 hover:border-white/40',
                        ].join(' ')}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Parlons de ton stage. 🌴
              </h1>

              <div className="space-y-5 mt-6">
                {/* Durée */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">Durée souhaitée *</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => set('desired_duration', d.value)}
                        className={[
                          'py-3 rounded-xl border text-sm font-medium transition-all',
                          form.desired_duration === d.value
                            ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e]'
                            : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40',
                        ].join(' ')}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date de démarrage */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Date souhaitée de démarrage *</label>
                  <input
                    className={inputCls}
                    type="date"
                    value={form.desired_start_date}
                    min={formatDate(addMonths(new Date(), 1))}
                    onChange={(e) => set('desired_start_date', e.target.value)}
                  />
                </div>

                {/* Date de fin (calculée auto) */}
                {form.desired_start_date && form.desired_duration && form.desired_duration !== 'plus_6' && (
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Date de fin estimée (à 2–4 semaines près, c'est ok)</label>
                    <input
                      className={`${inputCls} opacity-80`}
                      type="date"
                      value={form.desired_end_date}
                      onChange={(e) => set('desired_end_date', e.target.value)}
                    />
                  </div>
                )}
                {form.desired_duration === 'plus_6' && (
                  <div className="px-4 py-3 bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-xl text-sm text-[#c8a96e]">
                    Stage de plus de 6 mois — nous en discuterons lors de l'appel pour le visa adapté.
                  </div>
                )}

                {/* Métiers */}
                <div>
                  <label className="block text-sm text-white/60 mb-2">Métiers souhaités * (1 à 3)</label>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.map((j) => {
                      const selected = form.main_desired_jobs.includes(j)
                      const disabled = !selected && form.main_desired_jobs.length >= 3
                      return (
                        <button
                          key={j}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const jobs = selected
                              ? form.main_desired_jobs.filter((x) => x !== j)
                              : [...form.main_desired_jobs, j]
                            set('main_desired_jobs', jobs)
                          }}
                          className={[
                            'px-3 py-2 rounded-xl border text-sm transition-all',
                            selected ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e]' : '',
                            !selected && !disabled ? 'border-white/20 text-white/60 hover:border-white/40' : '',
                            disabled ? 'border-white/10 text-white/20 cursor-not-allowed' : '',
                          ].join(' ')}
                        >
                          {j}
                        </button>
                      )
                    })}
                  </div>
                  {form.main_desired_jobs.includes('Autre') && (
                    <input
                      className={`${inputCls} mt-3`}
                      placeholder="Précise le métier…"
                      value={form.main_desired_job_autre}
                      onChange={(e) => set('main_desired_job_autre', e.target.value)}
                    />
                  )}
                  <p className="text-white/30 text-xs mt-2">{form.main_desired_jobs.length}/3 sélectionnés</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Décris ton stage idéal. ✍️
              </h1>
              <p className="text-white/50 text-sm leading-relaxed">
                En 5 lignes : objectifs, compétences, types d'entreprises, contraintes, ce que tu veux apprendre. Pas besoin d'être parfait, on clarifie ensemble en appel.
              </p>

              <div className="mt-4">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={8}
                  placeholder={`Exemple : "Je cherche un stage en marketing digital dans une start-up ou agence à Bali. Je veux développer mes compétences en création de contenu et social media. J'ai déjà une expérience en community management et je parle anglais couramment. Je souhaite être dans une équipe internationale..."`}
                  value={form.stage_ideal}
                  onChange={(e) => set('stage_ideal', e.target.value)}
                  autoFocus
                />
                <p className="text-white/30 text-xs mt-2">{form.stage_ideal.length} caractères (20 minimum)</p>
              </div>
            </div>
          )}

          {/* ── STEP 6 ── */}
          {step === 6 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Prix & Engagement. 📋
              </h1>

              <div className="px-4 py-4 bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-xl">
                <p className="text-[#c8a96e] font-semibold text-lg mb-1">Service Bali Interns</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  Le service coûte <strong className="text-white">{PRICE}€ TTC</strong>. Paiement uniquement après signature de la convention de stage.
                </p>
              </div>

              <div className="space-y-3 mt-2">
                {[
                  {
                    key: 'commitment_price_accepted' as const,
                    label: `Je confirme avoir compris le prix (${PRICE}€ TTC) et que le paiement intervient après signature de la convention`,
                  },
                  {
                    key: 'commitment_budget_accepted' as const,
                    label: `Je confirme disposer du budget pour régler ${PRICE}€ TTC une fois la convention signée`,
                  },
                  {
                    key: 'commitment_terms_accepted' as const,
                    label: 'Je confirme avoir pris connaissance des éléments contractuels',
                  },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => set(key, !form[key])}
                      className={[
                        'flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 transition-all flex items-center justify-center cursor-pointer',
                        form[key] ? 'border-[#c8a96e] bg-[#c8a96e]' : 'border-white/30 bg-transparent',
                      ].join(' ')}
                    >
                      {form[key] && <span className="text-[#111110] text-xs font-bold">✓</span>}
                    </div>
                    <span className="text-sm text-white/70 leading-relaxed group-hover:text-white/90 transition-colors" onClick={() => set(key, !form[key])}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Comment tu nous a trouvé */}
              <div className="mt-4">
                <label className="block text-sm text-white/60 mb-2">Comment tu nous as trouvé ? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TOUCHPOINTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('touchpoint', t)}
                      className={[
                        'py-2.5 px-3 rounded-xl border text-sm transition-all text-left',
                        form.touchpoint === t
                          ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e]'
                          : 'border-white/20 text-white/60 hover:border-white/40',
                      ].join(' ')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code ambassadeur */}
              {form.touchpoint === 'Ambassadeur Bali Interns' && (
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Code de parrainage</label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      placeholder="Ex: MARIE2024"
                      value={form.affiliate_code}
                      onChange={(e) => set('affiliate_code', e.target.value.toUpperCase())}
                    />
                    {affiliateChecking && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-xs">…</span>}
                  </div>
                  {affiliateValid?.valid && (
                    <p className="text-[#0d9e75] text-sm mt-1">
                      ✓ Code valide !{affiliateValid.prenom ? ` ${affiliateValid.prenom} te parraine.` : ''}
                    </p>
                  )}
                  {affiliateValid?.valid === false && form.affiliate_code && (
                    <p className="text-[#dc2626] text-sm mt-1">Code invalide ou expiré.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 7 ── */}
          {step === 7 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold leading-tight">
                Choisis ton créneau. 📅
              </h1>
              <p className="text-white/50 text-sm">Un premier appel de 45 minutes pour faire connaissance et valider ton profil.</p>

              {slotsLoading ? (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="px-4 py-6 bg-white/5 rounded-xl text-center">
                  <p className="text-white/50">Aucun créneau disponible pour le moment.</p>
                  <p className="text-white/30 text-sm mt-1">Tu peux soumettre ta candidature — nous te recontacterons pour planifier l'appel.</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4 max-h-96 overflow-y-auto pr-1">
                  {(() => {
                    const byDate: Record<string, Slot[]> = {}
                    slots.forEach((s) => {
                      const day = new Date(s.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                      if (!byDate[day]) byDate[day] = []
                      byDate[day].push(s)
                    })
                    return Object.entries(byDate).map(([day, daySlots]) => (
                      <div key={day}>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-2 capitalize">{day}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {daySlots.map((slot) => (
                            <button
                              key={slot.start}
                              type="button"
                              onClick={() => set('rdv_slot', slot.start)}
                              className={[
                                'py-2.5 rounded-xl border text-sm transition-all',
                                form.rdv_slot === slot.start
                                  ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#c8a96e] font-medium'
                                  : 'border-white/20 text-white/60 hover:border-white/40',
                              ].join(' ')}
                            >
                              {new Date(slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-[#dc2626]/20 border border-[#dc2626]/40 rounded-xl">
              <p className="text-sm text-[#dc2626]">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3.5 border border-white/20 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:border-white/40 transition-all"
              >
                ← Retour
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 py-3.5 px-6 bg-[#c8a96e] hover:bg-[#b8994e] text-[#111110] text-base font-bold rounded-xl transition-all"
              >
                Continuer →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="flex-1 py-3.5 px-6 bg-[#c8a96e] hover:bg-[#b8994e] disabled:opacity-60 text-[#111110] text-base font-bold rounded-xl transition-all"
              >
                {submitting ? 'Envoi en cours…' : 'Confirmer ma candidature ✓'}
              </button>
            )}
          </div>

          {step === TOTAL_STEPS && !form.rdv_slot && slots.length === 0 && !slotsLoading && (
            <p className="text-center text-white/40 text-xs mt-3">Tu peux soumettre sans créneau — nous te recontactons.</p>
          )}
        </div>
      </div>
    </div>
  )
}
