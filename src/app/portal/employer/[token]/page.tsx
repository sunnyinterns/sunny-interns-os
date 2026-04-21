'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
type Company = {
  id: string; name: string; description: string | null; website: string | null
  legal_type: string | null; registration_country: string | null; registration_country_code: string | null
  nib: string | null; npwp: string | null; siret: string | null; vat_number: string | null
  tax_id: string | null; registration_number: string | null
  address_street: string | null; address_postal_code: string | null; address_city: string | null; address_country: string | null
  legal_details: Record<string, string> | null; info_validated_by_contact: boolean | null
}
type Contact = {
  id: string; first_name: string | null; last_name: string | null
  job_title: string | null; email: string | null; whatsapp: string | null
  nationality: string | null; date_of_birth: string | null; place_of_birth: string | null
  id_type: string | null; id_number: string | null; is_legal_signatory: boolean | null; signatory_title: string | null
}
type Manager = { first_name: string | null; last_name: string | null; email: string | null; whatsapp: string | null }
type CaseInfo = { id: string; status: string; interns?: { first_name: string; last_name: string; nationality?: string; passport_number?: string } | null }
type AccessData = {
  company_info_validated: boolean | null; companies: Company; contacts: Contact | null
  sponsor_contract_signed_at?: string | null; sponsor_contract_signed_by?: string | null
  sponsor_contract_signature_data?: string | null; signing_contact_id?: string | null
}
type PortalData = {
  access: AccessData; case: CaseInfo | null; manager: Manager | null
  company: Company | null
  company_contacts: Contact[]; variant: 'A' | 'B' | 'C'
  template_id: string; agreement_unlocked: boolean; contract_signed: boolean
}

// ── Country helpers ─────────────────────────────────────────────────────────
const isIndonesian = (c: Company) =>
  c.registration_country_code === 'ID' || c.registration_country?.toLowerCase().includes('indonesia')
const isFrench = (c: Company) =>
  c.registration_country_code === 'FR' || c.registration_country?.toLowerCase().includes('france')

// ── Variant detection ────────────────────────────────────────────────────────
function detectVariant(company: Company, signingContact: Contact | null): 'A' | 'B' | 'C' {
  if (!isIndonesian(company)) return 'A'
  const nat = (signingContact?.nationality ?? '').toLowerCase()
  const isIndoDirector = nat.includes('indonesia') || nat.includes('indonesian')
  return isIndoDirector ? 'C' : 'B'
}

