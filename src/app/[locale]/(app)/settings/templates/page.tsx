'use client'

import { useEffect, useState } from 'react'
import { Toast } from '@/components/ui/Toast'

interface Template {
  id: string
  name: string
  type: string
  language: string
  html_content: string | null
  docx_url: string | null
  variables_detected: string[]
  version: number
  is_active: boolean
  updated_at: string
}

const TYPE_LABELS: Record<string, string> = {
  facture: 'Facture',
  lettre_engagement: 'Lettre d\'engagement',
  lettre_partenariat: 'Lettre partenariat',
  contrat_sponsor: 'Contrat sponsor',
}

const VAR_GROUPS: Record<string, string[]> = {
  'Intern': ['intern_name', 'intern_email', 'intern_school', 'intern_level', 'intern_nationality', 'intern_address', 'intern_signing_city', 'intern_birth_date'],
  'Case/Job': ['job_title', 'company_name', 'start_date', 'end_date', 'duration_months'],
  'Financier': ['amount', 'amount_ht', 'tva', 'invoice_number', 'invoice_date', 'package_name'],
  'Entité': ['entity_name', 'entity_address', 'entity_iban', 'entity_bic', 'entity_registration'],
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Template | null>(null)
  const [htmlDraft, setHtmlDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => { void loadTemplates() }, [])

  async function loadTemplates() {
    const res = await fetch('/api/templates')
    if (res.ok) setTemplates(await res.json() as Template[])
    setLoading(false)
  }

  function startEdit(t: Template) {
    setEditing(t)
    setHtmlDraft(t.html_content ?? '')
  }

  async function saveHtml() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/templates/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html_content: htmlDraft }),
    })
    if (res.ok) {
      setToast({ message: 'Template sauvegardé', type: 'success' })
      setEditing(null)
      await loadTemplates()
    } else {
      setToast({ message: 'Erreur sauvegarde', type: 'error' })
    }
    setSaving(false)
  }

  async function uploadDocx(templateId: string, file: File) {
    setUploading(templateId)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/templates/${templateId}`, {
      method: 'PATCH',
      body: formData,
    })
    if (res.ok) {
      setToast({ message: 'Document uploadé et converti', type: 'success' })
      await loadTemplates()
    } else {
      setToast({ message: 'Erreur upload', type: 'error' })
    }
    setUploading(null)
  }

  async function testGenerate(templateId: string) {
    const res = await fetch(`/api/templates/${templateId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preview: true }),
    })
    if (res.ok) {
      const html = await res.text()
      const win = window.open('', '_blank')
      win?.document.write(html)
    }
  }

  if (editing) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button onClick={() => setEditing(null)} className="text-sm text-[#c8a96e] mb-2 block">
              ← Retour aux templates
            </button>
            <h1 className="text-xl font-semibold text-[#1a1918]">{editing.name}</h1>
          </div>
          <button
            onClick={() => { void saveHtml() }}
            disabled={saving}
            className="px-4 py-2 bg-[#c8a96e] text-white rounded-lg text-sm font-semibold hover:bg-[#b89a5e] disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>

        {/* Variables disponibles */}
        <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
          <p className="text-xs font-semibold text-zinc-500 mb-2">VARIABLES DISPONIBLES</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(VAR_GROUPS).map(([group, vars]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-[#1a1918] mb-1">{group}</p>
                {vars.map(v => (
                  <code key={v} className="block text-[10px] text-zinc-500 font-mono">{`{{${v}}}`}</code>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2">HTML</p>
            <textarea
              value={htmlDraft}
              onChange={e => setHtmlDraft(e.target.value)}
              className="w-full h-[500px] p-3 text-xs font-mono border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
              spellCheck={false}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2">PREVIEW</p>
            <iframe
              srcDoc={htmlDraft}
              className="w-full h-[500px] border border-zinc-200 rounded-lg bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Templates contrats</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Factures, lettres d&apos;engagement, partenariats</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1a1918]">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                      {TYPE_LABELS[t.type] || t.type}
                    </span>
                    <span className="text-xs text-zinc-400">v{t.version} · {t.language.toUpperCase()}</span>
                    <span className="text-xs text-zinc-400">
                      Modifié {new Date(t.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {t.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {t.variables_detected.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-400 mb-1">Variables ({t.variables_detected.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {t.variables_detected.slice(0, 8).map(v => (
                      <code key={v} className="text-[10px] px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-600 font-mono">
                        {`{{${v}}}`}
                      </code>
                    ))}
                    {t.variables_detected.length > 8 && (
                      <span className="text-[10px] text-zinc-400">+{t.variables_detected.length - 8}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { void testGenerate(t.id) }}
                  className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600"
                >
                  Tester
                </button>
                <button
                  onClick={() => startEdit(t)}
                  className="px-3 py-1.5 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b89a5e]"
                >
                  Modifier
                </button>
                <label className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600 cursor-pointer">
                  {uploading === t.id ? 'Upload…' : 'Upload .docx'}
                  <input
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) void uploadDocx(t.id, file)
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
