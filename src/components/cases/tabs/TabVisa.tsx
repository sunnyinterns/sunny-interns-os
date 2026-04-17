'use client'

import { useEffect, useState, useCallback } from 'react'

interface Package {
  id: string
  name: string
  price_eur: number
  visa_cost_idr?: number | null
  visa_types?: { id: string; code: string; name: string } | null
  visa_agents?: { id: string; name: string } | null
  max_stay_days?: number | null
  validity_label?: string | null
  processing_days?: number | null
}

interface TabVisaProps {
  caseData: {
    id: string
    status?: string
    portal_token?: string | null
    package_id?: string | null
    note_for_agent?: string | null
    visa_submitted_to_agent_at?: string | null
    visa_submitted_at?: string | null
    visa_received_at?: string | null
    billet_avion?: boolean | null
    papiers_visas?: boolean | null
    fazza_transfer_sent?: boolean | null
    fazza_transfer_amount_idr?: number | null
    fazza_transfer_date?: string | null
    interns?: {
      id?: string
      passport_page4_url?: string | null
      photo_id_url?: string | null
      bank_statement_url?: string | null
      return_plane_ticket_url?: string | null
      passport_number?: string | null
      passport_expiry?: string | null
      emergency_contact_name?: string | null
      emergency_contact_phone?: string | null
      emergency_contact_email?: string | null
      mother_first_name?: string | null
      mother_last_name?: string | null
      gender?: string | null
      sexe?: string | null
      school_contact_name?: string | null
      school_contact_email?: string | null
      school_contact_first_name?: string | null
      school_contact_last_name?: string | null
      school_contact_phone?: string | null
      flight_departure_date?: string | null
      flight_return_date?: string | null
      flight_departure_city?: string | null
      flight_number?: string | null
      [key: string]: unknown
    } | null
    desired_start_date?: string | null
    visa_agents?: { id: string; company_name: string; email?: string | null; whatsapp?: string | null } | null
    packages?: { id: string; name: string; price_eur: number; visa_cost_idr?: number | null; package_type?: string | null; processing_days?: number | null; validity_label?: string | null } | null
  }
  schoolName?: string | null
  onStatusChange?: () => void
}

function showToast() {
  const el = document.createElement('div')
  el.textContent = 'Sauvegardé ✓'
  el.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 bg-[#0d9e75] text-white text-sm font-medium rounded-lg shadow-lg transition-opacity'
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) }, 1500)
}

function SectionCard({ title, children, trailing, note }: { title: string; children: React.ReactNode; trailing?: React.ReactNode; note?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-50 flex items-center justify-between">
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{title}</h4>
        {trailing}
      </div>
      <div className="px-4 py-3 space-y-3">
        {children}
        {note && <p className="text-[11px] text-zinc-400 italic">{note}</p>}
      </div>
    </div>
  )
}

