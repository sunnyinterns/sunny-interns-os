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
    interns?: {
      passport_page4_url?: string | null
      photo_id_url?: string | null
      bank_statement_url?: string | null
      return_plane_ticket_url?: string | null
      [key: string]: unknown
    } | null
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
  const [copied, setCopied] = useState(false)
  const [loadingPkgs, setLoadingPkgs] = useState(true)

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

  const portalLink = caseData.portal_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${caseData.portal_token}/visa`
    : null

  function copyPortalLink() {
    if (!portalLink) return
    void navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      {/* Package */}
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
            {selectedPkg.visa_types && (
              <span>Visa : <strong className="text-[#1a1918]">{selectedPkg.visa_types.name}</strong></span>
            )}
            {selectedPkg.visa_agents && (
              <span>Agent : <strong className="text-[#1a1918]">{selectedPkg.visa_agents.name}</strong></span>
            )}
            {selectedPkg.validity_label && (
              <span>Validité : <strong className="text-[#1a1918]">{selectedPkg.validity_label}</strong></span>
            )}
            {selectedPkg.visa_cost_idr && (
              <span>Coût IDR : <strong className="text-[#1a1918]">{selectedPkg.visa_cost_idr.toLocaleString()} IDR</strong></span>
            )}
          </div>
        )}
        {!selectedPkg && (
          <p className="text-xs text-zinc-400">Agent par défaut : <strong className="text-[#1a1918]">FAZZA</strong></p>
        )}
      </div>

      {/* Document checklist */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-50 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#1a1918]">Documents requis</h4>
          <span className="text-xs text-zinc-400">{docsReady}/{docsTotal} reçus</span>
        </div>
        {/* Progress */}
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
                  received ? 'bg-[#0d9e75]' : 'bg-zinc-200',
                ].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1918]">{doc.label}</p>
                  <p className="text-xs text-zinc-400">{doc.hint}</p>
                </div>
                {received ? (
                  <a
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#c8a96e] hover:underline flex-shrink-0"
                  >
                    Voir
                  </a>
                ) : (
                  <span className="text-xs text-zinc-300 flex-shrink-0">En attente</span>
                )}
              </div>
            )
          })}
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

      {/* Note pour agent */}
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
    </div>
  )
}
