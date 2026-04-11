'use client'

import { useState, useRef } from 'react'

interface InternData {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  whatsapp?: string
  nationality?: string
  gender?: string
  sexe?: string
  birth_date?: string
  passport_number?: string
  passport_expiry?: string
  passport_issue_city?: string
  passport_issue_date?: string
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
  desired_end_date?: string | null
}

interface TabProfilProps {
  intern: InternData | null
  arrivalDate?: string | null
  internId?: string | null
  caseId?: string | null
  schoolName?: string | null
  desiredStartDate?: string | null
  desiredEndDate?: string | null
  desiredDurationMonths?: number | null
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email', whatsapp: 'WhatsApp', gender: 'Genre', sexe: 'Genre',
  birth_date: 'Date de naissance', nationality: 'Nationalité',
  passport_number: 'N° passeport', passport_expiry: 'Expiration passeport',
  passport_issue_city: 'Ville délivrance', passport_issue_date: 'Date délivrance',
  main_desired_job: 'Poste souhaité', intern_level: 'Niveau', diploma_track: 'Diplôme',
  school_contact_name: 'Responsable pédagogique', school_contact_email: 'Email responsable',
  emergency_contact_name: 'Contact urgence', emergency_contact_phone: 'Tél urgence',
  insurance_company: 'Assurance', linkedin_url: 'LinkedIn', stage_ideal: 'Stage idéal',
  mother_first_name: 'Prénom mère', mother_last_name: 'Nom mère',
  desired_start_date: 'Date début souhaitée', desired_end_date: 'Date fin souhaitée',
  desired_duration_months: 'Durée souhaitée', spoken_languages: 'Langues parlées',
}

function isPassportValid(passportExpiry?: string | null, arrivalDate?: string | null): boolean | null {
  if (!passportExpiry || !arrivalDate) return null
  const expiry = new Date(passportExpiry)
  const arrival = new Date(arrivalDate)
  const limit = new Date(arrival)
  limit.setMonth(limit.getMonth() + 6)
  return expiry >= limit
}

function showToast() {
  const el = document.createElement('div')
  el.textContent = 'Sauvegardé ✓'
  el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 bg-[#0d9e75] text-white text-sm font-medium rounded-lg shadow-lg transition-opacity'
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) }, 1500)
}

