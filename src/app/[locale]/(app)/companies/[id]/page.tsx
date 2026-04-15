'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'

interface Contact {
  id: string
  left_company?: boolean | null
  left_company_at?: string | null
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  job_title?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  linkedin_url?: string | null
  gender?: string | null
  role?: string | null
}

interface Job {
  id: string
  title: string
  public_title?: string | null
  status: string
  location?: string | null
  created_at?: string | null
  submissions_count?: number
  submissions?: Array<{
    id: string
    status: string
    interns?: { first_name: string; last_name: string } | null
    cases?: { id: string } | null
  }>
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
  industry?: string | null
  department?: string | null
  website?: string | null
  logo_url?: string | null
  company_type?: string | null
  type?: string | null
  description?: string | null
  notes?: string | null
  // localisation
  registration_country?: string | null
  internship_city?: string | null
  city?: string | null
  country?: string | null
  legal_address?: string | null
  google_maps_url?: string | null
  // légal indonésie
  legal_type?: string | null
  nib?: string | null
  npwp?: string | null
  vat_number?: string | null
  registration_number?: string | null
  // légal france / international
  siret?: string | null
  tax_id?: string | null
  state_of_incorporation?: string | null
  // identité
  company_size?: string | null
  // adresse séparée
  address_street?: string | null
  address_postal_code?: string | null
  address_city?: string | null
  // rôles
  is_employer?: boolean | null
  is_partner?: boolean | null
  is_supplier?: boolean | null
  collaboration_status?: string | null
  sponsor_company_id?: string | null
  info_validated_by_contact?: boolean | null
  info_validated_at?: string | null
  info_validated_contact_id?: string | null
  // associations calculées côté API
  stagiaires?: Array<{ id: string; status: string; intern: { first_name: string; last_name: string } | null }>
  partner_timing?: string | null
  partner_category?: string | null
  partner_deal?: string | null
  partner_visible_from?: string | null
  // social
  instagram_url?: string | null
  tiktok_url?: string | null
  linkedin_url?: string | null
  facebook_url?: string | null
  contacts?: Contact[]
  jobs?: Job[]
  cases?: Case[]
}

