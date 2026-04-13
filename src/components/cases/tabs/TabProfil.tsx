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
  intern: (InternData & { local_cv_url?: string | null; intern_level_notes?: string | null; english_level?: string | null; education_level?: string | null; school_country?: string | null; phone?: string | null }) | null
  arrivalDate?: string | null
  internId?: string | null
  caseId?: string | null
  schoolName?: string | null
  schoolId?: string | null
  desiredStartDate?: string | null
  desiredEndDate?: string | null
  desiredDurationMonths?: number | null
  qualificationNotes?: string | null
  desiredSectors?: string[] | null
  cvFeedback?: string | null
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

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} mois`,
}))

export function TabProfil({ intern, internId, caseId, schoolName, schoolId }: TabProfilProps) {
  if (!intern) {
    return <p className="text-sm text-zinc-400">Aucun profil associé</p>
  }

  const iid = internId ?? intern.id
  const birthDate = intern.birth_date ?? null
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)) : null

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">Cliquer sur un champ pour l&apos;éditer.</p>

      {/* SECTION 1 — Identité */}
      <Section title="🪪 Identité">
        <EditableField label="Prénom" value={intern.first_name} fieldKey="first_name" internId={iid} caseId={caseId} />
        <EditableField label="Nom" value={intern.last_name} fieldKey="last_name" internId={iid} caseId={caseId} />
        <EditableField label="Email" value={intern.email} fieldKey="email" internId={iid} caseId={caseId} type="email" />
        <EditableField label="WhatsApp" value={intern.whatsapp} fieldKey="whatsapp" internId={iid} caseId={caseId} />
        <EditableField label="Téléphone" value={(intern as Record<string, unknown>).phone as string | undefined} fieldKey="phone" internId={iid} caseId={caseId} />
        {/* Date naissance + âge sur même ligne */}
        <div className="flex gap-3 py-2.5 border-b border-zinc-50 items-center">
          <span className="text-[11px] text-zinc-400 font-medium w-32 flex-shrink-0">Date de naissance</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-[#1a1918]">{intern.birth_date ? new Date(intern.birth_date).toLocaleDateString('fr-FR') : <span className="text-zinc-300">—</span>}</span>
            {age !== null && <span className="text-xs text-zinc-400 font-medium">({age} ans)</span>}
          </div>
        </div>
        <EditableField label="Nationalité(s)" value={intern.nationality} fieldKey="nationality" internId={iid} caseId={caseId} />
        <EditableField label="Expiration passeport" value={intern.passport_expiry} fieldKey="passport_expiry" internId={iid} caseId={caseId} type="date" />
        {intern.linkedin_url ? (
          <div className="flex items-center gap-2 py-2.5 border-b border-zinc-50">
            <span className="text-[11px] text-zinc-400 font-medium w-32 flex-shrink-0">LinkedIn</span>
            <a href={intern.linkedin_url.startsWith('http') ? intern.linkedin_url : `https://linkedin.com/in/${intern.linkedin_url}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate">
              {intern.linkedin_url}
            </a>
          </div>
        ) : (
          <EditableField label="LinkedIn" value={intern.linkedin_url} fieldKey="linkedin_url" internId={iid} caseId={caseId} type="url" />
        )}
      </Section>

      {/* SECTION 2 — Formation */}
      <Section title="🎓 Formation">
        {/* École avec lien fiche */}
        <div className="flex items-center gap-2 py-2.5 border-b border-zinc-50">
          <span className="text-[11px] text-zinc-400 font-medium w-32 flex-shrink-0">École</span>
          {schoolId ? (
            <a href={`/fr/schools/${schoolId}`}
              className="text-sm text-[#c8a96e] hover:underline font-medium flex items-center gap-1">
              {schoolName || '—'} <span className="text-[10px]">↗</span>
            </a>
          ) : (
            <span className="text-sm text-[#1a1918]">{schoolName || <span className="text-zinc-300">—</span>}</span>
          )}
        </div>
        <EditableField label="Pays d'études" value={intern.school_contact_name ? undefined : (intern as Record<string, unknown>).school_country as string | undefined} fieldKey="school_country" internId={iid} caseId={caseId} />
        <EditableField label="Niveau d'études" value={intern.intern_level} fieldKey="intern_level" internId={iid} caseId={caseId} />
        <EditableField
          label="Formation / Diplôme"
          value={(intern as { education_level?: string | null }).education_level}
          fieldKey="education_level"
          internId={iid}
          caseId={caseId}
        />
        <EditableField
          label="Commentaire formation"
          value={(intern as { intern_level_notes?: string | null }).intern_level_notes}
          fieldKey="intern_level_notes"
          internId={iid}
          caseId={caseId}
          type="textarea"
        />
        {/* Responsable pédagogique → déplacé dans l'onglet Visa */}
      </Section>
    </div>
  )
}
