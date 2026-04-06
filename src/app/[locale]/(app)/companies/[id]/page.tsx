'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Contact {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
}

interface Job {
  id: string
  title: string
  status: string
}

interface Intern {
  first_name: string
  last_name: string
}

interface Case {
  id: string
  status: string
  interns?: Intern
}

interface Company {
  id: string
  name: string
  destination?: string | null
  sector?: string | null
  department?: string | null
  website?: string | null
  contacts?: Contact[]
  jobs?: Job[]
  cases?: Case[]
}

type Tab = 'contacts' | 'jobs' | 'stagiaires'

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [editing, setEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editDest, setEditDest] = useState('')
  const [editSector, setEditSector] = useState('')
  const [editWebsite, setEditWebsite] = useState('')

  // New contact form
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [addingContact, setAddingContact] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}`)
      if (res.ok) {
        const data = await res.json() as Company
        setCompany(data)
        setEditName(data.name)
        setEditDest(data.destination ?? 'bali')
        setEditSector(data.sector ?? '')
        setEditWebsite(data.website ?? '')
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { void load() }, [load])

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, destination: editDest, sector: editSector, website: editWebsite }),
      })
      setEditing(false)
      void load()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactName.trim()) return
    setAddingContact(true)
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, name: contactName, email: contactEmail, phone: contactPhone, role: contactRole }),
      })
      setShowContactForm(false)
      setContactName('')
      setContactEmail('')
      setContactPhone('')
      setContactRole('')
      void load()
    } catch {
      // ignore
    } finally {
      setAddingContact(false)
    }
  }

  async function handleDelete() {
    setDeleteError(null)
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' })
      if (res.status === 409) {
        setDeleteError('HAS_ACTIVE_JOBS')
        return
      }
      if (res.ok) {
        router.push('/fr/companies')
      }
    } catch {
      // ignore
    }
  }

  async function handleDeactivate() {
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      setShowDeleteModal(false)
      void load()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Entreprise introuvable.</p>
        <button onClick={() => router.push('/fr/companies')} className="mt-2 text-sm text-[#c8a96e] underline">
          Retour
        </button>
      </div>
    )
  }

  const destinationLabel = company.destination === 'bali' ? 'Bali' : company.destination === 'bangkok' ? 'Bangkok' : company.destination ?? '—'
  const destinationColor = company.destination === 'bali' ? 'bg-blue-100 text-blue-700' : company.destination === 'bangkok' ? 'bg-purple-100 text-purple-700' : 'bg-zinc-100 text-zinc-600'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'contacts', label: `Contacts (${company.contacts?.length ?? 0})` },
    { key: 'jobs', label: `Jobs liés (${company.jobs?.length ?? 0})` },
    { key: 'stagiaires', label: `Stagiaires (${company.cases?.length ?? 0})` },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => router.push('/fr/companies')} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 mb-5 transition-colors">
        ← Retour aux entreprises
      </button>

      {/* Header */}
      {editing ? (
        <form onSubmit={handleSaveEdit} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[#1a1918] mb-4">Modifier l'entreprise</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Destination</label>
              <select value={editDest} onChange={(e) => setEditDest(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]">
                <option value="bali">Bali</option>
                <option value="bangkok">Bangkok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Secteur</label>
              <input type="text" value={editSector} onChange={(e) => setEditSector(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
              <input type="url" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 bg-zinc-100 text-[#1a1918] text-sm font-medium rounded-lg">
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[#1a1918]">{company.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${destinationColor}`}>{destinationLabel}</span>
              </div>
              {company.sector && <p className="text-sm text-zinc-500">{company.sector}</p>}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c8a96e] hover:underline mt-1 inline-block">
                  {company.website}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
                Modifier
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 text-sm text-[#dc2626] bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-100 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
              activeTab === tab.key ? 'text-[#c8a96e] border-b-2 border-[#c8a96e]' : 'text-zinc-500 hover:text-[#1a1918]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'contacts' && (
        <div className="space-y-3">
          {company.contacts?.map((contact) => (
            <div key={contact.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c8a96e] text-xs font-semibold">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1918]">{contact.name}</p>
                {contact.role && <p className="text-xs text-zinc-500">{contact.role}</p>}
              </div>
              <div className="text-right text-xs text-zinc-500 space-y-0.5">
                {contact.email && <p>{contact.email}</p>}
                {contact.phone && <p>{contact.phone}</p>}
              </div>
            </div>
          ))}

          {showContactForm ? (
            <form onSubmit={handleAddContact} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Rôle</label>
                  <input type="text" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Ex: DRH, Manager…" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addingContact} className="px-3 py-1.5 bg-[#c8a96e] text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addingContact ? 'Ajout…' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => setShowContactForm(false)} className="px-3 py-1.5 bg-zinc-100 text-[#1a1918] text-sm font-medium rounded-lg">
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowContactForm(true)}
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors"
            >
              + Ajouter un contact
            </button>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-2">
          {company.jobs?.length === 0 && (
            <p className="text-sm text-zinc-400 py-4 text-center">Aucune offre liée à cette entreprise.</p>
          )}
          {company.jobs?.map((job) => (
            <div key={job.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1a1918]">{job.title}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                {job.status === 'open' ? 'Ouverte' : job.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stagiaires' && (
        <div className="space-y-2">
          {company.cases?.length === 0 && (
            <p className="text-sm text-zinc-400 py-4 text-center">Aucun stagiaire pour cette entreprise.</p>
          )}
          {company.cases?.map((c) => (
            <div key={c.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1a1918]">
                {c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : 'Stagiaire inconnu'}
              </p>
              <span className="text-xs text-zinc-500">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            {deleteError === 'HAS_ACTIVE_JOBS' ? (
              <>
                <h2 className="text-lg font-bold text-[#1a1918] mb-2">Offres actives détectées</h2>
                <p className="text-sm text-zinc-600 mb-5">
                  Cette entreprise a des offres actives. Désactiver plutôt que supprimer ?
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDeactivate} className="px-4 py-2 bg-[#d97706] text-white text-sm font-medium rounded-lg hover:bg-[#c96706] transition-colors">
                    Désactiver
                  </button>
                  <button onClick={() => { setShowDeleteModal(false); setDeleteError(null) }} className="px-4 py-2 bg-zinc-100 text-[#1a1918] text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-[#1a1918] mb-2">Supprimer cette entreprise ?</h2>
                <p className="text-sm text-zinc-600 mb-5">
                  Cette action est irréversible. Toutes les données liées seront supprimées.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} className="px-4 py-2 bg-[#dc2626] text-white text-sm font-medium rounded-lg hover:bg-[#b91c1c] transition-colors">
                    Supprimer définitivement
                  </button>
                  <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-zinc-100 text-[#1a1918] text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors">
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
