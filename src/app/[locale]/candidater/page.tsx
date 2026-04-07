'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const JOBS = [
  'Assistant Marketing Digital',
  'Community Manager',
  'Création de contenu',
  'Business Developer',
  'Chef de projet',
  'Graphiste',
  'Développeur Web',
  'Finance',
  'RH',
  'Communication',
  'Event',
  'Immobilier',
  'Hôtellerie',
  'AUTRE',
]

const LANGUAGES = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Mandarin', 'Autre']
const TOUCHPOINTS = ['Instagram', 'TikTok', 'Facebook', 'Google', 'Bouche à oreille', 'École', 'Autre']
const LEVELS = ['Bac+2', 'Bac+3', 'Licence', 'Master 1', 'Master 2']

interface FormData {
  // Step 1
  first_name: string
  last_name: string
  email: string
  whatsapp: string
  birth_date: string
  sexe: string
  nationality: string
  // Step 2
  passport_number: string
  passport_expiry: string
  passport_issue_city: string
  passport_issue_date: string
  // Step 3
  school: string
  intern_level: string
  diploma_track: string
  school_contact_name: string
  school_contact_email: string
  school_contact_phone: string
  // Step 4
  desired_start_date: string
  desired_duration: string
  main_desired_job: string
  spoken_languages: string[]
  linkedin_url: string
  comment: string
  touchpoint: string
  // Step 5
  emergency_contact_name: string
  emergency_contact_phone: string
  rgpd: boolean
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '', whatsapp: '', birth_date: '', sexe: '', nationality: '',
  passport_number: '', passport_expiry: '', passport_issue_city: '', passport_issue_date: '',
  school: '', intern_level: '', diploma_track: '', school_contact_name: '', school_contact_email: '', school_contact_phone: '',
  desired_start_date: '', desired_duration: '', main_desired_job: '', spoken_languages: [], linkedin_url: '', comment: '', touchpoint: '',
  emergency_contact_name: '', emergency_contact_phone: '', rgpd: false,
}

const STEP_LABELS = ['Identité', 'Passeport', 'École', 'Stage', 'Finalisation']

function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a1918] mb-1.5">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent transition-all'