function EditableField({
  label, value, fieldKey, internId, caseId, target = 'intern',
  type = 'text', badge, readonly = false,
}: {
  label: string
  value?: string | null
  fieldKey: string
  internId?: string
  caseId?: string | null
  target?: 'intern' | 'case'
  type?: 'text' | 'date' | 'email' | 'textarea' | 'url'
  badge?: React.ReactNode
  readonly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  async function save() {
    const endpoint = target === 'case' ? `/api/cases/${caseId}` : `/api/interns/${internId}`
    if ((!internId && target === 'intern') || (!caseId && target === 'case') || current === (value ?? '')) {
      setEditing(false); return
    }
    setSaving(true)
    const oldValue = value ?? ''
    try {
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: current || null }),
      })
      showToast()
      if (caseId) {
        fetch(`/api/cases/${caseId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'field_edited', field_name: fieldKey,
            field_label: FIELD_LABELS[fieldKey] ?? fieldKey,
            old_value: String(oldValue), new_value: String(current || ''),
            description: `Modification de ${FIELD_LABELS[fieldKey] ?? fieldKey}`,
          }),
        }).catch(() => null)
      }
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

  if (readonly) {
    return (
      <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50 last:border-0">
        <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">{label}{badge}</span>
        <span className="text-sm text-[#1a1918]">{displayValue}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">{label}{badge}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onBlur={() => { void save() }}
              onKeyDown={handleKeyDown}
              rows={3}
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

function SelectField({
  label, value, fieldKey, internId, caseId, target = 'intern', options,
}: {
  label: string
  value?: string | null
  fieldKey: string
  internId?: string
  caseId?: string | null
  target?: 'intern' | 'case'
  options: { value: string; label: string }[]
}) {
  const [current, setCurrent] = useState(value ?? '')

  async function save(newVal: string) {
    setCurrent(newVal)
    const endpoint = target === 'case' ? `/api/cases/${caseId}` : `/api/interns/${internId}`
    try {
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: newVal || null }),
      })
      showToast()
      if (caseId) {
        fetch(`/api/cases/${caseId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'field_edited', field_name: fieldKey,
            field_label: FIELD_LABELS[fieldKey] ?? fieldKey,
            old_value: String(value ?? ''), new_value: String(newVal || ''),
            description: `Modification de ${FIELD_LABELS[fieldKey] ?? fieldKey}`,
          }),
        }).catch(() => null)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
      <select
        value={current}
        onChange={(e) => { void save(e.target.value) }}
        className="text-sm text-[#1a1918] bg-transparent border-b border-zinc-200 focus:border-[#c8a96e] focus:outline-none py-1 cursor-pointer appearance-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function LanguageChips({
  label, values, internId, caseId,
}: {
  label: string
  values?: string[] | null
  internId?: string
  caseId?: string | null
}) {
  const ALL_LANGS = ['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português', 'Nederlands', '中文', '日本語', '한국어', 'العربية', 'Bahasa Indonesia']
  const [current, setCurrent] = useState<string[]>(values ?? [])
  const [showPicker, setShowPicker] = useState(false)

  async function toggle(lang: string) {
    const next = current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]
    setCurrent(next)
    try {
      await fetch(`/api/interns/${internId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spoken_languages: next }),
      })
      showToast()
      if (caseId) {
        fetch(`/api/cases/${caseId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'field_edited', field_name: 'spoken_languages',
            field_label: 'Langues parlées',
            old_value: (values ?? []).join(', '), new_value: next.join(', '),
            description: 'Modification de Langues parlées',
          }),
        }).catch(() => null)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-1 py-2.5 border-b border-zinc-50 last:border-0">
      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {current.length > 0 ? current.map((v) => (
          <button
            key={v}
            onClick={() => { void toggle(v) }}
            className="px-2 py-0.5 text-xs font-medium bg-[#c8a96e]/10 text-[#c8a96e] rounded-full hover:bg-[#c8a96e]/20 transition-colors"
          >
            {v} ×
          </button>
        )) : (
          <span className="text-sm text-zinc-300">—</span>
        )}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500 rounded-full hover:bg-zinc-200 transition-colors"
        >
          +
        </button>
      </div>
      {showPicker && (
        <div className="flex flex-wrap gap-1.5 mt-1 p-2 bg-zinc-50 rounded-lg">
          {ALL_LANGS.filter((l) => !current.includes(l)).map((lang) => (
            <button
              key={lang}
              onClick={() => { void toggle(lang) }}
              className="px-2 py-0.5 text-xs font-medium bg-white border border-zinc-200 text-zinc-600 rounded-full hover:border-[#c8a96e] transition-colors"
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100">
      <div className="px-4 py-3 border-b border-zinc-50">
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="px-4 pb-1">{children}</div>
    </div>
  )
}

const GENDER_OPTIONS = [
  { value: 'Femme', label: 'Femme' },
  { value: 'Homme', label: 'Homme' },
  { value: 'Autre', label: 'Autre' },
]

const LEVEL_OPTIONS = [
  { value: 'Licence', label: 'Licence' },
  { value: 'Bachelor', label: 'Bachelor' },
  { value: 'Master 1', label: 'Master 1' },
  { value: 'Master 2', label: 'Master 2' },
  { value: 'MBA', label: 'MBA' },
]

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} mois`,
}))

export function TabProfil({ intern, arrivalDate, internId, caseId, schoolName, desiredStartDate, desiredEndDate, desiredDurationMonths }: TabProfilProps) {
  if (!intern) {
    return <p className="text-sm text-zinc-400">Aucun profil associé</p>
  }

  const iid = internId ?? intern.id

  const passportValid = isPassportValid(intern.passport_expiry, desiredStartDate ?? arrivalDate)
  const passportBadge = passportValid === true
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-[#0d9e75]">VALIDE</span>
    : passportValid === false
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#dc2626]">ATTENTION</span>
    : null

  return (
    <div className="space-y-4">
      {/* Passport warning banner */}
      {passportValid === false && intern.passport_expiry && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[#d97706] flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-900">
            Passeport invalide — expire le {new Date(intern.passport_expiry).toLocaleDateString('fr-FR')},
            doit être valide jusqu&apos;au {(() => {
              const d = new Date((desiredStartDate ?? arrivalDate)!)
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
            <span className="text-white text-base font-semibold">
              {(intern.first_name?.[0] ?? '').toUpperCase()}{(intern.last_name?.[0] ?? '').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1a1918]">{intern.first_name || '—'} {intern.last_name || '—'}</p>
            <p className="text-xs text-zinc-400">{intern.email || '—'}</p>
          </div>
        </div>
        <EditableField label="Email" value={intern.email} fieldKey="email" internId={iid} caseId={caseId} type="email" />
        <EditableField label="WhatsApp" value={intern.whatsapp} fieldKey="whatsapp" internId={iid} caseId={caseId} />
        <SelectField label="Genre" value={intern.sexe ?? intern.gender} fieldKey="sexe" internId={iid} caseId={caseId} options={GENDER_OPTIONS} />
        <EditableField label="Date de naissance" value={intern.birth_date} fieldKey="birth_date" internId={iid} caseId={caseId} type="date" />
        <EditableField label="Nationalité" value={intern.nationality} fieldKey="nationality" internId={iid} caseId={caseId} />
      </Section>

      {/* SECTION 2 — Passeport */}
      <Section title="Passeport">
        <EditableField label="Numéro" value={intern.passport_number} fieldKey="passport_number" internId={iid} caseId={caseId} />
        <EditableField label="Expiration" value={intern.passport_expiry} fieldKey="passport_expiry" internId={iid} caseId={caseId} type="date" badge={passportBadge} />
        <EditableField label="Ville de délivrance" value={intern.passport_issue_city} fieldKey="passport_issue_city" internId={iid} caseId={caseId} />
        <EditableField label="Date de délivrance" value={intern.passport_issue_date} fieldKey="passport_issue_date" internId={iid} caseId={caseId} type="date" />
      </Section>

      {/* SECTION 3 — Formation */}
      <Section title="Formation">
        <EditableField label="École" value={schoolName} fieldKey="" internId={iid} readonly />
        <SelectField label="Niveau d'études" value={intern.intern_level} fieldKey="intern_level" internId={iid} caseId={caseId} target="case" options={LEVEL_OPTIONS} />
        <EditableField label="Type diplôme" value={intern.diploma_track} fieldKey="diploma_track" internId={iid} caseId={caseId} target="case" />
        <EditableField label="Nom contact pédagogique" value={intern.school_contact_name} fieldKey="school_contact_name" internId={iid} caseId={caseId} />
        <EditableField label="Email contact pédagogique" value={intern.school_contact_email} fieldKey="school_contact_email" internId={iid} caseId={caseId} type="email" />
      </Section>

      {/* SECTION 4 — Stage recherché */}
      <Section title="Stage recherché">
        <EditableField label="Poste souhaité" value={intern.main_desired_job} fieldKey="main_desired_job" internId={iid} caseId={caseId} />
        <SelectField label="Durée souhaitée" value={desiredDurationMonths ? String(desiredDurationMonths) : ''} fieldKey="desired_duration_months" caseId={caseId} target="case" options={DURATION_OPTIONS} />
        <EditableField label="Date début souhaitée" value={desiredStartDate} fieldKey="desired_start_date" caseId={caseId} target="case" type="date" />
        <EditableField label="Date fin souhaitée" value={desiredEndDate ?? intern.desired_end_date} fieldKey="desired_end_date" internId={iid} caseId={caseId} type="date" />
        <LanguageChips label="Langues parlées" values={intern.spoken_languages} internId={iid} caseId={caseId} />
        <EditableField label="LinkedIn" value={intern.linkedin_url} fieldKey="linkedin_url" internId={iid} caseId={caseId} type="url" />
      </Section>

      {/* SECTION 5 — Stage idéal */}
      <Section title="Stage idéal">
        <EditableField label="Description" value={intern.stage_ideal} fieldKey="stage_ideal" internId={iid} caseId={caseId} type="textarea" />
      </Section>

      {/* SECTION 6 — Contact d'urgence & Assurance */}
      <Section title="Contact urgence + Assurance">
        <EditableField label="Nom contact urgence" value={intern.emergency_contact_name} fieldKey="emergency_contact_name" internId={iid} caseId={caseId} />
        <EditableField label="Téléphone urgence" value={intern.emergency_contact_phone} fieldKey="emergency_contact_phone" internId={iid} caseId={caseId} />
        <EditableField label="Compagnie assurance" value={intern.insurance_company} fieldKey="insurance_company" internId={iid} caseId={caseId} />
      </Section>

      {/* SECTION — CV & Commentaire employeur */}
      <Section title="CV & Commentaire employeur">
        {(intern.cv_url || (intern as { local_cv_url?: string }).local_cv_url) && (
          <div className="flex flex-wrap gap-2 py-3 border-b border-zinc-50">
            {(intern as { local_cv_url?: string }).local_cv_url && (
              <a href={(intern as { local_cv_url?: string }).local_cv_url!} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <span>📄</span>
                <span className="text-xs font-medium text-blue-700">CV local (validé)</span>
              </a>
            )}
            {intern.cv_url && (
              <a href={intern.cv_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-lg hover:bg-[#c8a96e]/20 transition-colors">
                <span>📄</span>
                <span className="text-xs font-medium text-[#8a6a2a]">CV candidat</span>
              </a>
            )}
          </div>
        )}
        <EditableField
          label="Commentaire pour l'employeur"
          value={(intern as { private_comment_for_employer?: string }).private_comment_for_employer}
          fieldKey="private_comment_for_employer"
          internId={iid}
          caseId={caseId}
          type="textarea"
        />
        <p className="text-[10px] text-zinc-400 pb-2 italic">Ce texte sera joint à l&apos;envoi du profil à l&apos;employeur</p>
      </Section>

      {/* SECTION 7 — Mère (pour le visa) */}
      <Section title="Mère (pour le visa)">
        <EditableField label="Prénom mère" value={intern.mother_first_name} fieldKey="mother_first_name" internId={iid} caseId={caseId} />
        <EditableField label="Nom mère" value={intern.mother_last_name} fieldKey="mother_last_name" internId={iid} caseId={caseId} />
      </Section>
    </div>
  )
}