function FieldInput({ label, value, onChange, onBlur, type = 'text', required, readonly, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; onBlur: () => void;
  type?: string; required?: boolean; readonly?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-zinc-400 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        readOnly={readonly}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] ${readonly ? 'bg-zinc-50 text-zinc-500' : ''}`}
      />
    </div>
  )
}

function DocRow({ label, hint, url, portalLink }: { label: string; hint: string; url?: string | null; portalLink?: string | null }) {
  const received = !!url
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-base flex-shrink-0">{received ? '✅' : '❌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1918]">{label}</p>
        <p className="text-xs text-zinc-400">{hint}</p>
      </div>
      {received ? (
        <a href={url!} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline flex-shrink-0">Voir</a>
      ) : portalLink ? (
        <a href={portalLink} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-[#c8a96e] flex-shrink-0">Portail upload</a>
      ) : (
        <span className="text-xs text-zinc-300 flex-shrink-0">En attente</span>
      )}
    </div>
  )
}

export function TabVisa({ caseData, schoolName, onStatusChange }: TabVisaProps) {
  const intern = caseData.interns
  const internId = intern?.id as string | undefined

  // ─── Packages ───
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState(caseData.package_id ?? '')
  const [loadingPkgs, setLoadingPkgs] = useState(true)
  const [saving, setSaving] = useState(false)

  // ─── Note agent ───
  const [noteForAgent, setNoteForAgent] = useState(caseData.note_for_agent ?? '')
  const [savingNote, setSavingNote] = useState(false)

  // ─── FAZZA ───
  const [transferSent, setTransferSent] = useState(!!caseData.fazza_transfer_sent)
  const [transferAmount, setTransferAmount] = useState(caseData.fazza_transfer_amount_idr ?? 0)
  const [transferDate, setTransferDate] = useState(caseData.fazza_transfer_date ?? '')

  // ─── Send to agent ───
  const [sendingToAgent, setSendingToAgent] = useState(false)
  const [sentToAgent, setSentToAgent] = useState(!!caseData.visa_submitted_to_agent_at)
  const [copied, setCopied] = useState(false)

  // ─── Section 1: Passeport ───
  const [passportNumber, setPassportNumber] = useState((intern?.passport_number as string) ?? '')
  const [passportExpiry, setPassportExpiry] = useState((intern?.passport_expiry as string) ?? '')

  // ─── Section 3: Identité Mère ───
  const [motherFirst, setMotherFirst] = useState((intern?.mother_first_name as string) ?? '')
  const [motherLast, setMotherLast] = useState((intern?.mother_last_name as string) ?? '')

  // ─── Section 4: École & Responsable ───
  const [schoolContactFirst, setSchoolContactFirst] = useState((intern?.school_contact_first_name as string) ?? '')
  const [schoolContactLast, setSchoolContactLast] = useState((intern?.school_contact_last_name as string) ?? '')
  const [schoolContactEmail, setSchoolContactEmail] = useState((intern?.school_contact_email as string) ?? '')
  const [schoolContactPhone, setSchoolContactPhone] = useState((intern?.school_contact_phone as string) ?? '')

  // ─── Section 5: Contact d'urgence ───
  const [emergencyName, setEmergencyName] = useState((intern?.emergency_contact_name as string) ?? '')
  const [emergencyEmail, setEmergencyEmail] = useState((intern?.emergency_contact_email as string) ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState((intern?.emergency_contact_phone as string) ?? '')

  // ─── Section 7: Billet d'avion ───
  const [flightDepartureDate, setFlightDepartureDate] = useState((intern?.flight_departure_date as string) ?? '')
  const [flightReturnDate, setFlightReturnDate] = useState((intern?.flight_return_date as string) ?? '')
  const [flightDepartureCity, setFlightDepartureCity] = useState((intern?.flight_departure_city as string) ?? '')
  const [flightNumber, setFlightNumber] = useState((intern?.flight_number as string) ?? '')

  // ─── Section 8: Genre ───
  const [gender, setGender] = useState((intern?.gender as string) ?? (intern?.sexe as string) ?? '')

  // ─── Passport warning ───
  const passportWarning = (() => {
    if (!passportExpiry) return false
    const expiry = new Date(passportExpiry)
    const refDate = caseData.desired_start_date ? new Date(caseData.desired_start_date) : new Date()
    const limit = new Date(refDate)
    limit.setMonth(limit.getMonth() + 6)
    return expiry < limit
  })()

  // ─── Flight duration check ───
  const flightDurationWarning = (() => {
    if (!flightDepartureDate || !flightReturnDate) return null
    const dep = new Date(flightDepartureDate)
    const ret = new Date(flightReturnDate)
    const days = Math.floor((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24))
    if (days > 175) return `Durée du séjour : ${days} jours (max 175 jours pour le visa B211A)`
    return null
  })()

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.ok ? r.json() as Promise<Package[]> : Promise.resolve([]))
      .then((data) => { setPackages(data); setLoadingPkgs(false) })
      .catch(() => setLoadingPkgs(false))
  }, [])

  const selectedPkg = packages.find((p) => p.id === selectedPackageId)

  async function saveInternField(field: string, value: string) {
    if (!internId) return
    await fetch(`/api/interns/${internId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    }).then(() => showToast()).catch(() => null)
  }

  async function saveCaseField(patch: Record<string, unknown>) {
    await fetch(`/api/cases/${caseData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(() => showToast()).catch(() => null)
  }

  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId)
    const pkg = packages.find((p) => p.id === pkgId)
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkgId || null, payment_amount: pkg?.price_eur ?? null }),
      })
      showToast()
      onStatusChange?.()
    } finally {
      setSaving(false)
    }
  }, [caseData.id, packages, onStatusChange])

  const handleNoteSave = useCallback(async () => {
    setSavingNote(true)
    try {
      await fetch(`/api/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_for_agent: noteForAgent || null }),
      })
      showToast()
    } finally {
      setSavingNote(false)
    }
  }, [caseData.id, noteForAgent])

  const portalLink = caseData.portal_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${caseData.portal_token}/visa`
    : null

  function copyPortalLink() {
    if (!portalLink) return
    void navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cd = caseData as unknown as Record<string, unknown>
  const paymentOk = !!cd.payment_received_at || caseData.status === 'payment_received' || !!cd.payment_date
  const allDocsOk = !!(intern?.passport_page4_url && intern?.photo_id_url && intern?.bank_statement_url && intern?.return_plane_ticket_url)
  const allFieldsOk = !!(intern?.passport_number && intern?.passport_expiry && intern?.mother_first_name && intern?.mother_last_name)
  const canSendToAgent = paymentOk && allDocsOk && allFieldsOk
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [agentEmails, setAgentEmails] = useState<string[]>([])
  const [sentInfo, setSentInfo] = useState<{ agent_name?: string; portal_url?: string } | null>(null)

  useEffect(() => {
    if (showSendConfirm && agentEmails.length === 0) {
      fetch('/api/settings/visa-agents').then(r => r.ok ? r.json() : [])
        .then((agents: Array<{ contact_emails?: string[]; email?: string; is_default?: boolean }>) => {
          const def = agents.find(a => a.is_default) ?? agents[0]
          if (def) setAgentEmails((def.contact_emails && def.contact_emails.length > 0) ? def.contact_emails : (def.email ? [def.email] : []))
        })
    }
  }, [showSendConfirm, agentEmails.length])

  async function handleSendToAgent() {
    if (!canSendToAgent || sentToAgent) return
    setSendingToAgent(true)
    try {
      const res = await fetch(`/api/cases/${caseData.id}/send-visa-to-agent`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { agent_name?: string; portal_url?: string }
      setSentInfo(data)
      setSentToAgent(true)
      setShowSendConfirm(false)
      onStatusChange?.()
    } finally {
      setSendingToAgent(false)
    }
  }

  // Doc counts for progress bar
  const docFields = [
    intern?.passport_page4_url,
    intern?.photo_id_url,
    intern?.bank_statement_url,
    intern?.return_plane_ticket_url,
  ]
  const docsReady = docFields.filter(Boolean).length
  const docsTotal = docFields.length

  return (
    <div className="space-y-5">

      {/* ═══ 1. PASSEPORT ═══ */}
      <SectionCard title="🛂 Passeport">
        <DocRow
          label="Passeport page 4 (haute résolution)"
          hint="Double-page avec photo"
          url={intern?.passport_page4_url}
          portalLink={portalLink}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <FieldInput
            label="Numéro de passeport"
            value={passportNumber}
            onChange={setPassportNumber}
            onBlur={() => { void saveInternField('passport_number', passportNumber) }}
          />
          <FieldInput
            label="Date d'expiration"
            type="date"
            value={passportExpiry}
            onChange={setPassportExpiry}
            onBlur={() => { void saveInternField('passport_expiry', passportExpiry) }}
          />
        </div>
        {passportWarning && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            ⚠️ Passeport expire trop tôt par rapport à la date de démarrage (marge &lt; 6 mois).
          </div>
        )}
      </SectionCard>

      {/* ═══ 2. DOCUMENTS D'IDENTITÉ ═══ */}
      <SectionCard
        title="📸 Photo d'identité fond blanc"
        note="Format portrait, fond blanc strict, récente"
      >
        <DocRow
          label="Photo d'identité FOND BLANC"
          hint="Requis — format portrait, fond blanc strict"
          url={intern?.photo_id_url}
          portalLink={portalLink}
        />
      </SectionCard>

      {/* ═══ 3. IDENTITÉ MÈRE ═══ */}
      <SectionCard
        title="👩 Identité mère"
        note="Ces informations sont requises pour le dossier visa Indonésien"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput
            label="Prénom de la mère"
            value={motherFirst}
            onChange={setMotherFirst}
            onBlur={() => { void saveInternField('mother_first_name', motherFirst) }}
            required
          />
          <FieldInput
            label="Nom de famille de naissance de la mère"
            value={motherLast}
            onChange={setMotherLast}
            onBlur={() => { void saveInternField('mother_last_name', motherLast) }}
            required
            placeholder="Nom de naissance, pas nom de mariée"
          />
        </div>
      </SectionCard>

      {/* ═══ 4. ÉCOLE & RESPONSABLE PÉDAGOGIQUE ═══ */}
      <SectionCard
        title="🏫 École & Responsable Pédagogique"
        note="Coordonnées du contact administratif responsable du suivi des stages"
      >
        <FieldInput
          label="École / Université"
          value={schoolName ?? ''}
          onChange={() => {}}
          onBlur={() => {}}
          readonly
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput
            label="Prénom du Responsable Pédagogique"
            value={schoolContactFirst}
            onChange={setSchoolContactFirst}
            onBlur={() => { void saveInternField('school_contact_first_name', schoolContactFirst) }}
            required
          />
          <FieldInput
            label="Nom du Responsable Pédagogique"
            value={schoolContactLast}
            onChange={setSchoolContactLast}
            onBlur={() => { void saveInternField('school_contact_last_name', schoolContactLast) }}
            required
          />
          <FieldInput
            label="Email du Responsable Pédagogique"
            value={schoolContactEmail}
            onChange={setSchoolContactEmail}
            onBlur={() => { void saveInternField('school_contact_email', schoolContactEmail) }}
            type="email"
            required
          />
          <FieldInput
            label="Téléphone du Responsable Pédagogique"
            value={schoolContactPhone}
            onChange={setSchoolContactPhone}
            onBlur={() => { void saveInternField('school_contact_phone', schoolContactPhone) }}
            type="tel"
          />
        </div>
      </SectionCard>

      {/* ═══ 5. CONTACT D'URGENCE ═══ */}
      <SectionCard
        title="🆘 Contact d'urgence"
        note="Personne à contacter en cas d'urgence pendant le stage"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput
            label="Prénom et Nom du Contact d'urgence"
            value={emergencyName}
            onChange={setEmergencyName}
            onBlur={() => { void saveInternField('emergency_contact_name', emergencyName) }}
            required
          />
          <FieldInput
            label="Email du Contact d'Urgence"
            value={emergencyEmail}
            onChange={setEmergencyEmail}
            onBlur={() => { void saveInternField('emergency_contact_email', emergencyEmail) }}
            type="email"
            required
          />
          <FieldInput
            label="Téléphone du Contact d'Urgence"
            value={emergencyPhone}
            onChange={setEmergencyPhone}
            onBlur={() => { void saveInternField('emergency_contact_phone', emergencyPhone) }}
            type="tel"
            required
          />
        </div>
      </SectionCard>

      {/* ═══ 6. INFORMATIONS BANCAIRES ═══ */}
      <SectionCard
        title="💰 Informations bancaires"
        note="Il doit dater du mois en cours ou du mois dernier. Limité à 5MB. Si cela pose un problème, signale-le nous."
      >
        <DocRow
          label="Relevé bancaire"
          hint="Affichant au moins 2000€, mois en cours ou dernier mois, max 5MB"
          url={intern?.bank_statement_url}
          portalLink={portalLink}
        />
      </SectionCard>

      {/* ═══ 7. BILLET D'AVION ═══ */}
      <SectionCard title="✈️ Billet d'avion">
        {/* Encart informatif */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">🛩️ Billets d&apos;avion aller-retour obligatoires</p>
          <p className="text-xs text-blue-800">L&apos;immigration Indonésienne exige les billets d&apos;avion avant d&apos;octroyer le visa.</p>
          <div className="space-y-1 text-xs text-blue-700">
            <p>⏰ <strong>Ne réserve pas trop tôt !</strong> À partir de la soumission du billet, comptez 1 mois pour obtenir le visa. La date de départ doit être au moins dans 1 mois.</p>
            <p>📌 Le billet retour doit être dans un délai maximum de <strong>175 jours</strong> après l&apos;arrivée.</p>
            <p>⚠️ Une fois le visa obtenu, vous avez <strong>90 jours maximum</strong> pour entrer en Indonésie. Tout dépassement entraîne une amende de 70€/jour.</p>
          </div>
        </div>

        {/* Champs du formulaire */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <FieldInput
            label="Date réelle de départ"
            type="date"
            value={flightDepartureDate}
            onChange={setFlightDepartureDate}
            onBlur={() => { void saveInternField('flight_departure_date', flightDepartureDate) }}
            required
          />
          <FieldInput
            label="Date réelle de retour"
            type="date"
            value={flightReturnDate}
            onChange={setFlightReturnDate}
            onBlur={() => { void saveInternField('flight_return_date', flightReturnDate) }}
            required
          />
          <FieldInput
            label="Ville de départ (dernière escale avant Denpasar)"
            value={flightDepartureCity}
            onChange={setFlightDepartureCity}
            onBlur={() => { void saveInternField('flight_departure_city', flightDepartureCity) }}
            placeholder="ex: Singapore, Kuala Lumpur..."
          />
          <FieldInput
            label="Numéro du dernier vol (vers Denpasar)"
            value={flightNumber}
            onChange={setFlightNumber}
            onBlur={() => { void saveInternField('flight_number', flightNumber) }}
            placeholder="ex: QZ 501"
          />
        </div>

        {flightDurationWarning && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            ⚠️ {flightDurationWarning}
          </div>
        )}

        {/* Upload billet */}
        <DocRow
          label="Billets d'avion AR"
          hint="PDF/JPG, max 10MB — aller + retour"
          url={intern?.return_plane_ticket_url}
          portalLink={portalLink}
        />
      </SectionCard>

      {/* ═══ 8. GENRE ═══ */}
      <SectionCard title="🧍 Genre">
        <div className="max-w-xs">
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value)
              void saveInternField('gender', e.target.value)
            }}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          >
            <option value="">—</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTIONS EXISTANTES — Package, Documents progress, Portal, FAZZA, Note agent, Agent visa, Dates, Envoi */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Document progress bar */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-50 flex items-center justify-between">
          <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Documents requis — récapitulatif</h4>
          <span className="text-xs text-zinc-400">{docsReady}/{docsTotal} reçus</span>
        </div>
        <div className="h-1 bg-zinc-100">
          <div
            className="h-full bg-[#0d9e75] transition-all"
            style={{ width: `${Math.round((docsReady / docsTotal) * 100)}%` }}
          />
        </div>
      </div>

      {/* Portal link */}
      {portalLink && (
        <SectionCard title="Lien portail candidat">
          <p className="text-xs text-zinc-500 mb-2">Partager ce lien au stagiaire pour qu&apos;il upload ses documents.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-zinc-50 px-3 py-2 rounded-lg text-zinc-600 truncate border border-zinc-100">
              {portalLink}
            </code>
            <button
              onClick={copyPortalLink}
              className="px-3 py-2 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        </SectionCard>
      )}

      {/* Package visa */}
      <SectionCard title="Package visa">
        {loadingPkgs ? (
          <div className="h-9 bg-zinc-100 rounded-lg animate-pulse" />
        ) : (
          <select
            value={selectedPackageId}
            onChange={(e) => { void handlePackageChange(e.target.value) }}
            disabled={saving}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] disabled:opacity-60"
          >
            <option value="">— Sélectionner un package —</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} — {pkg.price_eur}€
                {pkg.visa_types ? ` · ${pkg.visa_types.code}` : ''}
                {pkg.max_stay_days ? ` · ${pkg.max_stay_days}j max` : ''}
              </option>
            ))}
          </select>
        )}
        {selectedPkg && (
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Prix : <strong className="text-[#1a1918]">{selectedPkg.price_eur}€</strong></span>
            {selectedPkg.visa_cost_idr && (
              <span>Coût visa IDR : <strong className="text-[#1a1918]">{selectedPkg.visa_cost_idr.toLocaleString()} IDR</strong></span>
            )}
            {selectedPkg.processing_days && (
              <span>Délai : <strong className="text-[#1a1918]">{selectedPkg.processing_days}j</strong></span>
            )}
            {selectedPkg.validity_label && (
              <span>Validité : <strong className="text-[#1a1918]">{selectedPkg.validity_label}</strong></span>
            )}
          </div>
        )}
        {!selectedPkg && caseData.packages && (
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Package actuel : <strong className="text-[#1a1918]">{caseData.packages.name} — {caseData.packages.price_eur}€</strong></span>
            {caseData.packages.validity_label && <span>Validité : <strong className="text-[#1a1918]">{caseData.packages.validity_label}</strong></span>}
          </div>
        )}
      </SectionCard>

      {/* Virement FAZZA */}
      <SectionCard title="Virement agent visa">
        {/* Montant auto depuis le package */}
        {(() => {
          const agentCostIdr = selectedPkg?.visa_cost_idr ?? caseData.packages?.visa_cost_idr ?? transferAmount
          const agentCostEur = agentCostIdr ? (agentCostIdr / 16500).toFixed(0) : null
          return (
            <div className="flex items-center justify-between mb-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">Montant à virer (depuis le package)</p>
                <p className="text-sm font-bold text-[#1a1918]">
                  {agentCostIdr ? `${agentCostIdr.toLocaleString()} IDR` : '—'}
                  {agentCostEur && <span className="text-zinc-400 font-normal ml-2">≈ {agentCostEur} €</span>}
                </p>
              </div>
              <a href="/fr/settings/packages" className="text-xs text-[#c8a96e] hover:underline">Modifier dans packages →</a>
            </div>
          )
        })()}
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={transferSent}
            onChange={(e) => {
              const checked = e.target.checked
              setTransferSent(checked)
              const amountIdr = selectedPkg?.visa_cost_idr ?? caseData.packages?.visa_cost_idr ?? transferAmount
              void saveCaseField({
                fazza_transfer_sent: checked,
                fazza_transfer_amount_idr: checked ? (amountIdr || null) : null,
                fazza_transfer_date: checked ? new Date().toISOString().split('T')[0] : null,
              })
            }}
            className="w-4 h-4 rounded accent-[#c8a96e]"
          />
          <span className="text-sm text-[#1a1918]">Virement envoyé à l'agent visa</span>
          {transferSent && transferDate && <span className="text-xs text-zinc-400">· {new Date(transferDate).toLocaleDateString('fr-FR')}</span>}
        </label>
      </SectionCard>

      {/* Note pour l'agent */}
      <SectionCard title="Note pour l'agent">
        <textarea
          value={noteForAgent}
          onChange={(e) => setNoteForAgent(e.target.value)}
          onBlur={() => { void handleNoteSave() }}
          placeholder="Instructions spéciales, remarques pour l'agent visa…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        />
        {savingNote && <p className="text-xs text-zinc-400 mt-1">Sauvegarde…</p>}
      </SectionCard>

      {/* Agent visa */}
      <SectionCard title="Agent visa">
        {caseData.visa_agents ? (
          <div className="space-y-1 text-sm">
            <p className="text-[#1a1918] font-medium">{caseData.visa_agents.company_name}</p>
            {caseData.visa_agents.email && (
              <p className="text-zinc-500">Email : <a href={`mailto:${caseData.visa_agents.email}`} className="text-[#c8a96e] hover:underline">{caseData.visa_agents.email}</a></p>
            )}
            {caseData.visa_agents.whatsapp && (
              <p className="text-zinc-500">WhatsApp : <a href={`https://wa.me/${caseData.visa_agents.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline">{caseData.visa_agents.whatsapp}</a></p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Aucun agent configuré</p>
        )}
      </SectionCard>

      {/* Dates visa */}
      <SectionCard title="Dates visa">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">Soumis à l&apos;agent</span>
            {caseData.visa_submitted_to_agent_at ? (
              <span className="text-sm text-[#1a1918]">
                {new Date(caseData.visa_submitted_to_agent_at).toLocaleDateString('fr-FR')}
              </span>
            ) : (
              <span className="text-sm text-zinc-300">Pas encore soumis</span>
            )}
          </div>
          {caseData.visa_received_at && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Visa reçu</span>
              <span className="text-sm text-[#0d9e75] font-medium">
                {new Date(caseData.visa_received_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Envoi à l'agent visa */}
      <div className="bg-white border border-zinc-100 rounded-xl p-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Envoi à l'agent visa</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span>{paymentOk ? '✅' : '⏳'}</span>
            <span className={paymentOk ? 'text-[#0d9e75]' : 'text-zinc-400'}>Paiement validé</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>{allDocsOk ? '✅' : '⏳'}</span>
            <span className={allDocsOk ? 'text-[#0d9e75]' : 'text-zinc-400'}>Tous les documents fournis</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>{allFieldsOk ? '✅' : '⏳'}</span>
            <span className={allFieldsOk ? 'text-[#0d9e75]' : 'text-zinc-400'}>Tous les champs remplis</span>
          </div>
        </div>

        {!sentToAgent ? (
          <button
            disabled={!canSendToAgent}
            onClick={() => setShowSendConfirm(true)}
            className={`w-full py-3 text-sm font-bold rounded-xl transition-colors ${
              canSendToAgent ? 'bg-[#c8a96e] text-white hover:bg-[#b8945a]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}>
            Envoyer le dossier à l'agent visa →
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-[#0d9e75]">✅ Dossier envoyé</p>
            {caseData.visa_submitted_to_agent_at && (
              <p className="text-xs text-zinc-500 mt-1">
                Le {new Date(caseData.visa_submitted_to_agent_at).toLocaleDateString('fr-FR')}
                {sentInfo?.agent_name ? ` à ${sentInfo.agent_name}` : ''}
              </p>
            )}
            {sentInfo?.portal_url && (
              <a href={sentInfo.portal_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">
                Voir le portail agent →
              </a>
            )}
          </div>
        )}
      </div>

      {showSendConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-base mb-2">Confirmer l'envoi du dossier</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Un email sera envoyé à <strong>{agentEmails.length > 0 ? agentEmails.join(', ') : "l'agent visa par défaut"}</strong> avec le dossier complet et le lien du portail.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ Cette action est irréversible. Vérifiez que tous les documents sont bien ceux de la bonne personne.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSendConfirm(false)} className="flex-1 py-2 border border-zinc-200 rounded-xl text-sm">Annuler</button>
              <button onClick={() => { void handleSendToAgent() }} disabled={sendingToAgent} className="flex-1 py-2 bg-[#c8a96e] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {sendingToAgent ? 'Envoi…' : 'Envoyer →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
