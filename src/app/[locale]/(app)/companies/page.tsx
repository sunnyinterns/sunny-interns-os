"use client"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAIAssist } from "@/hooks/useAIAssist"
import { SearchableSelect, type SearchableSelectItem } from "@/components/ui/SearchableSelect"

interface Job { id: string; status: string }
interface Company {
  id: string
  name: string
  type?: string | null
  company_type?: string | null
  category?: string | null
  city?: string | null
  sector?: string | null
  industry?: string | null
  legal_type?: string | null
  logo_url?: string | null
  internship_city?: string | null
  is_active: boolean
  is_employer?: boolean | null
  is_partner?: boolean | null
  is_supplier?: boolean | null
  partner_timing?: string | null
  partner_category?: string | null
  partner_deal?: string | null
  partner_visible_from?: string | null
  onboarding_form_sent_at?: string | null
  onboarding_completed_at?: string | null
  jobs?: Job[]
  contacts?: { id: string }[]
  active_interns_count?: number
}

const SECTORS = [
  'Marketing', 'Hôtellerie', 'Tech', 'E-commerce', 'Tourisme', 'Finance', 'Éducation',
  'Surf/Sport', 'Restauration', 'Bien-être', 'Art/Créatif', 'ONG/Social', 'Autre',
]
const SIZES = ['1-5', '6-20', '21-50', '50+']

const COUNTRIES = [
  { code: 'ID', label: '🇮🇩 Indonésie' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'BE', label: '🇧🇪 Belgique' },
  { code: 'CH', label: '🇨🇭 Suisse' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'TH', label: '🇹🇭 Thaïlande' },
  { code: 'AU', label: '🇦🇺 Australie' },
  { code: 'SG', label: '🇸🇬 Singapour' },
  { code: 'OTHER', label: '🌍 Autre' },
]

const EMPTY_FORM = {
  // rôles
  is_employer: true,
  is_partner: false,
  is_supplier: false,
  partner_timing: 'both' as 'pre_arrival' | 'on_site' | 'both',
  partner_category: '',
  partner_deal: '',
  partner_visible_from: 'payment' as 'payment' | 'arrival',
  // général
  name: '',
  website: '',
  logo_url: '',
  industry: '',
  company_size: '',
  description: '',
  company_type: '',
  // social
  instagram_url: '',
  tiktok_url: '',
  linkedin_url: '',
  facebook_url: '',
  // localisation
  registration_country: 'ID',
  internship_city: '',
  legal_address: '',
  google_maps_url: '',
  // légal
  legal_type: '',
  nib: '',
  npwp: '',
  vat_number: '',
  siret: '',
  tax_id: '',
  registration_number: '',
  state_of_incorporation: '',
  // sponsor
  sponsor_company_id: '',
  address_street: '',
  address_postal_code: '',
  address_city: '',
  can_host_directly: false,
  partnership_agreement_url: '',
  // partenaire
  partnership_type: '',
  partner_offer_details: '',
  partner_conditions: '',
  partner_booking_url: '',
}

