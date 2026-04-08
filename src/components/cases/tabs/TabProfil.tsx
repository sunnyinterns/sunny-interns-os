'use client'

import { useState, useRef } from 'react'

interface InternData {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  whatsapp?: string
  phone?: string
  nationality?: string
  gender?: string
  birth_date?: string
  passport_number?: string
  passport_expiry?: string
  passport_issue_city?: string
  passport_issue_date?: string
  avatar_url?: string
  intern_level?: string
  diploma_track?: string
  school_contact_name?: string
  school_contact_email?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  insurance_company?: string
  main_desired_job?: string
  desired_sectors?: string[]
  stage_ideal?: string
  spoken_languages?: string[]
  linkedin_url?: string
  cv_url?: string
  qualification_debrief?: string
  intern_address?: string
  intern_signing_city?: string
  housing_budget?: string
  housing_city?: string
  wants_scooter?: boolean
  touchpoint?: string
  private_comment_for_employer?: string
  referred_by_code?: string
  preferred_language?: string
  mother_first_name?: string
  mother_last_name?: string
  intern_bank_name?: string
  intern_bank_iban?: string
  passport_page4_url?: string | null
  photo_id_url?: string | null
  bank_statement_url?: string | null
  return_plane_ticket_url?: string | null
}

interface TabProfilProps {
  intern: InternData | null
  arrivalDate?: string | null
  internId?: string | null
  schoolName?: string | null
  desiredStartDate?: string | null
  desiredEndDate?: string | null
  desiredDurationMonths?: number | null
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
  type?: 'text' | 'date' | 'email' | 'textarea' | 'url'
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
              type={type === 'url' ? 'text' : type}
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

function ToggleField({
  label,
  value,
  fieldKey,
  internId,
}: {
  label: string
  value?: boolean
  fieldKey: string
  internId?: string
}) {
  const [current, setCurrent] = useState(!!value)

  async function toggle() {
    if (!internId) return
    const newVal = !current
    setCurrent(newVal)
    await fetch(`/api/interns/${internId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldKey]: newVal }),
    }).catch(() => setCurrent(!newVal))
  }

  return (
    <label className="flex items-center gap-3 py-2.5 border-b border-zinc-50 last:border-0 cursor-pointer">
      <input
        type="checkbox"
        checked={current}
        onChange={() => { void toggle() }}
        className="w-4 h-4 rounded accent-[#c8a96e]"
      />
      <span className="text-sm text-[#1a1918]">{label}</span>
    </label>
  )
}

function TagsDisplay({ label, values }: { label: string; values?: string[] | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {values && values.length > 0 ? values.map((v) => (
          <span key={v} className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-full">{v}</span>
        )) : (
          <span className="text-sm text-[#1a1918]">—</span>
        )}
      </div>
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

export function TabProfil({ intern, arrivalDate, internId, schoolName, desiredStartDate, desiredEndDate, desiredDurationMonths }: TabProfilProps) {
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

      {/* SECTION 1 — Identité */}
      <Section title="Identité">
        <div className="flex items-center gap-3 py-3 border-b border-zinc-50">
          <div className="w-12 h-12 rounded-full bg-[#c8a96e] flex items-center justify-center flex-shrink-0">
            {intern.avatar_url ? (
              <img src={intern.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <span className="text-white text-base font-semibold">
                {(intern.first_name?.[0] ?? '').toUpperCase()}{(intern.last_name?.[0] ?? '').toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a1918]">{intern.first_name} {intern.last_name}</p>
            {intern.email && <p className="text-xs text-zinc-400">{intern.email}</p>}
          </div>
        </div>
        <EditableField label="Prénom" value={intern.first_name} fieldKey="first_name" internId={iid} />
        <EditableField label="Nom" value={intern.last_name} fieldKey="last_name" internId={iid} />
        <EditableField label="Email" value={intern.email} fieldKey="email" internId={iid} type="email" />
        <EditableField label="WhatsApp" value={intern.whatsapp} fieldKey="whatsapp" internId={iid} />
        <EditableField label="Genre" value={intern.gender} fieldKey="gender" internId={iid} />
        <EditableField label="Date de naissance" value={intern.birth_date} fieldKey="birth_date" internId={iid} type="date" />
        <EditableField label="Nationalité" value={intern.nationality} fieldKey="nationality" internId={iid} />
        <EditableField label="Langue préférée" value={intern.preferred_language} fieldKey="preferred_language" internId={iid} />
        <EditableField label="Niveau d'anglais" value={intern.intern_level} fieldKey="intern_level" internId={iid} />
      </Section>

      {/* SECTION 2 — Passeport */}
      <Section title="Passeport">
        <EditableField label="Numéro" value={intern.passport_number} fieldKey="passport_number" internId={iid} />
        <EditableField label="Expiration" value={intern.passport_expiry} fieldKey="passport_expiry" internId={iid} type="date" badge={passportBadge} />
        <EditableField label="Ville de délivrance" value={intern.passport_issue_city} fieldKey="passport_issue_city" internId={iid} />
        <EditableField label="Date de délivrance" value={intern.passport_issue_date} fieldKey="passport_issue_date" internId={iid} type="date" />
      </Section>

      {/* SECTION 3 — Formation */}
      <Section title="Formation">
        <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50">
          <span className="text-xs text-zinc-400 font-medium">École</span>
          <span className="text-sm text-[#1a1918]">{schoolName ?? '—'}</span>
        </div>
        <EditableField label="Niveau" value={intern.intern_level} fieldKey="intern_level" internId={iid} />
        <EditableField label="Diplôme track" value={intern.diploma_track} fieldKey="diploma_track" internId={iid} />
        <EditableField label="Responsable pédagogique" value={intern.school_contact_name} fieldKey="school_contact_name" internId={iid} />
        <EditableField label="Email responsable" value={intern.school_contact_email} fieldKey="school_contact_email" internId={iid} type="email" />
      </Section>

      {/* SECTION 4 — Stage recherché */}
      <Section title="Stage recherché">
        <EditableField label="Métier principal" value={intern.main_desired_job} fieldKey="main_desired_job" internId={iid} />
        <TagsDisplay label="Secteurs souhaités" values={intern.desired_sectors} />
        {desiredDurationMonths && (
          <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50">
            <span className="text-xs text-zinc-400 font-medium">Durée souhaitée</span>
            <span className="text-sm text-[#1a1918]">{desiredDurationMonths} mois</span>
          </div>
        )}
        {desiredStartDate && (
          <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50">
            <span className="text-xs text-zinc-400 font-medium">Date démarrage souhaitée</span>
            <span className="text-sm text-[#1a1918]">{new Date(desiredStartDate).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        {desiredEndDate && (
          <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50">
            <span className="text-xs text-zinc-400 font-medium">Date fin souhaitée</span>
            <span className="text-sm text-[#1a1918]">{new Date(desiredEndDate).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        <TagsDisplay label="Langues parlées" values={intern.spoken_languages} />
        <EditableField label="LinkedIn" value={intern.linkedin_url} fieldKey="linkedin_url" internId={iid} type="url" />
        <EditableField label="Ton stage idéal" value={intern.stage_ideal} fieldKey="stage_ideal" internId={iid} type="textarea" />
        <EditableField label="Touchpoint (comment trouvé)" value={intern.touchpoint} fieldKey="touchpoint" internId={iid} />
      </Section>

      {/* SECTION 5 — Contact urgence + Assurance */}
      <Section title="Contact d'urgence & Assurance">
        <EditableField label="Nom contact urgence" value={intern.emergency_contact_name} fieldKey="emergency_contact_name" internId={iid} />
        <EditableField label="Téléphone urgence" value={intern.emergency_contact_phone} fieldKey="emergency_contact_phone" internId={iid} />
        <EditableField label="Compagnie assurance" value={intern.insurance_company} fieldKey="insurance_company" internId={iid} />
      </Section>

      {/* SECTION 6 — Logement & transport */}
      <Section title="Logement & Transport">
        <EditableField label="Budget logement" value={intern.housing_budget} fieldKey="housing_budget" internId={iid} />
        <EditableField label="Ville logement" value={intern.housing_city} fieldKey="housing_city" internId={iid} />
        <ToggleField label="Scooter souhaité" value={intern.wants_scooter} fieldKey="wants_scooter" internId={iid} />
        <EditableField label="Commentaire privé pour employeur" value={intern.private_comment_for_employer} fieldKey="private_comment_for_employer" internId={iid} type="textarea" />
      </Section>

      {/* SECTION 7 — Parrainage */}
      <Section title="Parrainage">
        <EditableField label="Code parrainage utilisé" value={intern.referred_by_code} fieldKey="referred_by_code" internId={iid} />
      </Section>
    </div>
  )
}