type Tab = 'contacts' | 'jobs' | 'stagiaires' | 'candidats'

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('contacts')
  const [editing, setEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deactivateContacts, setDeactivateContacts] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editDest, setEditDest] = useState('')
  const [editSector, setEditSector] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editCompanyType, setEditCompanyType] = useState('')
  const [editInternshipCity, setEditInternshipCity] = useState('')
  const [editLegalAddress, setEditLegalAddress] = useState('')
  const [editGoogleMaps, setEditGoogleMaps] = useState('')
  const [editRegCountry, setEditRegCountry] = useState('')
  const [editLegalType, setEditLegalType] = useState('')
  const [editNib, setEditNib] = useState('')
  const [editNpwp, setEditNpwp] = useState('')
  const [editVat, setEditVat] = useState('')
  const [editRegNumber, setEditRegNumber] = useState('')
  const [editSiret, setEditSiret] = useState('')
  const [editTaxId, setEditTaxId] = useState('')
  const [editStateInc, setEditStateInc] = useState('')
  const [editInstagram, setEditInstagram] = useState('')
  const [editTiktok, setEditTiktok] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editFacebook, setEditFacebook] = useState('')
  const [editNotes, setEditNotes] = useState('')
  // États manquants
  const [editDescription, setEditDescription] = useState('')
  const [editSize, setEditSize] = useState('')
  const [editIsEmployer, setEditIsEmployer] = useState(false)
  const [editIsPartner, setEditIsPartner] = useState(false)
  const [editIsSupplier, setEditIsSupplier] = useState(false)
  const [editAddressStreet, setEditAddressStreet] = useState('')
  const [editAddressPostal, setEditAddressPostal] = useState('')
  const [editAddressCity, setEditAddressCity] = useState('')
  const [editSponsorId, setEditSponsorId] = useState('')
  const [editPartnerTiming, setEditPartnerTiming] = useState('both')
  const [editPartnerCategory, setEditPartnerCategory] = useState('')
  const [editPartnerDeal, setEditPartnerDeal] = useState('')
  const [editPartnerVisible, setEditPartnerVisible] = useState('payment')
  const [cities, setCities] = useState<{id:string;name:string;area:string}[]>([])
  const [companyTypes, setCompanyTypes] = useState<{id:string;code:string;name:string;country:string}[]>([])

  useEffect(() => {
    fetch('/api/internship-cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : [])).catch(() => null)
    fetch('/api/company-types').then(r => r.json()).then(d => setCompanyTypes(Array.isArray(d) ? d : [])).catch(() => null)
  }, [])

  // New contact form
  const [showContactForm, setShowContactForm] = useState(false)
  const [sendingForm, setSendingForm] = useState<string | null>(null)
  const [sentForms, setSentForms] = useState<Set<string>>(new Set())
  const [showLinkContact, setShowLinkContact] = useState(false)
  const [allContacts, setAllContacts] = useState<Array<{id:string;first_name:string|null;last_name:string|null;job_title:string|null;email:string|null;company_id:string|null}>>([])
  const [linkingContact, setLinkingContact] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string|null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactFirstName, setContactFirstName] = useState('')
  const [contactLastName, setContactLastName] = useState('')
  const [contactWhatsApp, setContactWhatsApp] = useState('')
  const [contactLinkedin, setContactLinkedin] = useState('')
  const [contactGender, setContactGender] = useState('')
  const [addingContact, setAddingContact] = useState(false)

  // Charger les contacts disponibles à lier
  const loadAllContacts = async () => {
    const r = await fetch('/api/contacts?unlinked=true')
    if (r.ok) setAllContacts(await r.json())
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}`)
      if (res.ok) {
        const data = await res.json() as Company
        setCompany(data)
        setEditName(data.name)
        setEditDest(data.destination ?? 'bali')
        setEditSector(data.sector ?? data.industry ?? '')
        setEditWebsite(data.website ?? '')
        setEditLogo(data.logo_url ?? '')
        setEditCompanyType(data.company_type ?? data.type ?? '')
        setEditInternshipCity(data.internship_city ?? data.city ?? '')
        setEditLegalAddress(data.legal_address ?? '')
        setEditGoogleMaps(data.google_maps_url ?? '')
        setEditRegCountry(data.registration_country ?? 'ID')
        setEditLegalType(data.legal_type ?? '')
        setEditNib(data.nib ?? '')
        setEditNpwp(data.npwp ?? '')
        setEditVat(data.vat_number ?? '')
        setEditRegNumber(data.registration_number ?? '')
        setEditSiret(data.siret ?? '')
        setEditTaxId(data.tax_id ?? '')
        setEditStateInc(data.state_of_incorporation ?? '')
        setEditInstagram(data.instagram_url ?? '')
        setEditTiktok(data.tiktok_url ?? '')
        setEditLinkedin(data.linkedin_url ?? '')
        setEditFacebook(data.facebook_url ?? '')
        setEditNotes(data.notes ?? '')
        setEditDescription(data.description ?? '')
        setEditSize(data.company_size ?? '')
        setEditIsEmployer(data.is_employer ?? false)
        setEditIsPartner(data.is_partner ?? false)
        setEditIsSupplier(data.is_supplier ?? false)
        setEditAddressStreet(data.address_street ?? '')
        setEditAddressPostal(data.address_postal_code ?? '')
        setEditAddressCity(data.address_city ?? '')
        setEditSponsorId(data.sponsor_company_id ?? '')
        setEditPartnerTiming(data.partner_timing ?? 'both')
        setEditPartnerCategory(data.partner_category ?? '')
        setEditPartnerDeal(data.partner_deal ?? '')
        setEditPartnerVisible(data.partner_visible_from ?? 'payment')
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
        body: JSON.stringify({
          name: editName,
          destination: editDest,
          sector: editSector || null,
          industry: editSector || null,
          website: editWebsite || null,
          logo_url: editLogo || null,
          company_type: editCompanyType || null,
          type: editCompanyType || null,
          internship_city: editInternshipCity || null,
          city: editInternshipCity || null,
          google_maps_url: editGoogleMaps || null,
          registration_country: editRegCountry || null,
          legal_type: editLegalType || null,
          nib: editNib || null,
          npwp: editNpwp || null,
          vat_number: editVat || null,
          registration_number: editRegNumber || null,
          siret: editSiret || null,
          tax_id: editTaxId || null,
          state_of_incorporation: editStateInc || null,
          instagram_url: editInstagram || null,
          tiktok_url: editTiktok || null,
          linkedin_url: editLinkedin || null,
          facebook_url: editFacebook || null,
          notes: editNotes || null,
          description: editDescription || null,
          company_size: editSize || null,
          is_employer: editIsEmployer,
          is_partner: editIsPartner,
          is_supplier: editIsSupplier,
          address_street: editAddressStreet || null,
          address_postal_code: editAddressPostal || null,
          address_city: editAddressCity || null,
          legal_address: [editAddressStreet, editAddressPostal, editAddressCity].filter(Boolean).join(', ') || editLegalAddress || null,
          sponsor_company_id: editSponsorId || null,
          partner_timing: editIsPartner ? (editPartnerTiming || 'both') : null,
          partner_category: editIsPartner ? (editPartnerCategory || null) : null,
          partner_deal: editIsPartner ? (editPartnerDeal || null) : null,
          partner_visible_from: editIsPartner ? (editPartnerVisible || 'payment') : null,
        }),
      })
      setEditing(false)
      void load()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkContact() {
    if (!selectedContactId) return
    setLinkingContact(true)
    await fetch(`/api/contacts/${selectedContactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    })
    setShowLinkContact(false)
    setSelectedContactId(null)
    setLinkingContact(false)
    void load()
  }

  async function sendInfoForm(contactId: string) {
    setSendingForm(contactId)
    const r = await fetch(`/api/companies/${companyId}/send-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId }),
    })
    if (r.ok) setSentForms(prev => new Set([...prev, contactId]))
    else alert('Erreur envoi — vérifiez que le contact a un email')
    setSendingForm(null)
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    const fName = contactFirstName.trim() || contactName.split(' ')[0] || contactName.trim()
    const lName = contactLastName.trim() || contactName.split(' ').slice(1).join(' ') || ''
    if (!fName) return
    setAddingContact(true)
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          first_name: contactFirstName.trim() || contactName.split(' ')[0] || contactName.trim(),
          last_name: contactLastName.trim() || contactName.split(' ').slice(1).join(' ') || null,
          job_title: contactRole || null,
          email: contactEmail || null,
          phone: contactPhone || null,
          whatsapp: contactWhatsApp || null,
          linkedin_url: contactLinkedin || null,
          gender: contactGender || null,
          is_primary: false,
        }),
      })
      setShowContactForm(false)
      setContactName('')
      setContactFirstName('')
      setContactLastName('')
      setContactEmail('')
      setContactPhone('')
      setContactWhatsApp('')
      setContactLinkedin('')
      setContactGender('')
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
        router.push(`/${locale}/companies`)
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
      // Désactiver les contacts liés si l'option est cochée
      if (deactivateContacts && company?.contacts) {
        await Promise.all(company.contacts.map(c =>
          fetch(`/api/contacts/${c.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: null }),
          })
        ))
      }
      setShowDeleteModal(false)
      setDeactivateContacts(false)
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
        <button onClick={() => router.push(`/${locale}/companies`)} className="mt-2 text-sm text-[#c8a96e] underline">
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
    { key: 'stagiaires', label: `Stagiaires (${company.stagiaires?.length ?? 0})` },
    { key: 'candidats', label: `Candidats (${(company.jobs ?? []).reduce((s, j) => s + (j.submissions_count ?? 0), 0)})` },
  ]

  return (
    <div className={`p-6 max-w-4xl mx-auto${company.collaboration_status === "fin_collaboration" ? " opacity-70" : ""}`}>
      {/* Back */}
      <button onClick={() => router.push(`/${locale}/companies`)} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 mb-5 transition-colors">
        ← Retour aux entreprises
      </button>

      {/* Header */}
      {editing ? (
        <form onSubmit={handleSaveEdit} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-5">
          <h2 className="font-semibold text-[#1a1918]">Modifier l&apos;entreprise</h2>

          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">① Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Destination</label>
                <select value={editDest} onChange={(e) => setEditDest(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="bali">Bali</option>
                  <option value="bangkok">Bangkok</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Secteur</label>
                <input type="text" value={editSector} onChange={(e) => setEditSector(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                <input type="url" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Logo URL</label>
                <input type="url" value={editLogo} onChange={(e) => setEditLogo(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Type de société</label>
                <select value={editCompanyType} onChange={(e) => setEditCompanyType(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="">— Type de société —</option>
                  <optgroup label="Indonésie">
                    {companyTypes.filter(t => t.country === 'Indonesia').map(t => <option key={t.id} value={t.code}>{t.name}</option>)}
                  </optgroup>
                  <optgroup label="France">
                    {companyTypes.filter(t => t.country === 'France').map(t => <option key={t.id} value={t.code}>{t.name}</option>)}
                  </optgroup>
                  <optgroup label="International">
                    {companyTypes.filter(t => !['Indonesia','France'].includes(t.country)).map(t => <option key={t.id} value={t.code}>{t.name} ({t.country})</option>)}
                  </optgroup>
                </select>
              </div>
            </div>
            {/* Rôles */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-zinc-600">Rôles</p>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                <input type="checkbox" checked={editIsEmployer} onChange={e => setEditIsEmployer(e.target.checked)} className="rounded" />
                🏢 Employeur — recrute des stagiaires
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                <input type="checkbox" checked={editIsPartner} onChange={e => setEditIsPartner(e.target.checked)} className="rounded" />
                🤝 Partenaire — offre des deals aux étudiants
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                <input type="checkbox" checked={editIsSupplier} onChange={e => setEditIsSupplier(e.target.checked)} className="rounded" />
                📦 Fournisseur — suivi comptabilité interne
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Taille</label>
                <select value={editSize} onChange={e => setEditSize(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="">—</option>
                  <option>1-5</option><option>6-20</option><option>21-50</option><option>51-200</option><option>200+</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="Activité principale…" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">② Localisation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Pays d&apos;immatriculation</label>
                <select value={editRegCountry} onChange={(e) => setEditRegCountry(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="ID">🇮🇩 Indonésie</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="BE">🇧🇪 Belgique</option>
                  <option value="CH">🇨🇭 Suisse</option>
                  <option value="US">🇺🇸 USA</option>
                  <option value="GB">🇬🇧 UK</option>
                  <option value="TH">🇹🇭 Thaïlande</option>
                  <option value="AU">🇦🇺 Australie</option>
                  <option value="SG">🇸🇬 Singapour</option>
                  <option value="OTHER">🌍 Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Ville du stage</label>
                <select value={editInternshipCity} onChange={(e) => setEditInternshipCity(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="">— Sélectionner —</option>
                  {Object.entries(cities.reduce((acc, c) => { (acc[c.area] = acc[c.area] || []).push(c); return acc }, {} as Record<string, typeof cities>)).map(([area, areaCities]) => (
                    <optgroup key={area} label={area}>
                      {areaCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse (rue, numéro)</label>
                <input type="text" value={editAddressStreet} onChange={e => setEditAddressStreet(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="Jl. Raya Canggu No. 12…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Code postal</label>
                <input type="text" value={editAddressPostal} onChange={e => setEditAddressPostal(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                <input type="text" value={editAddressCity} onChange={e => setEditAddressCity(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">Google Maps URL</label>
                <input type="url" value={editGoogleMaps} onChange={(e) => setEditGoogleMaps(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {editRegCountry === 'ID' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">③ Légal (Indonésie)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type légal</label>
                  <input type="text" value={editLegalType} onChange={(e) => setEditLegalType(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="PT PMA, PT Local, CV…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                  <input type="text" value={editNib} onChange={(e) => setEditNib(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP / Tax number</label>
                  <input type="text" value={editNpwp} onChange={(e) => setEditNpwp(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">N° TVA</label>
                  <input type="text" value={editVat} onChange={(e) => setEditVat(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Registration number</label>
                  <input type="text" value={editRegNumber} onChange={(e) => setEditRegNumber(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {editRegCountry === 'FR' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">③ Légal (France)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type (SAS/SARL…)</label>
                  <input type="text" value={editLegalType} onChange={(e) => setEditLegalType(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label>
                  <input type="text" value={editSiret} onChange={(e) => setEditSiret(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">TVA intracommunautaire</label>
                  <input type="text" value={editVat} onChange={(e) => setEditVat(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Tax ID</label>
                  <input type="text" value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {!['ID','FR'].includes(editRegCountry) && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">③ Légal (International)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Type légal</label>
                  <input type="text" value={editLegalType} onChange={(e) => setEditLegalType(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">State of incorporation</label>
                  <input type="text" value={editStateInc} onChange={(e) => setEditStateInc(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Tax ID</label>
                  <input type="text" value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Registration number</label>
                  <input type="text" value={editRegNumber} onChange={(e) => setEditRegNumber(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">④ Réseaux sociaux</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="url" value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="Instagram URL" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              <input type="url" value={editTiktok} onChange={(e) => setEditTiktok(e.target.value)} placeholder="TikTok URL" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              <input type="url" value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="LinkedIn URL" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
              <input type="url" value={editFacebook} onChange={(e) => setEditFacebook(e.target.value)} placeholder="Facebook URL" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
            </div>
          </div>

          {editIsPartner && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑤ Partenariat</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Disponible</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['pre_arrival',"Avant départ"],['on_site',"Sur l'île"],['both',"Les deux"]] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setEditPartnerTiming(val)}
                      className={`py-2 text-xs rounded-lg border transition-colors ${editPartnerTiming === val ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Visible depuis</label>
                <select value={editPartnerVisible} onChange={e => setEditPartnerVisible(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white">
                  <option value="payment">Paiement validé (Welcome Kit)</option>
                  <option value="arrival">Arrivée à Bali (statut Actif)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                <input value={editPartnerCategory} onChange={e => setEditPartnerCategory(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="eSIM, Assurance, VPN, Restaurant…" list="edit-partner-cats" />
                <datalist id="edit-partner-cats">
                  {['eSIM','Assurance','VPN','Transport','Restaurant','Sport & Wellness','Coworking','Shopping','Banque','Services'].map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Offre / Deal <span className="text-amber-600 text-[10px]">🇬🇧 EN</span></label>
                <textarea value={editPartnerDeal} onChange={e => setEditPartnerDeal(e.target.value)} rows={2} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="Ex: 15% off with code BALIINTERNS…" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑥ Notes internes</p>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" placeholder="Notes internes non visibles publiquement…" />
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
        <div className="bg-white border border-zinc-100 rounded-xl p-5 mb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[#1a1918]">{company.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${destinationColor}`}>{destinationLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {company.is_employer && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">🏢 Employeur</span>}
                {company.is_partner && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">🤝 Partenaire</span>}
                {company.is_supplier && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">📦 Fournisseur</span>}
              </div>
                            {/* Statut collaboration */}
              {company.collaboration_status === 'fin_collaboration' && (
                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 mt-1">
                  🚫 Fin de collaboration
                </span>
              )}
              {company.sector && <p className="text-sm text-zinc-500 mt-1">{company.sector}</p>}
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
              {company.collaboration_status !== 'fin_collaboration' ? (
                <button
                  onClick={() => void fetch(`/api/companies/${companyId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ collaboration_status: 'fin_collaboration' }) }).then(() => void load())}
                  className="px-3 py-1.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                  title="Marquer cette entreprise comme fin de collaboration"
                >
                  🚫 Fin de collab
                </button>
              ) : (
                <button
                  onClick={() => void fetch(`/api/companies/${companyId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ collaboration_status: 'active' }) }).then(() => void load())}
                  className="px-3 py-1.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  ✓ Réactiver
                </button>
              )}
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
            <Link key={contact.id} href={`/${locale}/contacts/${contact.id}`} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-4 transition-all block ${contact.left_company ? "border-zinc-100 opacity-50" : "border-zinc-100 hover:border-[#c8a96e] hover:shadow-sm"}`}>
              <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c8a96e] text-xs font-semibold">
                  {((contact.first_name ?? contact.name ?? '?')[0] ?? '?').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1918]">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name || 'Contact'}</p>
                {contact.job_title && <p className="text-xs text-zinc-500">{contact.job_title}</p>}
              </div>
              <div className="text-right text-xs text-zinc-500 space-y-0.5">
                {contact.email && <p>{contact.email}</p>}
                {contact.whatsapp && <p>{contact.whatsapp}</p>}
              </div>
              <button
                type="button"
                disabled={!contact.email || sendingForm === contact.id}
                onClick={e => { e.preventDefault(); void sendInfoForm(contact.id) }}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-colors flex-shrink-0 ${
                  company.info_validated_by_contact && company.info_validated_contact_id === contact.id
                    ? 'bg-green-50 text-[#0d9e75] border-green-200'
                    : sentForms.has(contact.id)
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : contact.email
                    ? 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                    : 'bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed'
                }`}>
                {company.info_validated_by_contact && company.info_validated_contact_id === contact.id
                  ? '✅ Validé'
                  : sentForms.has(contact.id)
                  ? '📨 Envoyé'
                  : sendingForm === contact.id
                  ? '…'
                  : contact.email
                  ? '📧 Formulaire'
                  : 'Email requis'}
              </button>
              <span className="text-zinc-300 ml-1">→</span>
            </Link>
          ))}

          {showContactForm ? (
            <form onSubmit={handleAddContact} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Prénom *</label>
                  <input type="text" value={contactFirstName} onChange={e => setContactFirstName(e.target.value)} required placeholder="Jean" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                  <input type="text" value={contactLastName} onChange={e => setContactLastName(e.target.value)} placeholder="Dupont" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Poste / Rôle</label>
                  <input type="text" value={contactRole} onChange={e => setContactRole(e.target.value)} placeholder="Ex: DRH, Manager, CEO…" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Genre</label>
                  <select value={contactGender} onChange={e => setContactGender(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]">
                    <option value="">— Non précisé —</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                  <input type="tel" value={contactWhatsApp} onChange={e => setContactWhatsApp(e.target.value)} placeholder="+62…" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone fixe</label>
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">LinkedIn</label>
                  <input type="url" value={contactLinkedin} onChange={e => setContactLinkedin(e.target.value)} placeholder="linkedin.com/in/…" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
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
            <div className="space-y-2">
              {/* Lier un contact existant */}
              {showLinkContact ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lier un contact existant</p>
                  <SearchableSelect
                    items={allContacts.map((c): SearchableSelectItem => ({
                      id: c.id,
                      label: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Sans nom',
                      sublabel: c.job_title ?? c.email ?? undefined,
                      avatar: (c.first_name?.[0] ?? '?').toUpperCase(),
                      avatarColor: '#f0ebe2',
                    }))}
                    value={selectedContactId}
                    onChange={item => setSelectedContactId(item?.id ?? null)}
                    placeholder="Rechercher un contact…"
                    searchPlaceholder="Nom, email, poste…"
                    emptyText="Aucun contact disponible"
                  />
                  <div className="flex gap-2">
                    <button type="button" disabled={!selectedContactId || linkingContact}
                      onClick={() => void handleLinkContact()}
                      className="px-3 py-1.5 bg-[#c8a96e] text-white text-sm font-medium rounded-lg disabled:opacity-50">
                      {linkingContact ? 'Liaison…' : 'Lier ce contact'}
                    </button>
                    <button type="button" onClick={() => { setShowLinkContact(false); setSelectedContactId(null) }}
                      className="px-3 py-1.5 bg-zinc-100 text-[#1a1918] text-sm font-medium rounded-lg">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setShowLinkContact(true); void loadAllContacts() }}
                    className="py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors">
                    🔗 Lier un contact existant
                  </button>
                  <button onClick={() => setShowContactForm(true)}
                    className="py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors">
                    + Créer un nouveau contact
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-2">
          {company.jobs?.length === 0 && (
            <p className="text-sm text-zinc-400 py-4 text-center">Aucune offre liée à cette entreprise.</p>
          )}
          {company.jobs?.map((job) => (
            <Link key={job.id} href={`/${locale}/jobs`} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-[#c8a96e] hover:shadow-sm transition-all block">
              <div>
                <p className="text-sm font-medium text-[#1a1918]">{job.public_title ?? job.title ?? 'Offre sans titre'}</p>
                {job.location && <p className="text-xs text-zinc-400">{job.location}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                  {job.status === 'open' ? 'Ouverte' : job.status}
                </span>
                <span className="text-zinc-300">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'stagiaires' && (
        <div className="space-y-2">
          {(!company.stagiaires || company.stagiaires.length === 0) && (
            <p className="text-sm text-zinc-400 py-4 text-center">Aucun stagiaire associé à cette entreprise.</p>
          )}
          {company.stagiaires?.map((s) => (
            <Link key={s.id} href={`/${locale}/cases/${s.id}`}
              className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-[#c8a96e] hover:shadow-sm transition-all block">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-zinc-500">
                    {(s.intern?.first_name?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#1a1918]">
                  {s.intern ? `${s.intern.first_name} ${s.intern.last_name}` : 'Stagiaire inconnu'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{s.status}</span>
                <span className="text-zinc-300">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Delete modal */}
      {activeTab === 'candidats' && (
        <div className="space-y-3">
          {(company.jobs ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Aucune offre liée à cette entreprise.</p>
          ) : (company.jobs ?? []).map(job => (
            <div key={job.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-50">
                <div>
                  <p className="text-sm font-semibold text-[#1a1918]">{job.public_title ?? job.title ?? 'Offre sans titre'}</p>
                  <p className="text-xs text-zinc-400">{job.location ?? ''}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${job.status === 'open' ? 'bg-green-50 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                  {job.status === 'open' ? 'Ouverte' : job.status}
                </span>
              </div>
              {job.submissions && job.submissions.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {job.submissions.map((sub: { id: string; status: string; interns?: { first_name: string; last_name: string } | null; cases?: { id: string } | null }) => (
                    <Link key={sub.id} href={`/${locale}/cases/${sub.cases?.id ?? ''}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/70 transition-colors block">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-zinc-400">
                          {(sub.interns?.first_name?.[0] ?? '?').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-[#1a1918] flex-1">
                        {sub.interns ? `${sub.interns.first_name} ${sub.interns.last_name}` : 'Candidat'}
                      </p>
                      <span className="text-xs text-zinc-400">{sub.status}</span>
                      <span className="text-zinc-300 text-xs">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-300 px-4 py-3 italic">Aucun candidat pour cette offre</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info panel (read-only sections) */}
      {!editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Identité</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Secteur</dt><dd className="text-[#1a1918]">{company.sector ?? company.industry ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Taille</dt><dd className="text-[#1a1918]">{company.company_size ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Site web</dt><dd>{company.website ? (<a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline text-xs">{company.website}</a>) : <span className="text-zinc-300">—</span>}</dd></div>
            </dl>
            <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-50">{company.description ?? <span className="text-zinc-300 italic">Aucune description</span>}</p>
          </div>

          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Localisation</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Ville du stage</dt><dd className="text-[#1a1918] font-medium">{company.internship_city ?? company.city ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Pays immat.</dt><dd className="text-[#1a1918]">{company.registration_country ?? company.country ?? '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Adresse</dt><dd className="text-[#1a1918] text-right max-w-[60%] text-xs">{[company.address_street, company.address_postal_code, company.address_city].filter(Boolean).join(', ') || company.legal_address || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Google Maps</dt><dd>{company.google_maps_url ? (<a href={company.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline text-xs">Voir →</a>) : <span className="text-zinc-300">—</span>}</dd></div>
            </dl>
          </div>

          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Légal</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Type légal</dt><dd className="text-[#1a1918] font-medium">{company.legal_type ?? company.company_type ?? company.type ?? '—'}</dd></div>
              {/* Champs spécifiques selon le pays */}
              {(company.registration_country === 'ID' || (!company.registration_country && (company.nib || company.npwp))) && (<>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">NIB</dt><dd className="text-[#1a1918] font-mono text-xs">{company.nib ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">NPWP</dt><dd className="text-[#1a1918] font-mono text-xs">{company.npwp ?? '—'}</dd></div>
                {company.vat_number && <div className="flex justify-between gap-3"><dt className="text-zinc-500">TVA (PKP)</dt><dd className="text-[#1a1918] font-mono text-xs">{company.vat_number}</dd></div>}
              </>)}
              {(company.registration_country === 'FR' || company.registration_country === 'BE' || company.registration_country === 'CH') && (<>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">SIRET</dt><dd className="text-[#1a1918] font-mono text-xs">{company.siret ?? '—'}</dd></div>
                {company.vat_number && <div className="flex justify-between gap-3"><dt className="text-zinc-500">TVA intra</dt><dd className="text-[#1a1918] font-mono text-xs">{company.vat_number}</dd></div>}
              </>)}
              {(company.registration_country === 'US' || company.registration_country === 'GB' || company.registration_country === 'AU') && (<>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">EIN / Tax ID</dt><dd className="text-[#1a1918] font-mono text-xs">{company.tax_id ?? '—'}</dd></div>
                {company.state_of_incorporation && <div className="flex justify-between gap-3"><dt className="text-zinc-500">État incorp.</dt><dd className="text-[#1a1918] text-xs">{company.state_of_incorporation}</dd></div>}
              </>)}
              {company.registration_country === 'TH' && (<>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">DBD Reg.</dt><dd className="text-[#1a1918] font-mono text-xs">{company.registration_number ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Tax ID</dt><dd className="text-[#1a1918] font-mono text-xs">{company.tax_id ?? '—'}</dd></div>
              </>)}
              {company.registration_country && !['ID','FR','BE','CH','US','GB','AU','TH'].includes(company.registration_country) && (<>
                {company.registration_number && <div className="flex justify-between gap-3"><dt className="text-zinc-500">Reg. number</dt><dd className="text-[#1a1918] font-mono text-xs">{company.registration_number}</dd></div>}
                {company.tax_id && <div className="flex justify-between gap-3"><dt className="text-zinc-500">Tax ID</dt><dd className="text-[#1a1918] font-mono text-xs">{company.tax_id}</dd></div>}
              </>)}
            </dl>
          </div>

          <div className="bg-white border border-zinc-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Réseaux sociaux</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Instagram</dt><dd>{company.instagram_url ? (<a href={company.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline text-xs">Voir →</a>) : <span className="text-zinc-300">—</span>}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">TikTok</dt><dd>{company.tiktok_url ? (<a href={company.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-zinc-700 hover:underline text-xs">Voir →</a>) : <span className="text-zinc-300">—</span>}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">LinkedIn</dt><dd>{company.linkedin_url ? (<a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Voir →</a>) : <span className="text-zinc-300">—</span>}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-500">Facebook</dt><dd>{company.facebook_url ? (<a href={company.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">Voir →</a>) : <span className="text-zinc-300">—</span>}</dd></div>
            </dl>
          </div>

          {company.is_partner && (
            <div className="bg-white border border-amber-100 rounded-xl p-4 md:col-span-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Partenariat</h3>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Catégorie</dt><dd className="text-[#1a1918]">{company.partner_category ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Timing</dt><dd className="text-[#1a1918]">{company.partner_timing === 'pre_arrival' ? 'Avant départ' : company.partner_timing === 'on_site' ? "Sur l'île" : company.partner_timing === 'both' ? 'Les deux' : '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Visible depuis</dt><dd className="text-[#1a1918]">{company.partner_visible_from === 'payment' ? 'Paiement (Welcome Kit)' : company.partner_visible_from === 'arrival' ? "Arrivée" : '—'}</dd></div>
              </dl>
              {company.partner_deal && <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2 text-sm">{company.partner_deal}</div>}
            </div>
          )}

          <div className="bg-white border border-zinc-100 rounded-xl p-4 md:col-span-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Notes internes</h3>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{company.notes ?? ''}{!company.notes && <span className="text-zinc-300 italic">Aucune note</span>}</p>
          </div>

        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            {deleteError === 'HAS_ACTIVE_JOBS' ? (
              <>
                <h2 className="text-lg font-bold text-[#1a1918] mb-2">Offres actives détectées</h2>
                <p className="text-sm text-zinc-600 mb-3">
                  Cette entreprise a des offres actives. Désactiver l'entreprise plutôt que de la supprimer ?
                </p>
                {(company.contacts ?? []).length > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer mb-4 bg-zinc-50 rounded-xl p-3">
                    <input type="checkbox" checked={deactivateContacts}
                      onChange={e => setDeactivateContacts(e.target.checked)}
                      className="mt-0.5 rounded" />
                    <div>
                      <p className="text-sm font-medium text-zinc-700">Désactiver aussi les contacts liés</p>
                      <p className="text-xs text-zinc-400">
                        {(company.contacts ?? []).length} contact{(company.contacts ?? []).length > 1 ? 's' : ''} :
                        {' '}{(company.contacts ?? []).slice(0, 2).map(c => [c.first_name, c.last_name].filter(Boolean).join(' ')).join(', ')}
                      </p>
                    </div>
                  </label>
                )}
                <div className="flex gap-3">
                  <button onClick={() => void handleDeactivate()} className="px-4 py-2 bg-[#d97706] text-white text-sm font-medium rounded-lg hover:bg-[#c96706] transition-colors">
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