export default function CandidaterPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passportWarning, setPassportWarning] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleLanguage(lang: string) {
    set('spoken_languages', form.spoken_languages.includes(lang)
      ? form.spoken_languages.filter((l) => l !== lang)
      : [...form.spoken_languages, lang]
    )
  }

  // Real-time email uniqueness check
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email || !emailRegex.test(form.email)) {
      setEmailChecked(false); setEmailExists(false); return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cases?email=${encodeURIComponent(form.email)}`)
        if (res.ok) {
          const d = await res.json() as { exists: boolean }
          setEmailExists(d.exists)
          setEmailChecked(true)
        }
      } catch { /* ignore */ }
    }, 600)
    return () => clearTimeout(t)
  }, [form.email])

  // Passport validity check
  function passportStatus(): 'valid' | 'invalid' | null {
    if (!form.passport_expiry || !form.desired_start_date) return null
    const expiry = new Date(form.passport_expiry)
    const arrival = new Date(form.desired_start_date)
    const limit = new Date(arrival)
    limit.setMonth(limit.getMonth() + 6)
    return expiry >= limit ? 'valid' : 'invalid'
  }

  function checkPassport() {
    const status = passportStatus()
    if (status === 'invalid' && form.passport_expiry && form.desired_start_date) {
      const expiry = new Date(form.passport_expiry)
      const arrival = new Date(form.desired_start_date)
      const limit = new Date(arrival)
      limit.setMonth(limit.getMonth() + 6)
      setPassportWarning(`Ton passeport expire le ${expiry.toLocaleDateString('fr-FR')}, mais il doit être valide jusqu'au ${limit.toLocaleDateString('fr-FR')} (6 mois après ton arrivée).`)
    } else {
      setPassportWarning(null)
    }
  }

  function validateStep(): boolean {
    setError(null)
    if (step === 1) {
      if (!form.first_name.trim()) { setError('Le prénom est requis'); return false }
      if (!form.last_name.trim()) { setError('Le nom est requis'); return false }
      if (!form.email.trim() || !form.email.includes('@')) { setError('Email invalide'); return false }
      if (emailExists) { setError('Cette adresse email est déjà utilisée'); return false }
    }
    if (step === 4) {
      if (!form.desired_start_date) { setError('La date de démarrage est requise'); return false }
    }
    if (step === 5) {
      if (!form.emergency_contact_name.trim()) { setError('Le nom du contact urgence est requis'); return false }
      if (!form.emergency_contact_phone.trim()) { setError('Le téléphone du contact urgence est requis'); return false }
      if (!form.rgpd) { setError('Vous devez accepter la politique de confidentialité'); return false }
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    if (step === 4) checkPassport()
    setStep((s) => Math.min(s + 1, 5))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    if (!validateStep()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/public/candidater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        if (res.status === 409) {
          setError('Cette adresse email est déjà utilisée.')
          setStep(1)
        } else if (res.status === 422) {
          setError(data.error ?? 'Passeport invalide.')
          setStep(2)
        } else {
          setError(data.error ?? 'Une erreur est survenue')
        }
        return
      }
      router.push(`/${locale}/candidature-envoyee`)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const ps = passportStatus()

  return (
    <div className="min-h-screen bg-[#fafaf7] px-4 py-10">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#c8a96e] mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1a1918]">Candidater chez Sunny Interns</h1>
          <p className="text-sm text-zinc-500 mt-1">Stage à Bali — Formulaire de candidature</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <div key={n} className="flex-1 flex flex-col items-center gap-1">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  done ? 'bg-[#0d9e75] text-white' : active ? 'bg-[#c8a96e] text-white' : 'bg-zinc-200 text-zinc-500',
                ].join(' ')}>
                  {done ? '✓' : n}
                </div>
                <span className={['text-xs font-medium hidden sm:block', active ? 'text-[#c8a96e]' : 'text-zinc-400'].join(' ')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#1a1918]">Étape {step} — {STEP_LABELS[step - 1]}</h2>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Prénom" required>
                  <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Marie" />
                </InputField>
                <InputField label="Nom" required>
                  <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Dupont" />
                </InputField>
              </div>
              <InputField label="Email" required>
                <div className="relative">
                  <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="marie@exemple.com" />
                  {emailChecked && !emailExists && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0d9e75] text-xs font-bold">✓</span>
                  )}
                  {emailChecked && emailExists && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dc2626] text-xs font-bold">✗</span>
                  )}
                </div>
                {emailChecked && emailExists && (
                  <p className="text-xs text-[#dc2626] mt-1">Cette adresse email est déjà utilisée.</p>
                )}
              </InputField>
              <InputField label="WhatsApp">
                <input className={inputCls} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+33 6 XX XX XX XX" />
              </InputField>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Date de naissance">
                  <input className={inputCls} type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
                </InputField>
                <InputField label="Sexe">
                  <select className={inputCls} value={form.sexe} onChange={(e) => set('sexe', e.target.value)}>
                    <option value="">—</option>
                    <option>Femme</option>
                    <option>Homme</option>
                    <option>Autre</option>
                  </select>
                </InputField>
              </div>
              <InputField label="Nationalité">
                <input className={inputCls} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Française" />
              </InputField>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <InputField label="Numéro de passeport">
                <input className={inputCls} value={form.passport_number} onChange={(e) => set('passport_number', e.target.value)} placeholder="07AB12345" />
              </InputField>
              <div>
                <label className="block text-sm font-medium text-[#1a1918] mb-1.5">{"Date d'expiration du passeport"}</label>
                <div className="flex items-center gap-2">
                  <input className={[inputCls, 'flex-1'].join(' ')} type="date" value={form.passport_expiry} onChange={(e) => set('passport_expiry', e.target.value)} />
                  {form.passport_expiry && form.desired_start_date && (
                    ps === 'valid'
                      ? <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-green-100 text-[#0d9e75] flex-shrink-0">VALIDE</span>
                      : <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-[#dc2626] flex-shrink-0">INVALIDE</span>
                  )}
                </div>
                {ps === 'invalid' && form.passport_expiry && form.desired_start_date && (
                  <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-[#dc2626]">
                    Passeport invalide — doit être valide jusqu&apos;au{' '}
                    {(() => { const d = new Date(form.desired_start_date); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString('fr-FR') })()} (J+6 mois).
                  </div>
                )}
                {!form.desired_start_date && <p className="text-xs text-zinc-400 mt-1">{"Indique une date de début (étape 4) pour la validation en temps réel."}</p>}
              </div>
              <InputField label="Ville de délivrance">
                <input className={inputCls} value={form.passport_issue_city} onChange={(e) => set('passport_issue_city', e.target.value)} placeholder="Paris" />
              </InputField>
              <InputField label="Date de délivrance">
                <input className={inputCls} type="date" value={form.passport_issue_date} onChange={(e) => set('passport_issue_date', e.target.value)} />
              </InputField>
              <p className="text-xs text-zinc-400">Le passeport doit être valide au moins 6 mois après ta date d'arrivée à Bali.</p>
            </>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <>
              <InputField label="École / Université">
                <input className={inputCls} value={form.school} onChange={(e) => set('school', e.target.value)} placeholder="NEOMA Business School" />
              </InputField>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Niveau d'études">
                  <select className={inputCls} value={form.intern_level} onChange={(e) => set('intern_level', e.target.value)}>
                    <option value="">—</option>
                    {LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </InputField>
                <InputField label="Diplôme">
                  <input className={inputCls} value={form.diploma_track} onChange={(e) => set('diploma_track', e.target.value)} placeholder="Management International" />
                </InputField>
              </div>
              <p className="text-sm font-medium text-zinc-600 pt-2">Responsable pédagogique</p>
              <InputField label="Nom et prénom">
                <input className={inputCls} value={form.school_contact_name} onChange={(e) => set('school_contact_name', e.target.value)} placeholder="Jean Professeur" />
              </InputField>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Email">
                  <input className={inputCls} type="email" value={form.school_contact_email} onChange={(e) => set('school_contact_email', e.target.value)} placeholder="jean@ecole.fr" />
                </InputField>
                <InputField label="Téléphone">
                  <input className={inputCls} value={form.school_contact_phone} onChange={(e) => set('school_contact_phone', e.target.value)} placeholder="+33 1 XX XX XX XX" />
                </InputField>
              </div>
            </>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Date de démarrage souhaitée">
                  <input className={inputCls} type="date" value={form.desired_start_date} onChange={(e) => { set('desired_start_date', e.target.value); checkPassport() }} />
                </InputField>
                <InputField label="Durée souhaitée">
                  <select className={inputCls} value={form.desired_duration} onChange={(e) => set('desired_duration', e.target.value)}>
                    <option value="">—</option>
                    {[1,2,3,4,5,6].map((n) => <option key={n} value={String(n)}>{n} mois</option>)}
                  </select>
                </InputField>
              </div>
              {passportWarning && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-600">⚠</span>
                  <p className="text-sm text-amber-800">{passportWarning}</p>
                </div>
              )}
              <InputField label="Métier principal souhaité">
                <select className={inputCls} value={form.main_desired_job} onChange={(e) => set('main_desired_job', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {JOBS.map((j) => <option key={j}>{j}</option>)}
                </select>
              </InputField>
              <div>
                <label className="block text-sm font-medium text-[#1a1918] mb-2">Langues parlées</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={[
                        'px-3 py-1.5 rounded-full text-sm border transition-all',
                        form.spoken_languages.includes(lang)
                          ? 'bg-[#c8a96e] border-[#c8a96e] text-white'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-[#c8a96e]',
                      ].join(' ')}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <InputField label="LinkedIn (optionnel)">
                <input className={inputCls} value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
              </InputField>
              <InputField label="Commentaire libre">
                <textarea className={inputCls} rows={3} value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Tes motivations, questions, infos complémentaires…" />
              </InputField>
              <InputField label="Comment tu as connu Sunny Interns ?">
                <select className={inputCls} value={form.touchpoint} onChange={(e) => set('touchpoint', e.target.value)}>
                  <option value="">—</option>
                  {TOUCHPOINTS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </InputField>
            </>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <>
              <p className="text-sm text-zinc-500">Dernière étape — contact d'urgence et validation.</p>
              <InputField label="Nom du contact d'urgence">
                <input className={inputCls} value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} placeholder="Papa / Maman Dupont" />
              </InputField>
              <InputField label="Téléphone du contact d'urgence">
                <input className={inputCls} value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} placeholder="+33 6 XX XX XX XX" />
              </InputField>
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.rgpd}
                    onChange={(e) => set('rgpd', e.target.checked)}
                    className="mt-1 w-4 h-4 accent-[#c8a96e]"
                  />
                  <span className="text-sm text-zinc-600">
                    J'accepte que mes données soient utilisées par Sunny Interns dans le cadre de ma candidature (conformément au RGPD).
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-[#dc2626]">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2.5 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                ← Retour
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Continuer →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="flex-1 py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b8994e] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer ma candidature'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
