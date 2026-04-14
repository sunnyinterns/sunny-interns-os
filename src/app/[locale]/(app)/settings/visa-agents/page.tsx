'use client'

import { useEffect, useState } from 'react'

interface VisaAgent {
  id: string
  company_name: string | null
  name: string | null
  email: string | null
  contact_emails: string[] | null
  address: string | null
  city: string | null
  country: string | null
  registration_number: string | null
  tax_number: string | null
  website: string | null
  portal_token: string | null
  is_active: boolean
  is_default: boolean
  notes: string | null
}

const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

type Form = {
  company_name: string
  address: string
  city: string
  country: string
  registration_number: string
  tax_number: string
  website: string
  contact_emails: string[]
  notes: string
  is_active: boolean
  is_default: boolean
}

const emptyForm: Form = {
  company_name: '',
  address: '',
  city: '',
  country: 'Indonesia',
  registration_number: '',
  tax_number: '',
  website: '',
  contact_emails: [''],
  notes: '',
  is_active: true,
  is_default: false,
}

export default function VisaAgentsSettingsPage() {
  const [agents, setAgents] = useState<VisaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<VisaAgent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/settings/visa-agents')
    setAgents(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(a: VisaAgent) {
    setEditing(a)
    setForm({
      company_name: a.company_name ?? a.name ?? '',
      address: a.address ?? '',
      city: a.city ?? '',
      country: a.country ?? 'Indonesia',
      registration_number: a.registration_number ?? '',
      tax_number: a.tax_number ?? '',
      website: a.website ?? '',
      contact_emails: (a.contact_emails && a.contact_emails.length > 0) ? a.contact_emails : (a.email ? [a.email] : ['']),
      notes: a.notes ?? '',
      is_active: a.is_active,
      is_default: a.is_default ?? false,
    })
    setShowModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet agent visa ?')) return
    await fetch(`/api/settings/visa-agents/${id}`, { method: 'DELETE' })
    void load()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const contact_emails = form.contact_emails.map(s => s.trim()).filter(Boolean)
    const body = {
      company_name: form.company_name.trim(),
      name: form.company_name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      registration_number: form.registration_number.trim() || null,
      tax_number: form.tax_number.trim() || null,
      website: form.website.trim() || null,
      contact_emails,
      email: contact_emails[0] ?? null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      is_default: form.is_default,
    }
    const url = editing ? `/api/settings/visa-agents/${editing.id}` : '/api/settings/visa-agents'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setShowModal(false)
    void load()
  }

  function updateEmail(i: number, val: string) {
    setForm(p => ({ ...p, contact_emails: p.contact_emails.map((e, idx) => idx === i ? val : e) }))
  }
  function addEmail() {
    setForm(p => ({ ...p, contact_emails: [...p.contact_emails, ''] }))
  }
  function removeEmail(i: number) {
    setForm(p => ({ ...p, contact_emails: p.contact_emails.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Agents Visa</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{agents.length} agent{agents.length !== 1 ? 's' : ''} partenaire{agents.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a]">
            + Nouvel agent
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>Aucun agent visa configuré.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => {
              const emails = agent.contact_emails && agent.contact_emails.length > 0 ? agent.contact_emails : (agent.email ? [agent.email] : [])
              return (
                <div key={agent.id} className="bg-white border border-zinc-100 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a1918]">{agent.company_name ?? agent.name}</p>
                        {agent.is_default && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#c8a96e]/15 text-[#c8a96e]">Par défaut</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agent.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        {agent.address && <p>{agent.address}{agent.city ? `, ${agent.city}` : ''}{agent.country ? `, ${agent.country}` : ''}</p>}
                        {emails.length > 0 && <p>📧 {emails.join(', ')}</p>}
                        {agent.website && <p>🌐 {agent.website}</p>}
                        {(agent.registration_number || agent.tax_number) && (
                          <p className="font-mono text-[10px] text-zinc-400">
                            {agent.registration_number && `Reg: ${agent.registration_number}`}
                            {agent.registration_number && agent.tax_number && ' · '}
                            {agent.tax_number && `NPWP: ${agent.tax_number}`}
                          </p>
                        )}
                      </div>
                      {agent.notes && <p className="text-xs text-zinc-400 mt-2 italic">{agent.notes}</p>}
                      {agent.portal_token && (
                        <div className="mt-3 bg-zinc-50 rounded-lg p-2.5">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Lien portail agent (unique)</p>
                          <p className="font-mono text-[11px] text-zinc-600 break-all">/portal/agent/{agent.portal_token}</p>
                          <a href={`/portal/agent/${agent.portal_token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">Prévisualiser →</a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(agent)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Modifier</button>
                      <button onClick={() => handleDelete(agent.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">Supprimer</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editing ? 'Modifier agent' : 'Nouvel agent visa'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-3 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la société *</label>
                  <input required className={inputCls} placeholder="Ex: FAZZA Visa Bali" value={form.company_name} onChange={e => setForm(p => ({...p, company_name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse</label>
                  <input className={inputCls} value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                    <input className={inputCls} value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Pays</label>
                    <input className={inputCls} value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">N° d'enregistrement</label>
                    <input className={inputCls} value={form.registration_number} onChange={e => setForm(p => ({...p, registration_number: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">N° fiscal / NPWP</label>
                    <input className={inputCls} value={form.tax_number} onChange={e => setForm(p => ({...p, tax_number: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                  <input className={inputCls} value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Emails de contact (dossiers visa envoyés ici)</label>
                  {form.contact_emails.map((email, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="email" className={inputCls} value={email} onChange={e => updateEmail(i, e.target.value)} placeholder="contact@agent-visa.com" />
                      {form.contact_emails.length > 1 && (
                        <button type="button" onClick={() => removeEmail(i)} className="text-red-400 px-2">×</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addEmail} className="text-xs text-[#c8a96e] hover:underline">+ Ajouter un email</button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Notes internes</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-600">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} />
                    Actif
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-600">
                    <input type="checkbox" checked={form.is_default} onChange={e => setForm(p => ({...p, is_default: e.target.checked}))} />
                    Agent par défaut
                  </label>
                </div>
                {editing?.portal_token && (
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-zinc-400">Lien portail agent (unique, sans login)</p>
                    <p className="font-mono text-xs text-zinc-600 break-all">/portal/agent/{editing.portal_token}</p>
                    <a href={`/portal/agent/${editing.portal_token}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e]">Prévisualiser →</a>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
