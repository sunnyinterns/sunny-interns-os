'use client'

import { useEffect, useState } from 'react'

interface VisaField {
  key: string
  label: string
  source: string
  required: boolean
  type: 'text' | 'date' | 'file' | 'select'
  description?: string
}

interface VisaDocument {
  key: string
  label: string
  source: string
  required: boolean
  description?: string
  file_format?: string
}

interface VisaType {
  id: string
  code: string
  name: string
  classification: string | null
  validity_days: number | null
  validity_label: string | null
  timeline_days: number | null
  is_active: boolean
  notes: string | null
  required_fields: VisaField[] | null
  required_documents: VisaDocument[] | null
}

const C22B_DEFAULT_FIELDS: VisaField[] = [
  { key: 'first_name', label: 'Prénom', source: 'intern.first_name', required: true, type: 'text' },
  { key: 'last_name', label: 'Nom', source: 'intern.last_name', required: true, type: 'text' },
  { key: 'birth_date', label: 'Date de naissance', source: 'intern.birth_date', required: true, type: 'date' },
  { key: 'nationalities', label: 'Nationalité(s)', source: 'intern.nationalities', required: true, type: 'text' },
  { key: 'passport_number', label: 'Numéro de passeport', source: 'intern.passport_number', required: true, type: 'text' },
  { key: 'passport_expiry', label: 'Expiration passeport', source: 'intern.passport_expiry', required: true, type: 'date' },
  { key: 'mother_first_name', label: 'Prénom de la mère', source: 'intern.mother_first_name', required: true, type: 'text' },
  { key: 'mother_last_name', label: 'Nom de la mère', source: 'intern.mother_last_name', required: true, type: 'text' },
  { key: 'school_name', label: 'Établissement scolaire', source: 'intern.school_name', required: true, type: 'text' },
  { key: 'desired_start_date', label: "Date d'arrivée prévue", source: 'intern.desired_start_date', required: true, type: 'date' },
  { key: 'desired_end_date', label: 'Date de fin de stage', source: 'intern.desired_end_date', required: true, type: 'date' },
  { key: 'company_name', label: "Entreprise d'accueil", source: 'case.company_name', required: true, type: 'text' },
  { key: 'internship_city', label: 'Ville du stage', source: 'case.internship_city', required: true, type: 'text' },
]

const C22B_DEFAULT_DOCS: VisaDocument[] = [
  { key: 'passport_page4', label: 'Page identité passeport', source: 'intern.passport_page4_url', required: true, file_format: 'JPG/PNG', description: 'Photo + infos identité' },
  { key: 'photo_id', label: "Photo d'identité récente", source: 'intern.photo_id_url', required: true, file_format: 'JPG/PNG', description: 'Fond blanc, 3 mois max' },
  { key: 'bank_statement', label: 'Relevé bancaire', source: 'intern.bank_statement_url', required: true, file_format: 'PDF', description: '3 derniers mois' },
  { key: 'return_ticket', label: 'Billet retour', source: 'intern.return_plane_ticket_url', required: true, file_format: 'PDF', description: 'Ou réservation confirmée' },
  { key: 'convention', label: 'Convention de stage signée', source: 'case.convention_url', required: true, file_format: 'PDF', description: 'Signée par 3 parties' },
]

const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

const SOURCE_COLLECTION_MAP: Record<string, string> = {
  'intern.first_name': 'apply',
  'intern.last_name': 'apply',
  'intern.email': 'apply',
  'intern.whatsapp': 'apply',
  'intern.birth_date': 'TabProfil',
  'intern.nationalities': 'TabProfil',
  'intern.passport_number': 'TabVisa',
  'intern.passport_expiry': 'TabVisa',
  'intern.passport_page4_url': 'TabVisa',
  'intern.photo_id_url': 'TabVisa',
  'intern.bank_statement_url': 'TabVisa',
  'intern.return_plane_ticket_url': 'TabVisa',
  'intern.mother_first_name': 'TabVisa',
  'intern.mother_last_name': 'TabVisa',
  'intern.school_name': 'apply',
  'intern.desired_start_date': 'apply',
  'intern.desired_end_date': 'apply',
  'case.company_name': 'TabStaffing',
  'case.internship_city': 'TabStaffing',
  'case.convention_url': 'TabFacturation',
}

