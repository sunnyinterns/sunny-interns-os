'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface LegalDetails {
  director_name: string; director_nationality: string; director_id_type: 'ktp' | 'passport'
  director_dob: string; director_dob_place: string; director_id_number: string
  notary_name: string; deed_number: string; deed_date: string
  ahu_number: string; ahu_date: string
}

interface Sponsor {
  id: string; company_name: string; legal_type: string | null
  registration_number: string | null; nib: string | null; npwp: string | null
  address: string | null; city: string | null; country: string | null
  phone: string | null; website: string | null; logo_url: string | null
  contact_name: string | null; contact_role: string | null
  contact_email: string | null; contact_whatsapp: string | null
  notes: string | null; is_active: boolean
  signature_url: string | null; legal_details: LegalDetails | null
}

const EMPTY_LEGAL: LegalDetails = {
  director_name: '', director_nationality: 'Indonesian', director_id_type: 'ktp',
  director_dob: '', director_dob_place: '', director_id_number: '',
  notary_name: '', deed_number: '', deed_date: '', ahu_number: '', ahu_date: '',
}

const EMPTY = {
  company_name: '', legal_type: 'PT', registration_number: '', nib: '', npwp: '',
  address: '', city: 'Denpasar', country: 'Indonesia', phone: '', website: '', logo_url: '',
  contact_name: '', contact_role: 'Direktur Utama', contact_email: '', contact_whatsapp: '', notes: '',
}

const cls = "w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
const LEGAL_TYPES = ['PT', 'PT PMA', 'CV', 'Yayasan', 'UD', 'Foreign Entity']

// Completeness check for Variant C
function legalScore(legal: LegalDetails | null): { filled: number; total: number; missing: string[] } {
  if (!legal) return { filled: 0, total: 11, missing: ['All legal fields'] }
  const fields: [keyof LegalDetails, string][] = [
    ['director_name', 'Director name'], ['director_nationality', 'Nationality'],
    ['director_dob', 'Date of birth'], ['director_dob_place', 'Place of birth'],
    ['director_id_number', 'ID number (KTP/Passport)'],
    ['notary_name', 'Notary name'], ['deed_number', 'Deed number'], ['deed_date', 'Deed date'],
    ['ahu_number', 'AHU decision number'], ['ahu_date', 'AHU date'],
  ]
  const missing = fields.filter(([k]) => !legal[k]).map(([, label]) => label)
  return { filled: fields.length - missing.length, total: fields.length, missing }
}

