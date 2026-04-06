'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface EmailTemplate {
  id: string
  name: string
  category?: string | null
  subject: string
  body_html: string
  version?: number | null
  updated_at?: string | null
}

const EXAMPLE_VARIABLES: Record<string, string> = {
  first_name: 'Marie',
  last_name: 'Dupont',
  email: 'marie.dupont@gmail.com',
  arrival_date: '15 juillet 2026',
  flight_number: 'QR957',
  job_title: 'Assistante Marketing',
  company_name: 'Digital Agency Bali',
  duration_weeks: '12',
  dropoff_address: 'Villa Sunset, Seminyak',
  payment_amount: '2 890 €',
  payment_link: 'https://pay.sunnyinterns.com/xxx',
}

function substituteVariables(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => EXAMPLE_VARIABLES[key] ?? `{${key}}`)
}

function categoryLabel(cat: string | null | undefined): string {
  if (!cat) return '—'
  const map: Record<string, string> = {
    onboarding: 'Onboarding',
    billing: 'Facturation',
    arrival: 'Arrivée',
    visa: 'Visa',
    general: 'Général',
  }
  return map[cat] ?? cat
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-templates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as EmailTemplate[]
      setTemplates(data)
      if (data.length > 0 && !selected) {
        setSelected(data[0])
        setEditSubject(data[0].subject)
        setEditBody(data[0].body_html)
      }
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => {
    void fetchTemplates()
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectTemplate(tpl: EmailTemplate) {
    setSelected(tpl)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body_html)
    setShowPreview(false)
    setSavedMsg(null)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch(`/api/email-templates/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body_html: editBody }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json() as EmailTemplate
      setTemplates((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setSelected(updated)
      setSavedMsg('Sauvegardé !')
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const previewSubject = substituteVariables(editSubject)
  const previewBody = substituteVariables(editBody)

  return (
    <div className="flex h-full">
      {/* Left panel — template list */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-100 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-100">
          <h1 className="text-sm font-semibold text-[#1a1918]">Templates email</h1>
        </div>
        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-100 rounded-lg" />)}
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                  selected?.id === tpl.id
                    ? 'bg-amber-50 border border-amber-200'
                    : 'hover:bg-zinc-50',
                ].join(' ')}
              >
                <p className="text-sm font-medium text-[#1a1918] truncate">{tpl.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{categoryLabel(tpl.category)}</p>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Right panel — editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Sélectionner un template
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#1a1918]">{selected.name}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {categoryLabel(selected.category)}
                  {selected.version != null ? ` · v${selected.version}` : ''}
                  {selected.updated_at
                    ? ` · Modifié le ${new Date(selected.updated_at).toLocaleDateString('fr-FR')}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savedMsg && (
                  <span className="text-xs text-[#0d9e75]">{savedMsg}</span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'Éditeur' : 'Aperçu'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { void handleSave() }}
                  disabled={saving}
                >
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Editor fields */}
              {!showPreview ? (
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Objet</label>
                    <input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Corps HTML</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={20}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="max-w-2xl mx-auto bg-white rounded-xl border border-zinc-100 overflow-hidden">
                    <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                      <p className="text-xs text-zinc-500">Objet :</p>
                      <p className="text-sm font-medium text-[#1a1918]">{previewSubject}</p>
                    </div>
                    <div
                      className="p-5 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewBody }}
                    />
                  </div>
                </div>
              )}

              {/* Variables sidebar */}
              <div className="w-56 flex-shrink-0 border-l border-zinc-100 bg-zinc-50 p-4 overflow-y-auto">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Variables</p>
                <div className="space-y-2">
                  {Object.entries(EXAMPLE_VARIABLES).map(([key, example]) => (
                    <div key={key}>
                      <code className="text-xs text-[#c8a96e] font-mono">{`{${key}}`}</code>
                      <p className="text-xs text-zinc-400 mt-0.5">{example}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