export default function VisaTypesPage() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<VisaType | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<VisaType>>({})

  async function load() {
    setLoading(true)
    const res = await fetch('/api/visa-types?all=true')
    setVisaTypes(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function toggleActive(vt: VisaType) {
    setVisaTypes(prev => prev.map(v => v.id === vt.id ? { ...v, is_active: !v.is_active } : v))
    await fetch(`/api/visa-types/${vt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !vt.is_active }),
    })
  }

  function openCreate() {
    setEditing(null)
    setForm({
      code: '',
      name: '',
      classification: '',
      validity_days: 0,
      validity_label: '',
      timeline_days: 0,
      is_active: true,
      notes: '',
      required_fields: [],
      required_documents: [],
    })
    setShowModal(true)
  }

  function openEdit(vt: VisaType) {
    setEditing(vt)
    setForm({
      ...vt,
      required_fields: vt.required_fields ?? [],
      required_documents: vt.required_documents ?? [],
    })
    setShowModal(true)
  }

  function seedC22BDefaults() {
    setForm(p => ({ ...p, code: 'C22B', name: 'VITAS Stagiaire', required_fields: C22B_DEFAULT_FIELDS, required_documents: C22B_DEFAULT_DOCS }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = {
      code: form.code,
      name: form.name,
      classification: form.classification ?? null,
      validity_days: form.validity_days ?? null,
      validity_label: form.validity_label ?? null,
      timeline_days: form.timeline_days ?? null,
      is_active: form.is_active ?? true,
      notes: form.notes ?? null,
      required_fields: form.required_fields ?? [],
      required_documents: form.required_documents ?? [],
    }
    const url = editing ? `/api/visa-types/${editing.id}` : '/api/visa-types'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowModal(false)
    void load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce type de visa ?')) return
    await fetch(`/api/visa-types/${id}`, { method: 'DELETE' })
    void load()
  }

  function updateField(i: number, patch: Partial<VisaField>) {
    setForm(p => ({ ...p, required_fields: (p.required_fields ?? []).map((f, idx) => idx === i ? { ...f, ...patch } : f) }))
  }
  function addField() {
    setForm(p => ({ ...p, required_fields: [...(p.required_fields ?? []), { key: '', label: '', source: '', required: true, type: 'text' }] }))
  }
  function removeField(i: number) {
    setForm(p => ({ ...p, required_fields: (p.required_fields ?? []).filter((_, idx) => idx !== i) }))
  }

  function updateDoc(i: number, patch: Partial<VisaDocument>) {
    setForm(p => ({ ...p, required_documents: (p.required_documents ?? []).map((d, idx) => idx === i ? { ...d, ...patch } : d) }))
  }
  function addDoc() {
    setForm(p => ({ ...p, required_documents: [...(p.required_documents ?? []), { key: '', label: '', source: '', required: true }] }))
  }
  function removeDoc(i: number) {
    setForm(p => ({ ...p, required_documents: (p.required_documents ?? []).filter((_, idx) => idx !== i) }))
  }

  // Global aggregation of all fields across all active visa types
  const allFields = visaTypes.flatMap(vt => (vt.required_fields ?? []).map(f => ({ ...f, visa_code: vt.code })))
  const uniqueFieldsBySource = Array.from(new Map(allFields.map(f => [f.source, f])).values())

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Types de visa</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{visaTypes.length} type{visaTypes.length !== 1 ? 's' : ''} configuré{visaTypes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a]">+ Nouveau type</button>
        </div>

        <div className="bg-white border border-zinc-100 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-1">Tableau de bord — champs collectés</h2>
          <p className="text-xs text-zinc-500 mb-4">Vue globale de tous les champs requis par les types de visa, avec leur point de collecte dans l'app.</p>
          {uniqueFieldsBySource.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">Aucun champ configuré. Créez ou éditez un type de visa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                    <th className="py-2 pr-4">Champ</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Collecté lors de</th>
                    <th className="py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueFieldsBySource.map((f, i) => {
                    const collected = SOURCE_COLLECTION_MAP[f.source] ?? 'autre'
                    return (
                      <tr key={i} className="border-b border-zinc-50">
                        <td className="py-2 pr-4 font-medium text-[#1a1918]">{f.label}</td>
                        <td className="py-2 pr-4 font-mono text-[10px] text-zinc-500">{f.source}</td>
                        <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded-full bg-[#c8a96e]/10 text-[#c8a96e] text-[10px]">{collected}</span></td>
                        <td className="py-2 text-zinc-500">{f.type}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {visaTypes.map(vt => {
              const isExpanded = expanded === vt.id
              const fields = vt.required_fields ?? []
              const docs = vt.required_documents ?? []
              return (
                <div key={vt.id} className="bg-white border border-zinc-100 rounded-xl">
                  <div className="p-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#c8a96e] bg-[#c8a96e]/10 px-2 py-0.5 rounded">{vt.code}</span>
                        <p className="text-sm font-semibold text-[#1a1918]">{vt.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${vt.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>{vt.is_active ? 'Actif' : 'Inactif'}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mt-1">
                        {vt.validity_label && <span>Validité: {vt.validity_label}</span>}
                        {vt.timeline_days !== null && <span>Délai: {vt.timeline_days}j</span>}
                        <span>{fields.length} champ{fields.length !== 1 ? 's' : ''}</span>
                        <span>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setExpanded(isExpanded ? null : vt.id)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600">{isExpanded ? 'Réduire' : 'Voir'}</button>
                      <button onClick={() => openEdit(vt)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600">Modifier</button>
                      <button onClick={() => toggleActive(vt)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600">{vt.is_active ? 'Désactiver' : 'Activer'}</button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-zinc-50 pt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Champs requis ({fields.length})</p>
                        <div className="space-y-1">
                          {fields.map((f, i) => (
                            <div key={i} className="text-xs flex items-center gap-2">
                              <span className={f.required ? 'text-[#0d9e75]' : 'text-zinc-400'}>{f.required ? '●' : '○'}</span>
                              <span className="font-medium text-[#1a1918]">{f.label}</span>
                              <span className="font-mono text-[10px] text-zinc-400">{f.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Documents requis ({docs.length})</p>
                        <div className="space-y-1">
                          {docs.map((d, i) => (
                            <div key={i} className="text-xs flex items-center gap-2">
                              <span className={d.required ? 'text-[#0d9e75]' : 'text-zinc-400'}>{d.required ? '●' : '○'}</span>
                              <span className="font-medium text-[#1a1918]">{d.label}</span>
                              {d.file_format && <span className="text-zinc-400">({d.file_format})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? 'Modifier type de visa' : 'Nouveau type de visa'}</h2>
                <div className="flex items-center gap-2">
                  {!editing && <button type="button" onClick={seedC22BDefaults} className="text-xs text-[#c8a96e] hover:underline">Préremplir C22B</button>}
                  <button onClick={() => setShowModal(false)} className="text-zinc-400 text-xl">×</button>
                </div>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Code *</label>
                    <input required className={inputCls} placeholder="C22B" value={form.code ?? ''} onChange={e => setForm(p => ({...p, code: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                    <input required className={inputCls} placeholder="VITAS Stagiaire" value={form.name ?? ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Classification</label>
                    <input className={inputCls} value={form.classification ?? ''} onChange={e => setForm(p => ({...p, classification: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Validité (label)</label>
                    <input className={inputCls} placeholder="12 mois" value={form.validity_label ?? ''} onChange={e => setForm(p => ({...p, validity_label: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Validité (jours)</label>
                    <input type="number" className={inputCls} value={form.validity_days ?? ''} onChange={e => setForm(p => ({...p, validity_days: e.target.value ? Number(e.target.value) : null}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Délai traitement (jours)</label>
                    <input type="number" className={inputCls} value={form.timeline_days ?? ''} onChange={e => setForm(p => ({...p, timeline_days: e.target.value ? Number(e.target.value) : null}))} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                  <textarea className={inputCls} rows={2} value={form.notes ?? ''} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-[#1a1918] uppercase">Champs requis</h3>
                    <button type="button" onClick={addField} className="text-xs text-[#c8a96e]">+ Ajouter champ</button>
                  </div>
                  <div className="space-y-2">
                    {(form.required_fields ?? []).map((f, i) => (
                      <div key={i} className="bg-zinc-50 rounded-lg p-2.5 grid grid-cols-6 gap-2 items-center">
                        <input placeholder="key" className={inputCls + ' col-span-1 text-xs'} value={f.key} onChange={e => updateField(i, { key: e.target.value })} />
                        <input placeholder="Label" className={inputCls + ' col-span-2 text-xs'} value={f.label} onChange={e => updateField(i, { label: e.target.value })} />
                        <input placeholder="source (intern.x)" className={inputCls + ' col-span-2 text-xs font-mono'} value={f.source} onChange={e => updateField(i, { source: e.target.value })} />
                        <div className="flex items-center justify-end gap-1">
                          <select className={inputCls + ' text-xs'} value={f.type} onChange={e => updateField(i, { type: e.target.value as VisaField['type'] })}>
                            <option value="text">text</option>
                            <option value="date">date</option>
                            <option value="file">file</option>
                            <option value="select">select</option>
                          </select>
                          <button type="button" onClick={() => removeField(i)} className="text-red-400 px-1">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-[#1a1918] uppercase">Documents requis</h3>
                    <button type="button" onClick={addDoc} className="text-xs text-[#c8a96e]">+ Ajouter document</button>
                  </div>
                  <div className="space-y-2">
                    {(form.required_documents ?? []).map((d, i) => (
                      <div key={i} className="bg-zinc-50 rounded-lg p-2.5 grid grid-cols-6 gap-2 items-center">
                        <input placeholder="key" className={inputCls + ' col-span-1 text-xs'} value={d.key} onChange={e => updateDoc(i, { key: e.target.value })} />
                        <input placeholder="Label" className={inputCls + ' col-span-2 text-xs'} value={d.label} onChange={e => updateDoc(i, { label: e.target.value })} />
                        <input placeholder="source (intern.x_url)" className={inputCls + ' col-span-2 text-xs font-mono'} value={d.source} onChange={e => updateDoc(i, { source: e.target.value })} />
                        <div className="flex items-center justify-end gap-1">
                          <input placeholder="format" className={inputCls + ' text-xs'} value={d.file_format ?? ''} onChange={e => updateDoc(i, { file_format: e.target.value })} />
                          <button type="button" onClick={() => removeDoc(i)} className="text-red-400 px-1">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} />
                  Actif
                </label>

                <div className="flex justify-between pt-3 border-t border-zinc-100">
                  {editing && <button type="button" onClick={() => handleDelete(editing.id)} className="px-4 py-2 text-sm rounded-lg border border-red-100 text-red-500">Supprimer</button>}
                  <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
