'use client'

import { useState, useRef } from 'react'

interface InternData {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  nationality?: string
  birth_date?: string
  passport_number?: string
  passport_expiry?: string
  passport_issue_city?: string
  passport_issue_date?: string
  avatar_url?: string
  // New fields
  intern_level?: string
  diploma_track?: string
  school?: string
  school_contact_name?: string
  school_contact_email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  main_desired_job?: string
  spoken_languages?: string[]
  linkedin_url?: string
  qualification_debrief?: string
  intern_address?: string
  intern_signing_city?: string
  housing_budget?: string
  wants_scooter?: boolean
  touchpoint?: string
  private_comment_for_employer?: string
}

interface TabProfilProps {
  intern: InternData | null
  arrivalDate?: string | null
  internId?: string | null
}

function isPassportValid(passportExpiry?: string | null, arrivalDate?: string | null): boolean | null {
  if (!passportExpiry || !arrivalDate) return null
  const expiry = new Date(passportExpiry)
  const arrival = new Date(arrivalDate)
  const limit = new Date(arrival)
  limit.setMonth(limit.getMonth() + 6)
  return expiry >= limit
}

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  fieldKey,
  internId,
  type = 'text',
  badge,
}: {
  label: string
  value?: string | null
  fieldKey: string
  internId?: string
  type?: 'text' | 'date' | 'email' | 'textarea'
  badge?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  async function save() {
    if (!internId || current === (value ?? '')) { setEditing(false); return }
    setSaving(true)
    try {
      await fetch(`/api/interns/${internId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: current || null }),
      })
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && type !== 'textarea') { void save() }
    if (e.key === 'Escape') { setCurrent(value ?? ''); setEditing(false) }
  }

  const displayValue = type === 'date' && current
    ? new Date(current).toLocaleDateString('fr-FR')
    : current || '—'

  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
        {label}
        {badge}
      </span>
      {editing ? (
        <div className="flex items-center gap-2">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onBlur={() => { void save() }}
              onKeyDown={handleKeyDown}
              rows={2}
              autoFocus
              className="flex-1 text-sm border-b-2 border-[#c8a96e] bg-transparent focus:outline-none text-[#1a1918] resize-none"
            />
          ) : (
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              type={type}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onBlur={() => { void save() }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 text-sm border-b-2 border-[#c8a96e] bg-transparent focus:outline-none text-[#1a1918]"
            />
          )}
          {saving && <span className="text-xs text-zinc-400">…</span>}
        </div>
      ) : (
        <button
          onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className="text-sm text-[#1a1918] text-left hover:text-[#c8a96e] transition-colors group"
        >
          <span>{displayValue}</span>
          <span className="ml-1.5 opacity-0 group-hover:opacity-100 text-zinc-300 text-xs transition-opacity">✎</span>
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100">
      <div className="px-4 py-3 border-b border-zinc-50">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

export function TabProfil({ intern, arrivalDate, internId }: TabProfilProps) {
  if (!intern) {
    return <p className="text-sm text-zinc-400">Aucun profil associé</p>
  }

  const iid = internId ?? intern.id

  const passportValid = isPassportValid(intern.passport_expiry, arrivalDate)
  const passportBadge = passportValid === true
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-[#0d9e75]">VALIDE</span>
    : passportValid === false
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#dc2626]">INVALIDE</span>
    : null

  return (
    <div className="space-y-4">
      {/* Passport warning banner */}
      {passportValid === false && intern.passport_expiry && arrivalDate && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[#d97706] flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-900">
            Passeport invalide — expire le {new Date(intern.passport_expiry).toLocaleDateString('fr-FR')},
            doit être valide jusqu&apos;au {(() => {
              const d = new Date(arrivalDate)
              d.setMonth(d.getMonth() + 6)
              return d.toLocaleDateString('fr-FR')
            })()} (J+6 mois)
          </p>
        </div>
      )}

      <p className="text-xs text-zinc-400">Cliquer sur un champ pour l&apos;éditer.</p>

      {/* Identité */}
      <Section title="Identité">
        <EditableField label="Prénom" value={intern.first_name} fieldKey="first_name" internId={iid} />
        <EditableField label="Nom" value={intern.last_name} fieldKey="last_name" internId={iid} />
        <EditableField label="Email" value={intern.email} fieldKey="email" internId={iid} type="email" />
        <EditableField label="Téléphone / WhatsApp" value={intern.phone} fieldKey="phone" internId={iid} />
        <EditableField label="Nationalité" value={intern.nationality} fieldKey="nationality" internId={iid} />
        <EditableField label="Date de naissance" value={intern.birth_date} fieldKey="birth_date" internId={iid} type="date" />
        <EditableField label="Touchpoint" value={intern.touchpoint} fieldKey="touchpoint" internId={iid} />
      </Section>

      {/* Passeport */}
      <Section title="Passeport">
        <EditableField label="Numéro" value={intern.passport_number} fieldKey="passport_number" internId={iid} />
        <EditableField label="Expiration" value={intern.passport_expiry} fieldKey="passport_expiry" internId={iid} type="date" badge={passportBadge} />
        <EditableField label="Ville de délivrance" value={intern.passport_issue_city} fieldKey="passport_issue_city" internId={iid} />
        <EditableField label="Date de délivrance" value={intern.passport_issue_date} fieldKey="passport_issue_date" internId={iid} type="date" />
      </Section>

      {/* Études */}
      <Section title="Études">
        <EditableField label="École" value={intern.school} fieldKey="school" internId={iid} />
        <EditableField label="Niveau" value={intern.intern_level} fieldKey="intern_level" internId={iid} />
        <EditableField label="Diplôme" value={intern.diploma_track} fieldKey="diploma_track" internId={iid} />
        <EditableField label="Responsable pédagogique" value={intern.school_contact_name} fieldKey="school_contact_name" internId={iid} />
        <EditableField label="Email responsable" value={intern.school_contact_email} fieldKey="school_contact_email" internId={iid} type="email" />
      </Section>

      {/* Stage */}
      <Section title="Stage">
        <EditableField label="Métier souhaité" value={intern.main_desired_job} fieldKey="main_desired_job" internId={iid} />
        <EditableField label="Langues" value={intern.spoken_languages?.join(', ')} fieldKey="spoken_languages_text" internId={undefined} />
        <EditableField label="LinkedIn" value={intern.linkedin_url} fieldKey="linkedin_url" internId={iid} />
        <EditableField label="Débrief qualification" value={intern.qualification_debrief} fieldKey="qualification_debrief" internId={iid} type="textarea" />
        <EditableField label="Commentaire confidentiel employeur" value={intern.private_comment_for_employer} fieldKey="private_comment_for_employer" internId={iid} type="textarea" />
      </Section>

      {/* Contact urgence */}
      <Section title="Contact d'urgence">
        <EditableField label="Nom" value={intern.emergency_contact_name} fieldKey="emergency_contact_name" internId={iid} />
        <EditableField label="Téléphone" value={intern.emergency_contact_phone} fieldKey="emergency_contact_phone" internId={iid} />
      </Section>

      {/* Logement */}
      <Section title="Logement & Budget">
        <EditableField label="Adresse actuelle" value={intern.intern_address} fieldKey="intern_address" internId={iid} />
        <EditableField label="Ville de signature" value={intern.intern_signing_city} fieldKey="intern_signing_city" internId={iid} />
        <EditableField label="Budget logement" value={intern.housing_budget} fieldKey="housing_budget" internId={iid} />
      </Section>
    </div>
  )
}
