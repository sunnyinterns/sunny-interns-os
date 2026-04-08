'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'

interface NewCaseModalProps {
  onClose: () => void
  onSuccess: () => void
}

const step1Schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  whatsapp: z.string().optional(),
})

const step2Schema = z.object({
  birth_date: z.string().optional(),
  nationality: z.string().optional(),
  passport_expiry: z.string().optional(),
  desired_start_date: z.string().min(1, 'Date de début requise'),
  desired_duration_months: z.number().min(1).max(6),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
interface Step3Data {
  school_name?: string
  main_desired_job?: string
  notes?: string
}
type FieldErrors = Record<string, string>

interface School {
  id: string
  name: string
  city?: string | null
}

const JOBS_14 = [
  'Marketing Digital',
  'Communication',
  'Finance & Comptabilité',
  'Ressources Humaines',
  'Informatique & Tech',
  'Commerce & Vente',
  'Hôtellerie & Restauration',
  'Surf & Sports Nautiques',
  'Yoga & Bien-être',
  'Photographie & Vidéo',
  'Design Graphique',
  'Événementiel',
  'Administration',
  'Autre',
]

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      {children}
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  )
}

const inputClass =
  'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-60'

export function NewCaseModal({ onClose, onSuccess }: NewCaseModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] ?? 'fr'

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [schools, setSchools] = useState<School[]>([])

  const [step1, setStep1] = useState<Partial<Step1Data>>({})
  const [step2, setStep2] = useState<Partial<Step2Data>>({ desired_duration_months: 3 })
  const [step3, setStep3] = useState<Step3Data>({})

  useEffect(() => {
    if (step === 3) {
      fetch('/api/schools')
        .then((r) => r.ok ? r.json() as Promise<School[]> : Promise.resolve([]))
        .then(setSchools)
        .catch(() => setSchools([]))
    }
  }, [step])

  async function checkEmail(email: string) {
    if (!email) return
    setCheckingEmail(true)
    try {
      const res = await fetch(`/api/intern-check?email=${encodeURIComponent(email)}`)
      const data = await res.json() as { exists: boolean }
      setEmailExists(data.exists)
    } catch {
      setEmailExists(false)
    } finally {
      setCheckingEmail(false)
    }
  }

  // Warning rouge si passeport expire < 6 mois après desired_start_date
  const passportWarn = (() => {
    const { passport_expiry, desired_start_date } = step2
    if (!passport_expiry || !desired_start_date) return false
    const start = new Date(desired_start_date)
    const expiry = new Date(passport_expiry)
    const limit = new Date(start)
    limit.setMonth(limit.getMonth() + 6)
    return expiry < limit
  })()

  function validateStep1(): boolean {
    const result = step1Schema.safeParse(step1)
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message
      }
      setErrors(errs)
      return false
    }
    if (emailExists) {
      setErrors({ email: 'Cet email est déjà utilisé — dossier existant ?' })
      return false
    }
    setErrors({})
    return true
  }

  function validateStep2(): boolean {
    const result = step2Schema.safeParse(step2)
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message
      }
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  function handleNext() {
    if (step === 1 && validateStep1()) { setStep(2); setErrors({}) }
    else if (step === 2 && validateStep2()) { setStep(3); setErrors({}) }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setGlobalError(null)
    try {
      const payload = {
        first_name: step1.first_name,
        last_name: step1.last_name,
        email: step1.email,
        phone: step1.whatsapp,
        birth_date: step2.birth_date || null,
        nationality: step2.nationality || null,
        passport_expiry: step2.passport_expiry || null,
        start_date: step2.desired_start_date,
        duration_months: step2.desired_duration_months,
        main_desired_job: step3.main_desired_job || null,
        school_name: step3.school_name || null,
        notes: step3.notes || null,
        destination: 'Bali',
      }
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) {
        if (res.status === 409) {
          setGlobalError('Email déjà utilisé — un dossier existe déjà pour cet email.')
        } else {
          setGlobalError(data.error ?? 'Erreur lors de la création')
        }
        return
      }
      if (!data.id) {
        setGlobalError('Dossier créé mais ID manquant — rechargez la page.')
        onSuccess()
        return
      }
      onSuccess()
      router.push(`/${locale}/cases/${data.id}`)
    } catch {
      setGlobalError('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a1918]">Nouveau dossier</h2>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={[
                    'h-1 rounded-full transition-all',
                    s <= step ? 'bg-[#c8a96e] w-8' : 'bg-zinc-200 w-4',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Step 1 — Identité */}
          {step === 1 && (
            <>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Étape 1 — Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom *" error={errors.first_name}>
                  <input
                    className={inputClass}
                    value={step1.first_name ?? ''}
                    onChange={(e) => setStep1((p) => ({ ...p, first_name: e.target.value }))}
                    autoFocus
                  />
                </Field>
                <Field label="Nom *" error={errors.last_name}>
                  <input
                    className={inputClass}
                    value={step1.last_name ?? ''}
                    onChange={(e) => setStep1((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Email *" error={errors.email}>
                <div className="relative">
                  <input
                    className={inputClass + ' w-full'}
                    type="email"
                    value={step1.email ?? ''}
                    onChange={(e) => { setStep1((p) => ({ ...p, email: e.target.value })); setEmailExists(false) }}
                    onBlur={(e) => void checkEmail(e.target.value)}
                  />
                  {checkingEmail && (
                    <span className="absolute right-3 top-2 text-xs text-zinc-400">Vérif…</span>
                  )}
                </div>
                {emailExists && !errors.email && (
                  <p className="text-xs text-[#dc2626]">Cet email est déjà utilisé — dossier existant ?</p>
                )}
              </Field>
              <Field label="WhatsApp (avec indicatif)" error={errors.whatsapp}>
                <input
                  className={inputClass}
                  type="tel"
                  placeholder="+33 6 XX XX XX XX"
                  value={step1.whatsapp ?? ''}
                  onChange={(e) => setStep1((p) => ({ ...p, whatsapp: e.target.value }))}
                />
              </Field>
            </>
          )}

          {/* Step 2 — Profil */}
          {step === 2 && (
            <>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Étape 2 — Profil</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de naissance" error={errors.birth_date}>
                  <input
                    className={inputClass}
                    type="date"
                    value={step2.birth_date ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, birth_date: e.target.value }))}
                  />
                </Field>
                <Field label="Nationalité" error={errors.nationality}>
                  <input
                    className={inputClass}
                    placeholder="Ex: Française"
                    value={step2.nationality ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, nationality: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Expiration passeport" error={errors.passport_expiry}>
                <input
                  className={inputClass + (passportWarn ? ' !border-[#dc2626] ring-1 ring-[#dc2626]' : '')}
                  type="date"
                  value={step2.passport_expiry ?? ''}
                  onChange={(e) => setStep2((p) => ({ ...p, passport_expiry: e.target.value }))}
                />
                {passportWarn && (
                  <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-[#dc2626] text-xs flex-shrink-0">⚠</span>
                    <p className="text-xs text-[#dc2626]">
                      Passeport invalide — doit être valide 6 mois après la date d&apos;arrivée
                    </p>
                  </div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date d'arrivée souhaitée *" error={errors.desired_start_date}>
                  <input
                    className={inputClass}
                    type="date"
                    value={step2.desired_start_date ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, desired_start_date: e.target.value }))}
                  />
                </Field>
                <Field label="Durée souhaitée *" error={errors.desired_duration_months?.toString()}>
                  <select
                    className={inputClass}
                    value={step2.desired_duration_months ?? 3}
                    onChange={(e) => setStep2((p) => ({ ...p, desired_duration_months: Number(e.target.value) }))}
                  >
                    <option value={1}>1 mois</option>
                    <option value={2}>2 mois</option>
                    <option value={3}>3 mois</option>
                    <option value={4}>4 mois</option>
                    <option value={5}>5 mois</option>
                    <option value={6}>6 mois (max B211A)</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* Step 3 — Projet de stage */}
          {step === 3 && (
            <>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Étape 3 — Projet de stage</p>
              <Field label="École / Université" error={undefined}>
                <select
                  className={inputClass}
                  value={step3.school_name ?? ''}
                  onChange={(e) => setStep3((p) => ({ ...p, school_name: e.target.value }))}
                >
                  <option value="">— Sélectionner (optionnel) —</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}{s.city ? ` (${s.city})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Métier souhaité" error={undefined}>
                <select
                  className={inputClass}
                  value={step3.main_desired_job ?? ''}
                  onChange={(e) => setStep3((p) => ({ ...p, main_desired_job: e.target.value }))}
                >
                  <option value="">— Sélectionner —</option>
                  {JOBS_14.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </Field>
              <Field label="Commentaire libre" error={undefined}>
                <textarea
                  className={inputClass + ' resize-none'}
                  rows={3}
                  placeholder="Motivations, contraintes, questions…"
                  value={step3.notes ?? ''}
                  onChange={(e) => setStep3((p) => ({ ...p, notes: e.target.value }))}
                />
              </Field>

              {globalError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-[#dc2626]">
                  {globalError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 1 ? onClose : () => { setStep((s) => s - 1); setErrors({}) }}
          >
            {step === 1 ? 'Annuler' : '← Retour'}
          </Button>
          {step < 3 ? (
            <Button variant="primary" size="sm" onClick={handleNext}>
              Continuer →
            </Button>
          ) : (
            <Button variant="primary" size="sm" loading={submitting} onClick={() => void handleSubmit()}>
              Créer le dossier
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
