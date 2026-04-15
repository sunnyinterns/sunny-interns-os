'use client'
import { useEffect, useState } from 'react'

interface ContactTemplate {
  id: string; key: string; name: string; description: string | null
  category: string; content_html: string | null; variables: string[] | null
  version: number; updated_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  legal: '⚖️ Documents légaux',
  contract: '📝 Contrats',
}

function getDefaultContent(key: string): string {
  const defaults: Record<string, string> = {
    lettre_engagement_fr: `<h2>Lettre d'Engagement — Bali Interns</h2>
<p>Je soussigné(e), <strong>{{intern_name}}</strong>, m'engage à :</p>
<ul>
  <li>Respecter les règles et valeurs de l'entreprise d'accueil <strong>{{company_name}}</strong> tout au long de mon stage.</li>
  <li>Maintenir un comportement professionnel et respectueux envers mes collègues et responsables.</li>
  <li>Informer Bali Interns de toute difficulté rencontrée dans les plus brefs délais.</li>
  <li>Ne pas annuler mon stage après confirmation du placement, sauf cas de force majeure.</li>
  <li>Respecter les politiques de confidentialité de l'entreprise d'accueil.</li>
</ul>
<p>Stage prévu du <strong>{{start_date}}</strong> au <strong>{{end_date}}</strong> en tant que <strong>{{job_title}}</strong>.</p>
<p>Je comprends que le non-respect de ces engagements peut entraîner la résiliation du contrat de stage.</p>
<p><em>En signant ci-dessous, je confirme avoir lu et accepté les termes de cette lettre d'engagement.</em></p>`,

    lettre_engagement_en: `<h2>Engagement Letter — Bali Interns</h2>
<p>I, <strong>{{intern_name}}</strong>, hereby commit to:</p>
<ul>
  <li>Respect the rules and values of the host company <strong>{{company_name}}</strong> throughout my internship.</li>
  <li>Maintain professional and respectful behavior towards colleagues and supervisors.</li>
  <li>Inform Bali Interns of any difficulties encountered as soon as possible.</li>
  <li>Not cancel my internship after placement confirmation, except in cases of force majeure.</li>
  <li>Respect the confidentiality policies of the host company.</li>
</ul>
<p>Internship scheduled from <strong>{{start_date}}</strong> to <strong>{{end_date}}</strong> as <strong>{{job_title}}</strong>.</p>
<p>I understand that failure to comply with these commitments may result in termination of the internship contract.</p>
<p><em>By signing below, I confirm that I have read and agreed to the terms of this engagement letter.</em></p>`,

    agreement_letter_tripartite: `<h2>Tripartite Agreement Letter</h2>
<p>This agreement is made between:</p>
<ul>
  <li><strong>The Intern:</strong> {{intern_name}}</li>
  <li><strong>The Host Company:</strong> {{employer_name}}, represented by {{employer_signatory}}</li>
  <li><strong>Bali Interns / Sponsor:</strong> {{sponsor_name}}</li>
</ul>
<p>The intern will complete an internship as <strong>{{job_title}}</strong> in {{internship_city}}, Indonesia, from {{start_date}} to {{end_date}}.</p>
<p>All parties agree to the terms and conditions of this placement as facilitated by Bali Interns.</p>`,

    sponsor_contract: `<h2>Sponsor Contract / Contrat Sponsor</h2>
<p>Between:</p>
<ul>
  <li><strong>Employer / Employeur:</strong> {{employer_name}}, represented by {{employer_signatory}}</li>
  <li><strong>Sponsor (PT):</strong> {{sponsor_name}}</li>
</ul>
<p>Regarding the internship of <strong>{{intern_name}}</strong> for a duration of <strong>{{duration_days}} days</strong>, starting <strong>{{start_date}}</strong>.</p>
<p>The sponsor agrees to facilitate the visa process and provide administrative support for this internship placement.</p>`,
  }
  return defaults[key] ?? '<p>Contenu du template à configurer.</p>'
}

export default function ContactTemplatesPage() {
  const [templates, setTemplates] = useState<ContactTemplate[]>([])
  const [selected, setSelected] = useState<ContactTemplate | null>(null)
  const [editContent, setEditContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/contact-templates')
      .then(r => r.ok ? r.json() : [])
      .then((d: ContactTemplate[]) => {
        setTemplates(d)
        if (d.length > 0) doSelectTemplate(d[0])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function doSelectTemplate(t: ContactTemplate) {
    setSelected(t)
    setEditContent(t.content_html ?? getDefaultContent(t.key))
    setPreview(false)
    setSaved(false)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    const r = await fetch(`/api/settings/contact-templates/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_html: editContent }),
    })
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  const categories = [...new Set(templates.map(t => t.category))]

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1918]">Templates documents</h1>
        <p className="text-sm text-zinc-400 mt-1">Lettre d&apos;engagement, Agreement Letter, Contrat Sponsor. Variables disponibles en badges ci-dessous.</p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-3xl mb-3">📄</p>
          <p className="text-sm">Aucun template configuré en base de données.</p>
          <p className="text-xs mt-1">Les templates contact_templates doivent être insérés en DB.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Liste */}
          <div className="col-span-1 space-y-1">
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                  {CATEGORY_LABELS[cat] ?? cat}
                </p>
                {templates.filter(t => t.category === cat).map(t => (
                  <button key={t.id} onClick={() => doSelectTemplate(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selected?.id === t.id ? 'bg-[#c8a96e]/10 text-[#c8a96e] font-semibold' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Éditeur */}
          {selected ? (
            <div className="col-span-2 bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-[#1a1918]">{selected.name}</p>
                  {selected.description && <p className="text-xs text-zinc-400">{selected.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(!preview)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${preview ? 'bg-zinc-100 border-zinc-200' : 'border-zinc-200 text-zinc-600'}`}>
                    {preview ? '✏️ Éditer' : '👁️ Preview'}
                  </button>
                  <button onClick={() => void save()} disabled={saving}
                    className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-lg font-medium disabled:opacity-50">
                    {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
                  </button>
                </div>
              </div>

              {/* Variables */}
              {(selected.variables ?? []).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Variables disponibles</p>
                  <div className="flex flex-wrap gap-1">
                    {(selected.variables ?? []).map(v => (
                      <span key={v} onClick={() => setEditContent(c => c + ` {{${v}}}`)}
                        className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100 font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Cliquer sur une variable pour l&apos;insérer dans le template.</p>
                </div>
              )}

              {/* Éditeur/Preview */}
              {preview ? (
                <div className="border border-zinc-200 rounded-xl p-4 min-h-64 text-sm leading-relaxed prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: editContent.replace(/\{\{(\w+)\}\}/g, (_, v: string) =>
                      `<span style="background:#fef3c7;padding:0 3px;border-radius:3px;font-family:monospace;font-size:11px">{{${v}}}</span>`)
                  }} />
              ) : (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl p-3 text-xs font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  rows={20} />
              )}

              <p className="text-[10px] text-zinc-400 mt-2">
                HTML supporté. Les variables entre {'{{'}{'}}' } seront remplacées automatiquement lors de la génération du document.
              </p>
            </div>
          ) : (
            <div className="col-span-2 flex items-center justify-center text-zinc-400">
              <p className="text-sm">Sélectionnez un template</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