export default function SponsorsPage() {
  const router = useRouter()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sponsor | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [legal, setLegal] = useState<LegalDetails>(EMPTY_LEGAL)
  const [signatureUrl, setSignatureUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [activeSection, setActiveSection] = useState<'company' | 'director' | 'legal'>('company')
  const sigInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/sponsors')
    if (r.ok) setSponsors(await r.json() as Sponsor[])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  function openCreate() {
    setEditing(null); setForm(EMPTY); setLegal(EMPTY_LEGAL)
    setSignatureUrl(''); setActiveSection('company'); setShowModal(true)
  }

  function openEdit(s: Sponsor) {
    setEditing(s)
    setForm({ company_name: s.company_name, legal_type: s.legal_type ?? 'PT', registration_number: s.registration_number ?? '', nib: s.nib ?? '', npwp: s.npwp ?? '', address: s.address ?? '', city: s.city ?? 'Denpasar', country: s.country ?? 'Indonesia', phone: s.phone ?? '', website: s.website ?? '', logo_url: s.logo_url ?? '', contact_name: s.contact_name ?? '', contact_role: s.contact_role ?? 'Direktur Utama', contact_email: s.contact_email ?? '', contact_whatsapp: s.contact_whatsapp ?? '', notes: s.notes ?? '' })
    setLegal(s.legal_details ?? { ...EMPTY_LEGAL, director_name: s.contact_name ?? '' })
    setSignatureUrl(s.signature_url ?? '')
    setActiveSection('company'); setShowModal(true)
  }

  async function uploadSignature(file: File) {
    setUploadingSignature(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bucket', 'signatures')
    fd.append('path', `sponsors/signature-${Date.now()}.${file.name.split('.').pop()}`)
    const r = await fetch('/api/upload', { method: 'POST', body: fd })
    if (r.ok) {
      const d = await r.json() as { url: string }
      setSignatureUrl(d.url)
    }
    setUploadingSignature(false)
  }

  async function handleSave() {
    setSaving(true)
    const body = {
      ...form,
      nib: form.nib || null, npwp: form.npwp || null,
      registration_number: form.registration_number || null,
      address: form.address || null, phone: form.phone || null,
      website: form.website || null, logo_url: form.logo_url || null,
      contact_name: legal.director_name || form.contact_name || null,
      contact_role: form.contact_role || null,
      contact_email: form.contact_email || null,
      contact_whatsapp: form.contact_whatsapp || null,
      notes: form.notes || null,
      legal_details: legal,
      signature_url: signatureUrl || null,
    }
    const r = await fetch(editing ? `/api/sponsors/${editing.id}` : '/api/sponsors', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) { setShowModal(false); void load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sponsor?')) return
    await fetch(`/api/sponsors/${id}`, { method: 'DELETE' })
    void load()
  }

  const score = legalScore(legal)
  const scoreColor = score.filled === score.total ? 'text-green-600' : score.filled >= 6 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700 mb-6 block">← Settings</button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1918]">🏛️ Visa Sponsors (PT)</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Indonesian PT entities — sponsor the internship visa (VITAS). Legal details feed Partnership Agreement contracts.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-xl hover:bg-[#b8945a]">+ Add sponsor</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-28 bg-zinc-100 rounded-2xl animate-pulse"/>)}</div>
      ) : sponsors.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-2xl mb-3">🏛️</p>
          <p className="text-zinc-500 text-sm mb-4">No sponsor configured yet</p>
          <button onClick={openCreate} className="px-4 py-2 bg-[#c8a96e] text-white text-sm rounded-xl">+ Add first sponsor</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map(s => {
            const sc = legalScore(s.legal_details)
            const complete = sc.filled === sc.total
            return (
              <div key={s.id} className={`bg-white border rounded-2xl p-5 ${complete ? 'border-green-100' : 'border-zinc-100'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center font-bold text-[#c8a96e] text-xl flex-shrink-0">
                    {s.logo_url ? <img src={s.logo_url} alt="" className="w-12 h-12 object-contain rounded-xl"/> : s.company_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-[#1a1918]">{s.company_name}</p>
                      {s.legal_type && <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{s.legal_type}</span>}
                      {s.is_active && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">Active</span>}
                    </div>
                    <p className="text-xs text-zinc-400">{[s.address, s.city, s.country !== 'Indonesia' ? s.country : null].filter(Boolean).join(', ')}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {s.nib && <span className="text-[10px] bg-zinc-50 border border-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">NIB: {s.nib}</span>}
                      {s.npwp && <span className="text-[10px] bg-zinc-50 border border-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">NPWP: {s.npwp}</span>}
                    </div>
                    {/* Legal completeness */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${complete ? 'bg-green-400' : sc.filled >= 6 ? 'bg-amber-400' : 'bg-red-300'}`}
                          style={{ width: `${(sc.filled / sc.total) * 100}%` }}/>
                      </div>
                      <span className={`text-[10px] font-medium ${complete ? 'text-green-600' : sc.filled >= 6 ? 'text-amber-600' : 'text-red-400'}`}>
                        Legal {sc.filled}/{sc.total}
                      </span>
                      {s.signature_url && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">✍️ Signature</span>}
                    </div>
                    {!complete && sc.missing.length > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">Missing: {sc.missing.slice(0, 3).join(', ')}{sc.missing.length > 3 ? ` +${sc.missing.length - 3}` : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200">Edit</button>
                    <button onClick={() => void handleDelete(s.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-base text-[#1a1918]">{editing ? 'Edit sponsor' : 'New Visa Sponsor PT'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-lg">✕</button>
            </div>

            {/* Section tabs */}
            <div className="flex border-b border-zinc-100 flex-shrink-0">
              {(['company', 'director', 'legal'] as const).map(sec => (
                <button key={sec} onClick={() => setActiveSection(sec)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeSection === sec ? 'text-[#c8a96e] border-b-2 border-[#c8a96e]' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  {sec === 'company' ? '① Company' : sec === 'director' ? '② Director' : `③ Legal deed`}
                  {sec === 'legal' && <span className={`ml-1 ${scoreColor}`}>({score.filled}/{score.total})</span>}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* ── COMPANY ── */}
              {activeSection === 'company' && (
                <>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Company name *</label>
                    <input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className={cls} placeholder="PT Bintang Beruntung Indonesia"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Legal type</label>
                      <select value={form.legal_type} onChange={e => setForm(p => ({ ...p, legal_type: e.target.value }))} className={cls}>
                        {LEGAL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Registration no.</label>
                      <input value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} className={cls}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                      <input value={form.nib} onChange={e => setForm(p => ({ ...p, nib: e.target.value }))} className={cls} placeholder="Nomor Induk Berusaha"/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                      <input value={form.npwp} onChange={e => setForm(p => ({ ...p, npwp: e.target.value }))} className={cls}/>
                    </div>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Address</label>
                    <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={cls} rows={2} placeholder="Jl. Raya Sesetan Gg. Tamansari, Denpasar, Bali"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">City</label>
                      <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={cls}/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Country</label>
                      <input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className={cls}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Phone</label>
                      <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={cls} placeholder="+62…"/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                      <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className={cls}/>
                    </div>
                  </div>
                </>
              )}

              {/* ── DIRECTOR ── */}
              {activeSection === 'director' && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    ⚠️ These fields appear directly in the Partnership Agreement (Variant B & C). Fill carefully.
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Full name (as on ID)</label>
                    <input value={legal.director_name} onChange={e => setLegal(p => ({ ...p, director_name: e.target.value }))} className={cls} placeholder="Muhammad Fauzan Najmi, S.Kom., A.Md.Ling"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Nationality</label>
                      <input value={legal.director_nationality} onChange={e => setLegal(p => ({ ...p, director_nationality: e.target.value }))} className={cls} placeholder="Indonesian"/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">ID type</label>
                      <select value={legal.director_id_type} onChange={e => setLegal(p => ({ ...p, director_id_type: e.target.value as 'ktp' | 'passport' }))} className={cls}>
                        <option value="ktp">KTP (Indonesian resident)</option>
                        <option value="passport">Passport (foreign)</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">ID number ({legal.director_id_type === 'ktp' ? 'KTP' : 'Passport'})</label>
                    <input value={legal.director_id_number} onChange={e => setLegal(p => ({ ...p, director_id_number: e.target.value }))} className={cls} placeholder="16-digit KTP or passport no."/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Date of birth</label>
                      <input type="date" value={legal.director_dob} onChange={e => setLegal(p => ({ ...p, director_dob: e.target.value }))} className={cls}/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Place of birth</label>
                      <input value={legal.director_dob_place} onChange={e => setLegal(p => ({ ...p, director_dob_place: e.target.value }))} className={cls} placeholder="Denpasar"/>
                    </div>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Role / Title</label>
                    <input value={form.contact_role} onChange={e => setForm(p => ({ ...p, contact_role: e.target.value }))} className={cls} placeholder="Direktur Utama / Main Director"/>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                    <input value={form.contact_whatsapp} onChange={e => setForm(p => ({ ...p, contact_whatsapp: e.target.value }))} className={cls} placeholder="+62…"/>
                  </div>

                  {/* Signature upload */}
                  <div className="border-t border-zinc-100 pt-4">
                    <label className="block text-xs font-medium text-zinc-600 mb-2">
                      Signature image <span className="text-zinc-400 font-normal">(PNG/JPG, appears on contracts)</span>
                    </label>
                    <input ref={sigInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadSignature(f) }}/>
                    {signatureUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signatureUrl} alt="signature" className="h-12 max-w-[180px] object-contain bg-white border border-zinc-200 rounded p-1"/>
                        <button onClick={() => setSignatureUrl('')} className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => sigInputRef.current?.click()} disabled={uploadingSignature}
                        className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors disabled:opacity-50">
                        {uploadingSignature ? 'Uploading…' : '📤 Upload signature image'}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── LEGAL DEED ── */}
              {activeSection === 'legal' && (
                <>
                  <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-500">
                    Required for <strong>Variant C</strong> (Indonesian company + Indonesian director). Used in the deed of establishment clause of the Partnership Agreement.
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Notary name</label>
                    <input value={legal.notary_name} onChange={e => setLegal(p => ({ ...p, notary_name: e.target.value }))} className={cls} placeholder="[Nama Notaris], S.H., M.Kn."/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Deed number</label>
                      <input value={legal.deed_number} onChange={e => setLegal(p => ({ ...p, deed_number: e.target.value }))} className={cls} placeholder="No. 01"/>
                    </div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">Deed date</label>
                      <input type="date" value={legal.deed_date} onChange={e => setLegal(p => ({ ...p, deed_date: e.target.value }))} className={cls}/>
                    </div>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">AHU decision number (Kemenkumham)</label>
                    <input value={legal.ahu_number} onChange={e => setLegal(p => ({ ...p, ahu_number: e.target.value }))} className={cls} placeholder="AHU-XXXXXXXX.AH.01.02.TAHUN XXXX"/>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">AHU decision date</label>
                    <input type="date" value={legal.ahu_date} onChange={e => setLegal(p => ({ ...p, ahu_date: e.target.value }))} className={cls}/>
                  </div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Internal notes</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={cls} rows={2}/>
                  </div>

                  {/* Score recap */}
                  {score.missing.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Still missing for Variant C:</p>
                      <ul className="text-xs text-amber-600 space-y-0.5">{score.missing.map(m => <li key={m}>· {m}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-5 pt-4 border-t border-zinc-100 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-500">Cancel</button>
              <button onClick={() => void handleSave()} disabled={saving || !form.company_name.trim()}
                className="flex-1 py-2.5 bg-[#c8a96e] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? '…' : editing ? 'Save changes' : 'Create sponsor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
