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

interface DocItem {
  key: string
  label: string
  urlField: keyof NonNullable<TabVisaProps['caseData']['interns']>
  hint: string
}

const DOCS: DocItem[] = [
  { key: 'passport_page4', label: 'Passeport page 4 (haute résolution)', urlField: 'passport_page4_url', hint: 'Double-page avec photo' },
  { key: 'photo_id', label: 'Photo fond blanc', urlField: 'photo_id_url', hint: 'Format ID, fond blanc strict' },
  { key: 'bank_statement', label: 'Relevé bancaire', urlField: 'bank_statement_url', hint: '3 derniers mois, traduit si besoin' },
  { key: 'return_ticket', label: 'Billet retour', urlField: 'return_plane_ticket_url', hint: 'Vol confirmé aller-retour' },
]

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
      passport_page4_url?: string | null
      photo_id_url?: string | null
      bank_statement_url?: string | null
      return_plane_ticket_url?: string | null
      mother_first_name?: string | null
      mother_last_name?: string | null
      [key: string]: unknown
    } | null
    visa_agents?: { id: string; company_name: string; email?: string | null; whatsapp?: string | null } | null
    packages?: { id: string; name: string; price_eur: number; visa_cost_idr?: number | null; package_type?: string | null; processing_days?: number | null; validity_label?: string | null } | null
  }
  onStatusChange?: () => void
}

function StatusBadge({ status }: { status?: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    visa_docs_sent: { label: 'Docs envoyés', cls: 'bg-blue-100 text-blue-700' },
    visa_submitted: { label: 'Soumis agent', cls: 'bg-amber-100 text-[#d97706]' },
    visa_in_progress: { label: 'En cours', cls: 'bg-amber-100 text-[#d97706]' },
    visa_received: { label: 'Visa reçu', cls: 'bg-green-100 text-[#0d9e75]' },
  }
  const info = status ? labels[status] : null
  if (!info) return null
  return (
    <span className={['px-2.5 py-1 rounded-full text-xs font-semibold', info.cls].join(' ')}>
      {info.label}
    </span>
  )
}