export default function CompaniesPage() {
  const { locale } = useParams()
  const router = useRouter()
  const { assist, loading: aiLoading } = useAIAssist()
  const [companies, setCompanies] = useState<Company[]>([])
  const [sponsors, setSponsors] = useState<{id:string;company_name:string;city:string|null;npwp:string|null}[]>([])
  const [q, setQ] = useState("")
  const [filterSector, setFilterSector] = useState("")
  const [filterRole, setFilterRole] = useState<'all' | 'employer' | 'partner'>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [prefilling, setPrefilling] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [cities, setCities] = useState<{id:string; name:string; area:string}[]>([])
  const isFirstRender = useRef(true)

  useEffect(() => {
    fetch('/api/internship-cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : [])).catch(() => null)
  }, [])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setForm(p => ({ ...p, legal_type: '', company_type: '' }))
  }, [form.registration_country])

  function toast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/companies").then(r => r.json()),
      fetch("/api/companies/stats").then(r => r.ok ? r.json() : {}),
    ]).then(([comps, stats]) => {
      const statsMap = (stats as Record<string, number>) ?? {}
      const enriched = (Array.isArray(comps) ? comps : []).map((c: Company) => ({
        ...c,
        active_interns_count: statsMap[c.id] ?? 0,
      }))
      setCompanies(enriched)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = companies.filter(c => {
    const matchQ = c.name.toLowerCase().includes(q.toLowerCase())
    const matchSector = !filterSector || (c.industry ?? c.sector ?? c.category ?? '') === filterSector
    const matchRole =
      filterRole === 'all' ||
      (filterRole === 'employer' && c.is_employer) ||
      (filterRole === 'partner' && c.is_partner)
    return matchQ && matchSector && matchRole
  })

  // TOUTES les entreprises employeurs ont besoin d'un sponsor pour le VITAS
  // SAUF les PT PMA qui cochent 'accueil direct' (cas exceptionnel)
  const isPMA = form.registration_country === 'ID' && form.legal_type === 'PT_PMA'
  const needsSponsor = form.is_employer && !(isPMA && form.can_host_directly)

  const sponsorItems: SearchableSelectItem[] = sponsors.map(s => ({
    id: s.id,
    label: s.company_name,
    sublabel: [s.city, s.npwp ? 'NPWP: ' + s.npwp : null].filter(Boolean).join(' · ') || undefined,
    avatar: s.company_name[0]?.toUpperCase(),
    avatarColor: '#f0ebe2',
  }))

  async function prefillFromWebsite() {
    if (!form.website) return
    setPrefilling(true)
    const result = await assist('prefill_company', { website: form.website })
    if (result) {
      try {
        const clean = result.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
        const data = JSON.parse(clean) as Record<string, string | null>
        setForm(f => ({
          ...f,
          name: f.name || data.name || f.name,
          description: f.description || data.description || '',
          industry: f.industry || data.industry || '',
          company_type: f.company_type || data.company_type || '',
          internship_city: f.internship_city || data.city || '',
          instagram_url: f.instagram_url || data.instagram || '',
          linkedin_url: f.linkedin_url || data.linkedin || '',
        }))
        toast('✓ Fiche pré-remplie depuis le site web')
      } catch { toast('Impossible de lire la réponse IA') }
    }
    setPrefilling(false)
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    let finalLogoUrl = form.logo_url
    if (logoFile) {
      setLogoUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', logoFile)
        fd.append('bucket', 'company-logos')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json() as { url: string }
          finalLogoUrl = url
        } else {
          toast('Échec upload logo')
        }
      } finally {
        setLogoUploading(false)
      }
    }
    const payload: Record<string, unknown> = {
      name: form.name,
      website: form.website || null,
      logo_url: finalLogoUrl || null,
      industry: form.industry || null,
      category: form.industry || null,
      company_size: form.company_size || null,
      description: form.description || null,
      company_type: form.legal_type || form.company_type || null, // contrainte supprimée
      type: form.legal_type || form.company_type || null,
      legal_type: form.legal_type || null,
      is_employer: form.is_employer,
      is_partner: form.is_partner,
      is_supplier: form.is_supplier,
      partner_timing: form.is_partner ? (form.partner_timing || 'both') : null,
      partner_category: form.is_partner ? (form.partner_category || null) : null,
      partner_deal: form.is_partner ? (form.partner_deal || null) : null,
      partner_visible_from: form.is_partner ? (form.partner_visible_from || 'payment') : null,
      instagram_url: form.instagram_url || null,
      tiktok_url: form.tiktok_url || null,
      linkedin_url: form.linkedin_url || null,
      facebook_url: form.facebook_url || null,
      registration_country: form.registration_country || null,
      internship_city: form.internship_city || null,
      city: form.internship_city || null,
      legal_address: [form.address_street, form.address_postal_code, form.address_city].filter(Boolean).join(', ') || form.legal_address || null,
      address_street: form.address_street || null,
      address_postal_code: form.address_postal_code || null,
      address_city: form.address_city || null,
      google_maps_url: form.google_maps_url || null,
      nib: form.nib || null,
      npwp: form.npwp || null,
      vat_number: form.vat_number || null,
      siret: form.siret || null,
      tax_id: form.tax_id || null,
      registration_number: form.registration_number || null,
      state_of_incorporation: form.state_of_incorporation || null,
      needs_sponsor: needsSponsor,
      can_host_directly: form.can_host_directly,
      sponsor_company_id: needsSponsor ? (form.sponsor_company_id || null) : null,
      partnership_agreement_url: form.partnership_agreement_url || null,
      partnership_type: form.is_partner ? (form.partnership_type || null) : null,
      partner_offer_details: form.is_partner ? (form.partner_offer_details || null) : null,
      partner_conditions: form.is_partner ? (form.partner_conditions || null) : null,
      partner_booking_url: form.is_partner ? (form.partner_booking_url || null) : null,
      destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
      country: 'Indonesia',
      is_active: true,
    }
    const r = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (r.ok) {
      const c = await r.json() as Company
      setCompanies(prev => [...prev, c])
      setSaving(false)
      setShowModal(false)
      setForm(EMPTY_FORM)
      setLogoFile(null); setLogoPreview(null); setLogoMode('url')
      router.push(`/${locale as string}/companies/${c.id}`)
    } else {
      const err = await r.json().catch(() => ({}))
      setSaving(false)
      alert('Erreur création: ' + (err.error ?? r.statusText))
    }
  }

  const inputCls = "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">Companies <span className="text-base font-normal text-zinc-500">({companies.length})</span></h1>
          <p className="text-sm text-zinc-500 mt-0.5">{companies.filter(c => c.is_active).length} actives · {companies.filter(c => c.onboarding_completed_at).length} onboarding complété</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors"
        >
          + Nouvelle company
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
        </div>
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
        >
          <option value="">Tous les secteurs</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
          {(['all', 'employer', 'partner'] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filterRole === r ? 'bg-white shadow-sm font-medium text-[#1a1918]' : 'text-zinc-500'}`}>
              {r === 'all' ? 'Tous' : r === 'employer' ? '🏢 Employeurs' : '🤝 Partenaires'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucune company trouvée</p>
          <button onClick={() => setShowModal(true)} className="mt-2 px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg">Créer une company</button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Entreprise</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Types</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Jobs</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Infos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(c => {
                const openJobs = (c.jobs ?? []).filter(j => j.status === 'open').length
                const onboardingDone = !!c.onboarding_completed_at
                return (
                  <tr key={c.id}
                    onClick={() => router.push(`/${locale as string}/companies/${c.id}`)}
                    className="hover:bg-zinc-50/70 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#111110] flex items-center justify-center flex-shrink-0">
                            <span className="text-[#c8a96e] font-bold text-xs">{c.name[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#1a1918]">{c.name}</p>
                          <p className="text-xs text-zinc-400">{c.legal_type ?? c.company_type ?? c.type ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{c.internship_city ?? c.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {c.is_employer && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">🏢 Employeur</span>}
                        {c.is_partner && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">🤝 Partenaire</span>}
                        {c.is_supplier && <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">📦 Fournisseur</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {openJobs > 0 ? (
                        <span className="text-xs font-medium text-[#c8a96e]">{openJobs} ouvert{openJobs > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {onboardingDone ? (
                        <span className="text-xs bg-green-50 text-[#0d9e75] px-2 py-0.5 rounded-full">✅ Validé</span>
                      ) : c.info_validated_by_contact ? (
                        <span className="text-xs bg-green-50 text-[#0d9e75] px-2 py-0.5 rounded-full">✅ Validé</span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-zinc-300 text-sm">→</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle company</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            {toastMsg && (
              <div className="mx-6 mt-3 px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg border border-green-200">{toastMsg}</div>
            )}
            <form onSubmit={createCompany} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

              {/* SECTION 0 — Rôles */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">① Rôle(s) de cette entreprise</p>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                  <input type="checkbox" checked={form.is_employer} onChange={e => setForm(p => ({...p, is_employer: e.target.checked}))} className="rounded" />
                  🏢 Employeur <span className="text-xs text-zinc-400">— recrute des stagiaires</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                  <input type="checkbox" checked={form.is_partner} onChange={e => setForm(p => ({...p, is_partner: e.target.checked}))} className="rounded" />
                  🤝 Partenaire <span className="text-xs text-zinc-400">— offre des deals aux étudiants</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                  <input type="checkbox" checked={form.is_supplier} onChange={e => setForm(p => ({...p, is_supplier: e.target.checked}))} className="rounded" />
                  📦 Fournisseur <span className="text-xs text-zinc-400">— suivi comptabilité interne</span>
                </label>
              </div>

              <div className="border-t border-zinc-100" />

              {/* SECTION 1 — Général */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">② Informations générales</p>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={inputCls} placeholder="Ex: Potato Head Bali" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Pays d&apos;immatriculation *</label>
                    <select value={form.registration_country} onChange={e => setForm(p => ({...p, registration_country: e.target.value}))} className={inputCls}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Ville du stage</label>
                    <select value={form.internship_city} onChange={e => setForm(p => ({...p, internship_city: e.target.value}))} className={inputCls}>
                      <option value="">— Sélectionner —</option>
                      {Object.entries(cities.reduce((acc, c) => {
                        (acc[c.area] = acc[c.area] || []).push(c)
                        return acc
                      }, {} as Record<string, typeof cities>)).map(([area, areaCities]) => (
                        <optgroup key={area} label={area}>
                          {areaCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                  <div className="flex gap-2">
                    <input type="url" value={form.website} onChange={e => setForm(p => ({...p, website: e.target.value}))} className={inputCls} placeholder="https://…" />
                    <button type="button" disabled={prefilling || aiLoading || !form.website}
                      onClick={prefillFromWebsite}
                      className="px-3 py-2 text-xs font-medium rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50 whitespace-nowrap">
                      {prefilling ? '…' : '🔍 Pré-remplir'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Logo</label>
                  <div className="space-y-2">
                    {(form.logo_url || logoPreview) && (
                      <div className="flex items-center gap-3 p-2 bg-zinc-50 rounded-xl">
                        <img
                          src={logoPreview || form.logo_url}
                          alt="Logo preview"
                          className="w-12 h-12 object-contain rounded-lg bg-white border border-zinc-100"
                          onError={e => { e.currentTarget.src = '' }}
                        />
                        <button
                          type="button"
                          onClick={() => { setForm(p => ({...p, logo_url: ''})); setLogoPreview(null); setLogoFile(null) }}
                          className="text-xs text-red-400 hover:text-red-600">
                          Supprimer
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 text-xs mb-1">
                      <button type="button" onClick={() => setLogoMode('url')}
                        className={`px-2 py-0.5 rounded ${logoMode === 'url' ? 'bg-zinc-200 font-medium' : 'text-zinc-400'}`}>
                        URL
                      </button>
                      <button type="button" onClick={() => setLogoMode('upload')}
                        className={`px-2 py-0.5 rounded ${logoMode === 'upload' ? 'bg-zinc-200 font-medium' : 'text-zinc-400'}`}>
                        Upload
                      </button>
                    </div>
                    {logoMode === 'url' ? (
                      <input
                        type="url"
                        value={form.logo_url}
                        onChange={e => { setForm(p => ({...p, logo_url: e.target.value})); setLogoPreview(null); setLogoFile(null) }}
                        className={inputCls}
                        placeholder="https://example.com/logo.png"
                      />
                    ) : (
                      <div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setLogoFile(file)
                            const reader = new FileReader()
                            reader.onload = ev => setLogoPreview(ev.target?.result as string)
                            reader.readAsDataURL(file)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-xs text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors">
                          {logoUploading ? 'Upload…' : logoFile ? logoFile.name : 'Cliquer pour choisir une image (PNG, JPG, SVG)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Secteur / Industrie</label>
                    <select value={form.industry} onChange={e => setForm(p => ({...p, industry: e.target.value}))} className={inputCls}>
                      <option value="">— Sélectionner —</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Taille</label>
                    <select value={form.company_size} onChange={e => setForm(p => ({...p, company_size: e.target.value}))} className={inputCls}>
                      <option value="">—</option>
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className={inputCls} rows={2} placeholder="Activité de l'entreprise…" />
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* SECTION 2 — Social */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">③ Réseaux sociaux <span className="text-zinc-300 font-normal normal-case">— optionnel</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.instagram_url} onChange={e => setForm(p => ({...p, instagram_url: e.target.value}))} className={inputCls} placeholder="Instagram URL" />
                  <input value={form.tiktok_url} onChange={e => setForm(p => ({...p, tiktok_url: e.target.value}))} className={inputCls} placeholder="TikTok URL" />
                  <input value={form.linkedin_url} onChange={e => setForm(p => ({...p, linkedin_url: e.target.value}))} className={inputCls} placeholder="LinkedIn URL" />
                  <input value={form.facebook_url} onChange={e => setForm(p => ({...p, facebook_url: e.target.value}))} className={inputCls} placeholder="Facebook URL" />
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* SECTION 3 — Localisation */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">④ Localisation</p>
<div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse (rue, numéro)</label>
                  <input value={form.address_street ?? ''} onChange={e => setForm(p => ({...p, address_street: e.target.value, legal_address: [e.target.value, p.address_postal_code, p.address_city].filter(Boolean).join(', ')}))} className={inputCls} placeholder="Jl. Raya Canggu No. 12…" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Code postal</label>
                    <input value={form.address_postal_code ?? ''} onChange={e => setForm(p => ({...p, address_postal_code: e.target.value}))} className={inputCls} placeholder="80361" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                    <input value={form.address_city ?? ''} onChange={e => setForm(p => ({...p, address_city: e.target.value}))} className={inputCls} placeholder="Canggu, Bali" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Google Maps URL</label>
                  <input type="url" value={form.google_maps_url} onChange={e => setForm(p => ({...p, google_maps_url: e.target.value}))} className={inputCls} placeholder="https://maps.google.com/…" />
                </div>
              </div>

              <div className="border-t border-zinc-100" />

              {/* SECTION 4 — Légal dynamique par pays */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑤ Informations légales</p>

                {form.registration_country === 'ID' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Type de société *</label>
                      <select value={form.legal_type}
                        onChange={e => setForm(p => ({...p, legal_type: e.target.value, company_type: e.target.value}))}
                        className={inputCls}>
                        <option value="">— Sélectionner —</option>
                        <option value="PT_LOCAL">PT Local — société indonésienne</option>
                        <option value="PT_PMA">PT PMA — investissement étranger</option>
                        <option value="CV">CV — Commanditaire Vennootschap</option>
                        <option value="YAYASAN">Yayasan — Fondation / ONG</option>
                        <option value="UD">UD — Entreprise individuelle</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                        <input value={form.nib} onChange={e => setForm(p => ({...p, nib: e.target.value}))}
                          className={inputCls} placeholder="Nomor Induk Berusaha" />
                        <p className="text-[10px] text-zinc-400 mt-0.5">N° d&apos;identification commerciale unique</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                        <input value={form.npwp} onChange={e => setForm(p => ({...p, npwp: e.target.value}))}
                          className={inputCls} placeholder="XX.XXX.XXX.X-XXX.XXX" />
                        <p className="text-[10px] text-zinc-400 mt-0.5">N° fiscal indonésien</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° TVA (PKP)</label>
                      <input value={form.vat_number} onChange={e => setForm(p => ({...p, vat_number: e.target.value}))}
                        className={inputCls} placeholder="Optionnel" />
                    </div>

                  </div>
                )}

                {(form.registration_country === 'FR' || form.registration_country === 'BE' || form.registration_country === 'CH') && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Forme juridique *</label>
                      <select value={form.legal_type}
                        onChange={e => setForm(p => ({...p, legal_type: e.target.value, company_type: e.target.value}))}
                        className={inputCls}>
                        <option value="">— Sélectionner —</option>
                        <option value="SASU">SASU — Société par actions simplifiée unipersonnelle</option>
                        <option value="SAS">SAS — Société par actions simplifiée</option>
                        <option value="SARL">SARL — Société à responsabilité limitée</option>
                        <option value="EURL">EURL — Entreprise unipersonnelle à responsabilité limitée</option>
                        <option value="SA">SA — Société anonyme</option>
                        <option value="SCI">SCI — Société civile immobilière</option>
                        <option value="EI">EI — Entreprise individuelle</option>
                        <option value="AE">Auto-entrepreneur / Micro-entreprise</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label>
                        <input value={form.siret} onChange={e => setForm(p => ({...p, siret: e.target.value}))}
                          className={inputCls} placeholder="14 chiffres" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">N° TVA intracommunautaire</label>
                        <input value={form.vat_number} onChange={e => setForm(p => ({...p, vat_number: e.target.value}))}
                          className={inputCls} placeholder="FR XX XXXXXXXXX" />
                      </div>
                    </div>
                  </div>
                )}

                {(form.registration_country === 'US' || form.registration_country === 'GB' || form.registration_country === 'AU') && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Entity type *</label>
                      <select value={form.legal_type}
                        onChange={e => setForm(p => ({...p, legal_type: e.target.value, company_type: e.target.value}))}
                        className={inputCls}>
                        <option value="">— Select —</option>
                        <option value="LLC">LLC — Limited Liability Company</option>
                        <option value="CORP">Corporation (C-Corp)</option>
                        <option value="SCORP">S-Corporation</option>
                        <option value="LTD">Ltd — Private Limited Company</option>
                        <option value="PARTNERSHIP">Partnership</option>
                        <option value="SOLE">Sole proprietorship</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">EIN / Tax ID</label>
                        <input value={form.tax_id} onChange={e => setForm(p => ({...p, tax_id: e.target.value}))}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">State of incorporation</label>
                        <input value={form.state_of_incorporation}
                          onChange={e => setForm(p => ({...p, state_of_incorporation: e.target.value}))}
                          className={inputCls} placeholder="Delaware, California…" />
                      </div>
                    </div>
                  </div>
                )}

                {form.registration_country === 'TH' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Type</label>
                      <select value={form.legal_type}
                        onChange={e => setForm(p => ({...p, legal_type: e.target.value, company_type: e.target.value}))}
                        className={inputCls}>
                        <option value="">—</option>
                        <option value="CO_LTD">Co., Ltd.</option>
                        <option value="BOI">BOI Company</option>
                        <option value="REP_OFFICE">Representative Office</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">DBD Registration</label>
                        <input value={form.registration_number}
                          onChange={e => setForm(p => ({...p, registration_number: e.target.value}))}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Tax ID</label>
                        <input value={form.tax_id} onChange={e => setForm(p => ({...p, tax_id: e.target.value}))}
                          className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}

                {!['ID','FR','BE','CH','US','GB','AU','TH'].includes(form.registration_country) && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Type de structure</label>
                      <input value={form.legal_type} onChange={e => setForm(p => ({...p, legal_type: e.target.value}))}
                        className={inputCls} placeholder="Ex: LLC, GmbH, SA, Ltda…" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">N° d&apos;enregistrement</label>
                      <input value={form.registration_number}
                        onChange={e => setForm(p => ({...p, registration_number: e.target.value}))}
                        className={inputCls} />
                    </div>
                  </div>
                )}
              </div>



              {/* SECTION 5 — Sponsor (toutes entreprises employeurs) */}
              {needsSponsor && (
                <>
                  <div className="border-t border-zinc-100" />
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑤ Sponsor VITAS</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
                      <p className="text-xs text-blue-700">
                        Un accord de parrainage avec une société PT locale indonésienne est requis pour le VITAS stagiaire. Valable pour toutes les entreprises étrangères et les PT PMA.
                      </p>
                      <SearchableSelect
                        label="Entreprise sponsor (PT locale) *"
                        items={sponsorItems}
                        value={form.sponsor_company_id || null}
                        onChange={item => setForm(p => ({...p, sponsor_company_id: item?.id ?? ''}))}
                        placeholder={sponsorItems.length > 0 ? "Sélectionner un sponsor…" : "Aucun sponsor configuré — voir Paramètres › Administratif › Sponsors PT"}
                        searchPlaceholder="Rechercher un sponsor PT…"
                      />
                      {sponsorItems.length === 0 && (
                        <p className="text-xs text-blue-600">→ Configurer les sponsors dans Paramètres › Administratif › Sponsors PT</p>
                      )}
                    </div>
                    {isPMA && (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.can_host_directly}
                          onChange={e => setForm(p => ({...p, can_host_directly: e.target.checked, sponsor_company_id: e.target.checked ? '' : p.sponsor_company_id}))}
                          className="mt-0.5 rounded" />
                        <span className="text-xs text-zinc-600">
                          Exception PT PMA — peut accueillir des stagiaires directement sans sponsor (modifie le workflow documents)
                        </span>
                      </label>
                    )}
                  </div>
                </>
              )}

              {/* SECTION 6 — Partenariat */}
              {form.is_partner && (
                <>
                  <div className="border-t border-zinc-100" />
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">⑥ Partenariat</p>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Disponible</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([['pre_arrival','Avant départ'],['on_site','Sur l\'île'],['both','Les deux']] as const).map(([val, label]) => (
                          <button key={val} type="button"
                            onClick={() => setForm(p => ({...p, partner_timing: val}))}
                            className={`py-2 text-xs rounded-lg border transition-colors ${form.partner_timing === val ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Visible dans le portail dès</label>
                      <select value={form.partner_visible_from} onChange={e => setForm(p => ({...p, partner_visible_from: e.target.value as 'payment' | 'arrival'}))} className={inputCls}>
                        <option value="payment">Paiement validé (Welcome Kit)</option>
                        <option value="arrival">Arrivée à Bali (statut Actif)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Catégorie</label>
                      <input value={form.partner_category} onChange={e => setForm(p => ({...p, partner_category: e.target.value}))}
                        className={inputCls} placeholder="eSIM, Assurance, VPN, Restaurant, Transport, Sport…" list="partner-categories" />
                      <datalist id="partner-categories">
                        {['eSIM','Assurance','VPN','Transport','Logement','Restaurant','Sport & Wellness','Coworking','Shopping','Banque','Services','Autre'].map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Saisie libre — créez une nouvelle catégorie en tapant</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Offre / Deal <span className="text-amber-600 text-[10px] font-medium">🇬🇧 EN — visible étudiant</span></label>
                      <textarea value={form.partner_deal} onChange={e => setForm(p => ({...p, partner_deal: e.target.value}))}
                        className={inputCls} rows={3}
                        placeholder="Ex: 15% off on all eSIM plans with code BALIINTERNS — valid for active interns only" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Création…" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
