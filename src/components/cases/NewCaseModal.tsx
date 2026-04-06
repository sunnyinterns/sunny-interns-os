'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'

interface NewCaseModalProps {
  onClose: () => void
  onSuccess: () => void
}

// --- Zod schemas per step ---
const step1Schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  birth_date: z.string().optional(),
})

const step2Schema = z.object({
  passport_number: z.string().min(1, 'Numéro de passeport requis'),
  passport_expiry: z.string().min(1, 'Date d\'expiration requise'),
  start_date: z.string().min(1, 'Date d\'arrivée requise'),
  duration_weeks: z.number().optional(),
  sectors: z.array(z.string()).optional(),
  internship_type: z.enum(['convention', 'visa_only']),
  notes: z.string().optional(),
})

const step3Schema = z.object({
  destination: z.enum(['Bali', 'Bangkok', 'autres']),
  dropoff_address: z.string().optional(),
  housing_type: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

type FieldErrors = Record<string, string>

const SECTORS = ['Marketing', 'Communication', 'Finance', 'RH', 'IT', 'Commerce', 'Hôtellerie']

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
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Step data
  const [step1, setStep1] = useState<Partial<Step1Data>>({})
  const [step2, setStep2] = useState<Partial<Step2Data>>({ internship_type: 'convention', sectors: [] })
  const [step3, setStep3] = useState<Partial<Step3Data>>({ destination: 'Bali' })

  const [errors, setErrors] = useState<FieldErrors>({})
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

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

  function validateStep1(): boolean {
    const result = step1Schema.safeParse(step1)
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        errs[key] = issue.message
      }
      setErrors(errs)
      return false
    }
    if (emailExists) {
      setErrors({ email: 'Email déjà utilisé' })
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
        const key = issue.path[0] as string
        errs[key] = issue.message
      }
      setErrors(errs)
      return false
    }
    // Passport validity check: must be > 6 months after start_date
    if (step2.passport_expiry && step2.start_date) {
      const arrival = new Date(step2.start_date)
      const expiry = new Date(step2.passport_expiry)
      const sixMonthsAfter = new Date(arrival)
      sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6)
      if (expiry < sixMonthsAfter) {
        setErrors({ passport_expiry: 'Le passeport doit être valide 6 mois après la date d\'arrivée' })
        return false
      }
    }
    setErrors({})
    return true
  }

  function validateStep3(): boolean {
    const result = step3Schema.safeParse(step3)
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        errs[key] = issue.message
      }
      setErrors(errs)
      return false
    }
    setErrors({})
    return true
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  async function handleSubmit() {
    if (!validateStep3()) return
    setSubmitting(true)
    setGlobalError(null)
    try {
      const payload = { ...step1, ...step2, ...step3 }
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setGlobalError(data.error ?? 'Erreur lors de la création')
        return
      }
      onSuccess()
    } catch {
      setGlobalError('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSector(sector: string) {
    const current = step2.sectors ?? []
    const next = current.includes(sector)
      ? current.filter((s) => s !== sector)
      : [...current, sector]
    setStep2((p) => ({ ...p, sectors: next }))
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
                    <span className="absolute right-3 top-2 text-xs text-zinc-400">Vérification…</span>
                  )}
                </div>
                {emailExists && !errors.email && (
                  <p className="text-xs text-[#dc2626]">Email déjà utilisé</p>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Téléphone" error={errors.phone}>
                  <input
                    className={inputClass}
                    value={step1.phone ?? ''}
                    onChange={(e) => setStep1((p) => ({ ...p, phone: e.target.value }))}
                  />
                </Field>
                <Field label="Nationalité" error={errors.nationality}>
                  <input
                    className={inputClass}
                    value={step1.nationality ?? ''}
                    onChange={(e) => setStep1((p) => ({ ...p, nationality: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Date de naissance" error={errors.birth_date}>
                <input
                  className={inputClass}
                  type="date"
                  value={step1.birth_date ?? ''}
                  onChange={(e) => setStep1((p) => ({ ...p, birth_date: e.target.value }))}
                />
              </Field>
            </>
          )}

          {/* Step 2 — Profil */}
          {step === 2 && (
            <>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Étape 2 — Profil</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="N° Passeport *" error={errors.passport_number}>
                  <input
                    className={inputClass}
                    value={step2.passport_number ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, passport_number: e.target.value }))}
                  />
                </Field>
                <Field label="Expiration passeport *" error={errors.passport_expiry}>
                  <input
                    className={inputClass}
                    type="date"
                    value={step2.passport_expiry ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, passport_expiry: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date d'arrivée *" error={errors.start_date}>
                  <input
                    className={inputClass}
                    type="date"
                    value={step2.start_date ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </Field>
                <Field label="Durée (semaines)" error={errors.duration_weeks}>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={step2.duration_weeks ?? ''}
                    onChange={(e) => setStep2((p) => ({ ...p, duration_weeks: Number(e.target.value) }))}
                  />
                </Field>
              </div>
              <Field label="Type de stage *" error={errors.internship_type}>
                <select
                  className={inputClass}
                  value={step2.internship_type ?? 'convention'}
                  onChange={(e) => setStep2((p) => ({ ...p, internship_type: e.target.value as 'convention' | 'visa_only' }))}
                >
                  <option value="convention">Convention de stage</option>
                  <option value="visa_only">Visa Only</option>
                </select>
              </Field>
              <Field label="Secteurs" error={undefined}>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => {
                    const selected = (step2.sectors ?? []).includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSector(s)}
                        className={[
                          'px-2.5 py-1 text-xs rounded-full border transition-colors',
                          selected
                            ? 'bg-[#c8a96e] text-white border-[#c8a96e]'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#c8a96e]',
                        ].join(' ')}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Notes" error={errors.notes}>
                <textarea
                  className={inputClass + ' resize-none'}
                  rows={3}
                  value={step2.notes ?? ''}
                  onChange={(e) => setStep2((p) => ({ ...p, notes: e.target.value }))}
                />
              </Field>
            </>
          )}

          {/* Step 3 — Destination */}
          {step === 3 && (
            <>
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Étape 3 — Destination</p>
              <Field label="Destination *" error={errors.destination}>
                <select
                  className={inputClass}
                  value={step3.destination ?? 'Bali'}
                  onChange={(e) => setStep3((p) => ({ ...p, destination: e.target.value as 'Bali' | 'Bangkok' | 'autres' }))}
                >
                  <option value="Bali">Bali</option>
                  <option value="Bangkok">Bangkok</option>
                  <option value="autres">Autres</option>
                </select>
              </Field>
              <Field label="Adresse de dépôt" error={errors.dropoff_address}>
                <input
                  className={inputClass}
                  value={step3.dropoff_address ?? ''}
                  onChange={(e) => setStep3((p) => ({ ...p, dropoff_address: e.target.value }))}
                />
              </Field>
              <Field label="Type d'hébergement" error={errors.housing_type}>
                <input
                  className={inputClass}
                  value={step3.housing_type ?? ''}
                  onChange={(e) => setStep3((p) => ({ ...p, housing_type: e.target.value }))}
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
          <Button variant="ghost" size="sm" onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}>
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