export function TabVisa({ caseData, onStatusChange }: TabVisaProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState(caseData.package_id ?? '')
  const [noteForAgent, setNoteForAgent] = useState(caseData.note_for_agent ?? '')
  const [saving, setSaving] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [sendingToAgent, setSendingToAgent] = useState(false)
  const [sentToAgent, setSentToAgent] = useState(!!caseData.visa_submitted_to_agent_at)
  const [copied, setCopied] = useState(false)
  const [loadingPkgs, setLoadingPkgs] = useState(true)

  // Mother fields
  const [motherFirst, setMotherFirst] = useState(caseData.interns?.mother_first_name as string ?? '')
  const [motherLast, setMotherLast] = useState(caseData.interns?.mother_last_name as string ?? '')

  // FAZZA transfer
  const [fazzaSent, setFazzaSent] = useState(!!caseData.fazza_transfer_sent)
  const [fazzaAmount, setFazzaAmount] = useState(caseData.fazza_transfer_amount_idr ?? 0)
  const [fazzaDate, setFazzaDate] = useState(caseData.fazza_transfer_date ?? '')

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.ok ? r.json() as Promise<Package[]> : Promise.resolve([]))
      .then((data) => { setPackages(data); setLoadingPkgs(false) })
      .catch(() => setLoadingPkgs(false))
  }, [])

  const selectedPkg = packages.find((p) => p.id === selectedPackageId)

  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId)
    const pkg = packages.find((p) => p.id === pkgId)
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: pkgId || null,
          payment_amount: pkg?.price_eur ?? null,
        }),
      })
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
    } finally {
      setSavingNote(false)
    }
  }, [caseData.id, noteForAgent])

  async function handleMotherSave(field: string, value: string) {
    const internId = caseData.interns?.id as string | undefined
    if (!internId) return
    await fetch(`/api/interns/${internId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    }).catch(() => null)
  }

  async function handleFazzaPatch(patch: Record<string, unknown>) {
    await fetch(`/api/cases/${caseData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null)
  }

  const portalLink = caseData.portal_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${caseData.portal_token}/visa`
    : null

  function copyPortalLink() {
    if (!portalLink) return
    void navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canSendToAgent = !!caseData.billet_avion && !!caseData.papiers_visas

  async function handleSendToAgent() {
    if (!canSendToAgent || sentToAgent) return
    setSendingToAgent(true)
    try {
      const res = await fetch(`/api/cases/${caseData.id}/send-to-agent`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSentToAgent(true)
      onStatusChange?.()
    } finally {
      setSendingToAgent(false)
    }
  }

  const docsReady = DOCS.filter((d) => !!caseData.interns?.[d.urlField]).length
  const docsTotal = DOCS.length

  return (
    <div className="space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-zinc-700">Statut visa</h3>
        <StatusBadge status={caseData.status} />
        {caseData.visa_submitted_to_agent_at && (
          <span className="text-xs text-zinc-400">
            Soumis le {new Date(caseData.visa_submitted_to_agent_at).toLocaleDateString('fr-FR')}
          </span>
        )}
        {caseData.visa_received_at && (
          <span className="text-xs text-[#0d9e75] font-medium">
            Reçu le {new Date(caseData.visa_received_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {/* Section 1: Package */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-[#1a1918]">Package visa</h4>
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
        {/* Show package from case join if no selection */}
        {!selectedPkg && caseData.packages && (
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Package actuel : <strong className="text-[#1a1918]">{caseData.packages.name} — {caseData.packages.price_eur}€</strong></span>
            {caseData.packages.validity_label && <span>Validité : <strong className="text-[#1a1918]">{caseData.packages.validity_label}</strong></span>}
          </div>
        )}
      </div>

      {/* Section 2: Document checklist */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-50 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#1a1918]">Documents requis</h4>
          <span className="text-xs text-zinc-400">{docsReady}/{docsTotal} reçus</span>
        </div>
        <div className="h-1 bg-zinc-100">
          <div
            className="h-full bg-[#0d9e75] transition-all"
            style={{ width: `${Math.round((docsReady / docsTotal) * 100)}%` }}
          />
        </div>
        <div className="divide-y divide-zinc-50">
          {DOCS.map((doc) => {
            const url = caseData.interns?.[doc.urlField] as string | null | undefined
            const received = !!url
            return (
              <div key={doc.key} className="flex items-center gap-3 px-4 py-3">
                <div className={[
                  'w-2.5 h-2.5 rounded-full flex-shrink-0',
                  received ? 'bg-[#0d9e75]' : 'bg-[#dc2626]',
                ].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918]">{doc.label}</p>
                  <p className="text-xs text-zinc-400">{doc.hint}</p>
                </div>
                {received ? (
                  <a href={url!} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline flex-shrink-0">Voir</a>
                ) : (
                  <span className="text-xs text-zinc-300 flex-shrink-0">En attente</span>
                )}
              </div>
            )
          })}
        </div>
        {/* Mother fields for visa */}
        <div className="px-4 py-3 border-t border-zinc-50 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Infos mère (requis visa)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Prénom mère</label>
              <input
                type="text"
                value={motherFirst}
                onChange={(e) => setMotherFirst(e.target.value)}
                onBlur={() => { void handleMotherSave('mother_first_name', motherFirst) }}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nom mère</label>
              <input
                type="text"
                value={motherLast}
                onChange={(e) => setMotherLast(e.target.value)}
                onBlur={() => { void handleMotherSave('mother_last_name', motherLast) }}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Portal link */}
      {portalLink && (
        <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-[#1a1918]">Lien portail candidat</h4>
          <p className="text-xs text-zinc-500">Partager ce lien au stagiaire pour qu&apos;il upload ses documents.</p>
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
        </div>
      )}

      {/* Section 3: Agent visa */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-2">
        <h4 className="text-sm font-semibold text-[#1a1918]">Agent visa</h4>
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
          <p className="text-xs text-zinc-400">Agent par défaut : <strong className="text-[#1a1918]">FAZZA</strong></p>
        )}
      </div>

      {/* Section 4: Note pour agent */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-[#1a1918]">Note pour l&apos;agent</h4>
        <textarea
          value={noteForAgent}
          onChange={(e) => setNoteForAgent(e.target.value)}
          onBlur={() => { void handleNoteSave() }}
          placeholder="Instructions spéciales, remarques pour l'agent FAZZA…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        />
        {savingNote && <p className="text-xs text-zinc-400">Sauvegarde…</p>}
      </div>

      {/* Section 5: Virement FAZZA */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-[#1a1918]">Virement FAZZA</h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={fazzaSent}
            onChange={(e) => {
              setFazzaSent(e.target.checked)
              void handleFazzaPatch({ fazza_transfer_sent: e.target.checked })
            }}
            className="w-4 h-4 rounded accent-[#c8a96e]"
          />
          <span className="text-sm text-[#1a1918]">Virement envoyé</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Montant (IDR)</label>
            <input
              type="number"
              value={fazzaAmount || ''}
              onChange={(e) => setFazzaAmount(parseFloat(e.target.value) || 0)}
              onBlur={() => { void handleFazzaPatch({ fazza_transfer_amount_idr: fazzaAmount || null }) }}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Date virement</label>
            <input
              type="date"
              value={fazzaDate}
              onChange={(e) => setFazzaDate(e.target.value)}
              onBlur={() => { void handleFazzaPatch({ fazza_transfer_date: fazzaDate || null }) }}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>
        </div>
      </div>

      {/* Section 6: Envoyer à FAZZA */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-[#1a1918]">Transmission à FAZZA</h4>
        {!canSendToAgent && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-[#d97706] text-xs flex-shrink-0 mt-0.5">⚠</span>
            <p className="text-xs text-amber-900">
              Requis avant envoi :
              {!caseData.billet_avion && <span className="font-medium"> billet avion</span>}
              {!caseData.billet_avion && !caseData.papiers_visas && ' +'}
              {!caseData.papiers_visas && <span className="font-medium"> papiers visa</span>}
            </p>
          </div>
        )}
        {sentToAgent ? (
          <div className="flex items-center gap-2 text-sm text-[#0d9e75] font-medium">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Dossier envoyé à FAZZA
            {caseData.visa_submitted_to_agent_at && (
              <span className="text-zinc-400 font-normal text-xs">
                le {new Date(caseData.visa_submitted_to_agent_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={() => { void handleSendToAgent() }}
            disabled={!canSendToAgent || sendingToAgent}
            className={[
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
              canSendToAgent
                ? 'bg-[#c8a96e] hover:bg-[#b8945a] text-white'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
            ].join(' ')}
          >
            {sendingToAgent ? 'Envoi en cours…' : 'Envoyer à FAZZA'}
          </button>
        )}
      </div>
    </div>
  )
}