const VARIANT_INFO = {
  A: { label: 'Foreign Company / Foreign Director', desc: 'Company registered outside Indonesia — no NIB/NPWP required', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  B: { label: 'Indonesian Company / Foreign Director', desc: 'PT/CV Indonesian company with a foreign national director — NIB + NPWP required', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  C: { label: 'Indonesian Company / Indonesian Director', desc: 'PT/CV Indonesian company with Indonesian national director — full KTP + legal deed required', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
}

const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'
const label = (text: string, required = false) =>
  <label className="block text-xs font-medium text-zinc-600 mb-1">{text}{required && <span className="text-red-500 ml-0.5">*</span>}</label>

const COUNTRIES = [
  { code: 'ID', name: 'Indonesia (PT/CV)' }, { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' }, { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' }, { code: 'SG', name: 'Singapore' },
  { code: 'OTHER', name: 'Other country' },
]

const LEGAL_TYPES_BY_COUNTRY: Record<string, string[]> = {
  ID: ['PT', 'CV', 'Yayasan', 'UD'],
  FR: ['SAS', 'SARL', 'SA', 'Auto-entrepreneur', 'EURL'],
  GB: ['Ltd', 'LLP', 'PLC', 'Sole Trader'],
  US: ['LLC', 'Inc', 'Corp', 'LLP'],
  DEFAULT: ['LLC', 'Ltd', 'GmbH', 'SRL', 'SA', 'Other'],
}

export default function EmployerPortal() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'infos' | 'agreement' | 'intern'>('infos')

  // Company form
  const [company, setCompany] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Signing contact
  const [signingContactId, setSigningContactId] = useState<string>('')
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState<Partial<Contact>>({})
  const [savingContact, setSavingContact] = useState(false)

  // Agreement
  const [templateHtml, setTemplateHtml] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [signing, setSigning] = useState(false)
  const [sigData, setSigData] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/portal/employer/${token}`)
    const d = await r.json() as PortalData & { error?: string }
    if (d.error) { setError(d.error); setLoading(false); return }
    setData(d)
    // Normaliser les champs DB → champs portal Company
    const dbCompany = d.company ?? d.access.companies ?? {}
    const normalized: Partial<Company> = {
      ...dbCompany,
      address_city: (dbCompany as Record<string, unknown>).address_city as string ?? (dbCompany as Record<string, unknown>).city as string ?? '',
      registration_country: (dbCompany as Record<string, unknown>).registration_country as string ?? (dbCompany as Record<string, unknown>).country as string ?? '',
      registration_country_code: (dbCompany as Record<string, unknown>).registration_country_code as string ?? (((dbCompany as Record<string, unknown>).country as string)?.toUpperCase().startsWith('INDON') ? 'ID' : ''),
    }
    setCompany(normalized)
    setSigningContactId(d.access.signing_contact_id ?? d.access.contacts?.id ?? '')
    setLoading(false)
  }, [token])

  useEffect(() => { void load() }, [load])

  // Auto-load template when agreement tab opens
  useEffect(() => {
    if (tab === 'agreement' && data?.agreement_unlocked && !templateHtml && !data.contract_signed) {
      void loadTemplate()
    }
  }, [tab, data, templateHtml])

  async function loadTemplate() {
    if (!data) return
    setTemplateLoading(true)
    const r = await fetch(`/api/templates/${data.template_id}/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preview: true, caseId: data.case?.id }),
    })
    if (r.ok) setTemplateHtml(await r.text())
    setTemplateLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch(`/api/portal/employer/${token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...company, signing_contact_id: signingContactId }),
    })
    setSaved(true)
    const r = await fetch(`/api/portal/employer/${token}`)
    if (r.ok) { const d = await r.json() as PortalData; setData(d) }
    setSaving(false); setTimeout(() => setSaved(false), 3000)
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault(); setSavingContact(true)
    const r = await fetch(`/api/portal/employer/${token}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newContact, company_id: (data?.company ?? data?.access.companies)?.id }),
    })
    if (r.ok) {
      const d = await r.json() as { id: string }
      setSigningContactId(d.id); setShowNewContact(false); void load()
    }
    setSavingContact(false)
  }

  async function handleSign() {
    if (!sigData || !data) return
    setSigning(true)
    const r = await fetch(`/api/portal/employer/${token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sign_contract', signature_data: sigData, signing_contact_id: signingContactId }),
    })
    if (r.ok) { void load(); setTab('intern') }
    setSigning(false)
  }

  // Signature canvas
  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault(); setDrawing(true); lastPos.current = getPos(e)
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1a1918'; ctx.lineWidth = 2
    ctx.lineCap = 'round'; ctx.stroke(); lastPos.current = pos
  }
  function endDraw() {
    setDrawing(false)
    setSigData(canvasRef.current?.toDataURL() ?? null)
  }
  function clearSig() {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSigData(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (error || !data) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center text-center">
      <div><p className="text-4xl mb-3">🔗</p><p className="font-bold">Invalid link</p><p className="text-sm text-zinc-400 mt-1">{error}</p></div>
    </div>
  )

  const co = ((data.company ?? data.access.companies) ?? {}) as Company
  const intern = data.case?.interns
  const internName = intern ? `${intern.first_name} ${intern.last_name}` : null
  const contacts = data.company_contacts ?? []
  const signingContact = contacts.find(c => c.id === signingContactId) ?? data.access.contacts
  const currentVariant = detectVariant(company as Company, signingContact ?? null)
  const vInfo = VARIANT_INFO[currentVariant]
  const legalTypes = LEGAL_TYPES_BY_COUNTRY[(company.registration_country_code ?? co.registration_country_code ?? 'DEFAULT')] ?? LEGAL_TYPES_BY_COUNTRY.DEFAULT

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#F5A623,#E8930A)' }}>BI</div>
            <div>
              <p className="text-sm font-bold text-[#1a1918]">{co.name}</p>
              <p className="text-xs text-zinc-400">Partner portal{internName ? ` · ${internName}` : ''}</p>
            </div>
          </div>
          {data.contract_signed && <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">✅ Agreement signed</span>}
        </div>
        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex border-t border-zinc-50">
          <button onClick={() => setTab('infos')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab==='infos'?'border-[#c8a96e] text-[#c8a96e]':'border-transparent text-zinc-500'}`}>
            Information{data.access.company_info_validated ? ' ✅' : ''}
          </button>
          {data.agreement_unlocked
            ? <button onClick={() => setTab('agreement')}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab==='agreement'?'border-[#c8a96e] text-[#c8a96e]':'border-transparent text-zinc-500'}`}>
                Agreement{data.contract_signed ? ' ✅' : ''}
              </button>
            : <div className="px-5 py-3 text-sm text-zinc-300 flex items-center gap-1.5 cursor-not-allowed" title="Save your company information first">
                🔒 Agreement
              </div>
          }
          {data.contract_signed &&
            <button onClick={() => setTab('intern')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab==='intern'?'border-[#c8a96e] text-[#c8a96e]':'border-transparent text-zinc-500'}`}>
              🎓 Intern
            </button>
          }
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── INFORMATION TAB ── */}
        {tab === 'infos' && (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Context */}
            {internName && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">🎓</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1918]">Internship placement — {internName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Fill in your company details. Once saved, the Agreement tab will unlock for signature.</p>
                </div>
              </div>
            )}

            {/* Bali Interns manager contact */}
            {data.manager && (
              <div className="bg-white border border-zinc-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Your Bali Interns contact</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#F5A623,#E8930A)' }}>
                    {(data.manager.first_name?.[0] ?? 'B').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1918]">{data.manager.first_name} {data.manager.last_name}</p>
                    {data.manager.email && <p className="text-xs text-zinc-400">{data.manager.email}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {data.manager.whatsapp && (
                      <a href={`https://wa.me/${data.manager.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg hover:bg-green-100 flex items-center gap-1">
                        💬 WA
                      </a>
                    )}
                    {data.manager.email && (
                      <a href={`mailto:${data.manager.email}`}
                        className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 text-xs rounded-lg hover:bg-zinc-200">
                        ✉️
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Country + variant preview */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Company registration</p>
              <div>
                {label('Country of registration', true)}
                <select value={company.registration_country_code ?? co.registration_country_code ?? ''}
                  onChange={e => setCompany(p => ({ ...p, registration_country_code: e.target.value,
                    registration_country: COUNTRIES.find(c => c.code === e.target.value)?.name ?? e.target.value }))}
                  className={inp}>
                  <option value="">— Select country —</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <p className="text-xs text-zinc-400 mt-1">This determines which agreement template will be used.</p>
              </div>
              {/* Contract variant preview */}
              {(company.registration_country_code || co.registration_country_code) && (
                <div className={`border rounded-xl p-3 text-xs ${vInfo.color}`}>
                  <p className="font-bold">Contract template: Variant {currentVariant}</p>
                  <p className="mt-0.5 opacity-80">{vInfo.desc}</p>
                </div>
              )}
            </div>

            {/* Company details */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Company details</p>
              <div>{label('Company name', true)}<input required value={company.name ?? ''} onChange={e => setCompany(p => ({...p, name: e.target.value}))} className={inp}/></div>
              <div>
                {label('Legal type')}
                <select value={company.legal_type ?? ''} onChange={e => setCompany(p => ({...p, legal_type: e.target.value}))} className={inp}>
                  <option value="">— Select —</option>
                  {legalTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>{label('Website')}<input type="url" value={company.website ?? ''} onChange={e => setCompany(p => ({...p, website: e.target.value}))} className={inp} placeholder="https://…"/></div>
              <div>{label('Description')}<textarea value={company.description ?? ''} onChange={e => setCompany(p => ({...p, description: e.target.value}))} className={inp} rows={2}/></div>
              <div>{label('Address')}<input value={company.address_street ?? ''} onChange={e => setCompany(p => ({...p, address_street: e.target.value}))} className={inp}/></div>
              <div className="grid grid-cols-3 gap-3">
                <div>{label('Postal code')}<input value={company.address_postal_code ?? ''} onChange={e => setCompany(p => ({...p, address_postal_code: e.target.value}))} className={inp}/></div>
                <div className="col-span-2">{label('City')}<input value={company.address_city ?? ''} onChange={e => setCompany(p => ({...p, address_city: e.target.value}))} className={inp}/></div>
              </div>
            </div>

            {/* Legal fields — conditional by country */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Legal identifiers</p>
              {isIndonesian(company as Company) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>{label('NIB')}<input value={company.nib ?? ''} onChange={e => setCompany(p => ({...p, nib: e.target.value}))} className={inp} placeholder="Nomor Induk Berusaha"/></div>
                  <div>{label('NPWP')}<input value={company.npwp ?? ''} onChange={e => setCompany(p => ({...p, npwp: e.target.value}))} className={inp}/></div>
                </div>
              )}
              {isFrench(company as Company) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>{label('SIRET')}<input value={company.siret ?? ''} onChange={e => setCompany(p => ({...p, siret: e.target.value}))} className={inp}/></div>
                  <div>{label('N° TVA intra')}<input value={company.vat_number ?? ''} onChange={e => setCompany(p => ({...p, vat_number: e.target.value}))} className={inp}/></div>
                </div>
              )}
              {!isIndonesian(company as Company) && !isFrench(company as Company) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>{label('Registration number')}<input value={company.registration_number ?? ''} onChange={e => setCompany(p => ({...p, registration_number: e.target.value}))} className={inp}/></div>
                  <div>{label('Tax ID / VAT')}<input value={company.vat_number ?? ''} onChange={e => setCompany(p => ({...p, vat_number: e.target.value}))} className={inp}/></div>
                </div>
              )}
            </div>

            {/* Signing contact */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Legal signatory</p>
                <p className="text-xs text-zinc-400">Who will sign the Partnership Agreement?</p>
              </div>
              {contacts.length > 0 && (
                <div className="space-y-2">
                  {contacts.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setSigningContactId(c.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${signingContactId === c.id ? 'border-[#c8a96e] bg-[#c8a96e]/5' : 'border-zinc-100 hover:border-zinc-200'}`}>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                        {(c.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1918]">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-zinc-400">{c.job_title ?? 'No title'}{c.nationality ? ` · ${c.nationality}` : ''}</p>
                      </div>
                      {signingContactId === c.id && <span className="text-[#c8a96e]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowNewContact(!showNewContact)}
                className="w-full py-2.5 border border-dashed border-zinc-200 rounded-xl text-sm text-zinc-500 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors">
                + Add another signatory
              </button>

              {showNewContact && (
                <form onSubmit={handleSaveContact} className="space-y-3 pt-2 border-t border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-600">New signatory contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{label('First name', true)}<input required value={newContact.first_name ?? ''} onChange={e => setNewContact(p => ({...p, first_name: e.target.value}))} className={inp}/></div>
                    <div>{label('Last name', true)}<input required value={newContact.last_name ?? ''} onChange={e => setNewContact(p => ({...p, last_name: e.target.value}))} className={inp}/></div>
                  </div>
                  <div>{label('Job title / Role')}<input value={newContact.job_title ?? ''} onChange={e => setNewContact(p => ({...p, job_title: e.target.value}))} className={inp} placeholder="CEO, Director…"/></div>
                  <div>{label('Email')}<input type="email" value={newContact.email ?? ''} onChange={e => setNewContact(p => ({...p, email: e.target.value}))} className={inp}/></div>
                  <div>{label('Nationality', true)}<input required value={newContact.nationality ?? ''} onChange={e => setNewContact(p => ({...p, nationality: e.target.value}))} className={inp} placeholder="French, Indonesian…"/></div>
                  {currentVariant !== 'A' && (
                    <>
                      <div>{label('Date of birth')}<input type="date" value={newContact.date_of_birth ?? ''} onChange={e => setNewContact(p => ({...p, date_of_birth: e.target.value}))} className={inp}/></div>
                      <div>{label('Place of birth')}<input value={newContact.place_of_birth ?? ''} onChange={e => setNewContact(p => ({...p, place_of_birth: e.target.value}))} className={inp}/></div>
                      <div>
                        {label('ID type')}
                        <select value={newContact.id_type ?? ''} onChange={e => setNewContact(p => ({...p, id_type: e.target.value}))} className={inp}>
                          <option value="">— Select —</option>
                          <option value="passport">Passport (foreign)</option>
                          <option value="ktp">KTP (Indonesian)</option>
                        </select>
                      </div>
                      <div>{label('ID number')}<input value={newContact.id_number ?? ''} onChange={e => setNewContact(p => ({...p, id_number: e.target.value}))} className={inp}/></div>
                    </>
                  )}
                  <button type="submit" disabled={savingContact}
                    className="w-full py-2.5 bg-[#c8a96e] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {savingContact ? 'Saving…' : 'Save signatory'}
                  </button>
                </form>
              )}
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-4 bg-[#c8a96e] text-white font-bold rounded-2xl hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : saved ? '✅ Saved — Agreement tab unlocked' : 'Save & unlock Agreement →'}
            </button>
          </form>
        )}

        {/* ── AGREEMENT TAB ── */}
        {tab === 'agreement' && data.agreement_unlocked && (
          <div className="space-y-4">
            <div className={`border rounded-2xl p-4 flex items-start gap-3 ${vInfo.color}`}>
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-semibold">Partnership Agreement — Variant {currentVariant}</p>
                <p className="text-xs mt-0.5 opacity-80">{vInfo.label}</p>
                {internName && <p className="text-xs font-medium mt-1">Intern: {internName}</p>}
              </div>
            </div>

            {data.contract_signed ? (
              <div className="bg-white border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <h2 className="text-lg font-bold text-[#1a1918] mb-1">Partnership Agreement signed</h2>
                {data.access.sponsor_contract_signed_at && (
                  <p className="text-sm text-zinc-500">
                    {new Date(data.access.sponsor_contract_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {data.access.sponsor_contract_signed_by ? ` by ${data.access.sponsor_contract_signed_by}` : ''}
                  </p>
                )}
                {data.access.sponsor_contract_signature_data && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.access.sponsor_contract_signature_data} alt="sig"
                      className="max-h-14 max-w-[180px] object-contain border border-zinc-100 rounded p-1.5 bg-white"/>
                  </div>
                )}
                <button onClick={() => setTab('intern')}
                  className="mt-4 px-6 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl hover:bg-[#b8945a]">
                  View intern details →
                </button>
              </div>
            ) : (
              <>
                {/* Document preview */}
                <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Partnership Agreement + Annex I Mission Letter</p>
                    <button onClick={loadTemplate} className="text-xs text-[#c8a96e] hover:underline">↺ Reload</button>
                  </div>
                  {templateLoading
                    ? <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Loading document…</div>
                    : templateHtml
                      ? <iframe srcDoc={templateHtml} className="w-full h-[600px]" sandbox="allow-same-origin" title="Partnership Agreement"/>
                      : <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Could not load preview</div>
                  }
                </div>

                {/* Signature block */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Sign the agreement</p>
                  {signingContact && (
                    <p className="text-xs text-zinc-500 mb-4">
                      Signing as <strong>{signingContact.first_name} {signingContact.last_name}</strong>
                      {signingContact.job_title ? ` — ${signingContact.job_title}` : ''}
                      {' '}on behalf of <strong>{co.name}</strong>
                      {internName ? ` for intern ${internName}` : ''}.
                    </p>
                  )}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden mb-3 bg-[#faf9f7]">
                    <canvas ref={canvasRef} width={540} height={150} className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={clearSig}
                      className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500 hover:bg-zinc-50">
                      Clear
                    </button>
                    <button type="button" onClick={handleSign} disabled={!sigData || signing}
                      className="flex-1 py-2.5 bg-[#c8a96e] text-white text-sm font-bold rounded-xl hover:bg-[#b8945a] disabled:opacity-40">
                      {signing ? 'Signing…' : 'Sign Agreement →'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-3 text-center">
                    By signing, you confirm all terms of the Partnership Agreement and Mission Letter.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── INTERN TAB (post-signature) ── */}
        {tab === 'intern' && data.contract_signed && data.case && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">🎓 Your intern — {internName}</p>
              {intern && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">Nationality</span><span className="font-medium">{intern.nationality ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Passport</span><span className="font-mono text-xs">{intern.passport_number ?? '—'}</span></div>
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">What happens next</p>
              <div className="space-y-3">
                {[
                  { icon: '🛂', step: 'Visa processing', desc: 'PT Bintang Beruntung Indonesia is now processing the intern visa application. You will be notified when the visa is approved.' },
                  { icon: '✈️', step: 'Arrival', desc: 'Once the visa is received, the intern will book their flight. We will share arrival details with you 2 weeks before.' },
                  { icon: '👋', step: 'Welcome', desc: 'Our team will brief the intern on the first day. We stay available throughout the internship for both parties.' },
                  { icon: '📩', step: 'Questions?', desc: 'Reply to the email you received or reach out to your Bali Interns contact directly.' },
                ].map(({ icon, step, desc }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div><p className="text-sm font-semibold text-[#1a1918]">{step}</p><p className="text-xs text-zinc-400 mt-0.5">{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {data.manager && (
              <div className="bg-[#1a1918] rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Your Bali Interns contact</p>
                  <p className="text-white font-semibold">{data.manager.first_name} {data.manager.last_name}</p>
                  {data.manager.email && <p className="text-zinc-400 text-xs mt-0.5">{data.manager.email}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {data.manager.whatsapp && (
                    <a href={`https://wa.me/${data.manager.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl">💬 WhatsApp</a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 py-8 mt-4 border-t border-zinc-100">
        <p>Bali Interns · <a href="mailto:team@bali-interns.com" className="text-[#c8a96e]">team@bali-interns.com</a></p>
        <p className="mt-1">Canggu, Bali, Indonesia</p>
      </footer>
    </div>
  )
}
