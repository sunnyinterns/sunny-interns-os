'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { SignaturePad } from '@/components/portal/SignaturePad'

const PARTNERSHIP_TEMPLATES = {
  A: { id: '25ac4ac0-4f9a-487e-9c08-0546de0c389c', label: 'Foreign company / Foreign director', desc: 'No KTP required' },
  B: { id: 'f13936c2-8c4a-4a7e-9504-b434a62ba63b', label: 'Indonesian company / Foreign director', desc: 'NIB + NPWP, no KTP' },
  C: { id: 'e4dc2c5f-b4d1-422f-a528-a60fa2355039', label: 'Indonesian company / Indonesian director', desc: 'Full KTP + legal deed' },
} as const
type PartnershipVariant = keyof typeof PARTNERSHIP_TEMPLATES

type Company = {
  id: string; name: string; description: string | null; website: string | null
  nib: string | null; npwp: string | null; siret: string | null
  address_street: string | null; address_postal_code: string | null; address_city: string | null
  info_validated_by_contact: boolean | null
}
type Contact = { first_name: string | null; last_name: string | null; job_title: string | null; email: string | null }
type Job = { id: string; public_title: string | null; title: string | null; wished_duration_months: number | null; location: string | null; description: string | null }
type Data = {
  access: {
    company_info_validated: boolean | null; companies: Company; contacts: Contact | null
    sponsor_contract_signed_at?: string | null; sponsor_contract_signed_by?: string | null
    sponsor_contract_signature_data?: string | null
  }
  jobs: Job[]
}

const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

export default function EmployerPortal() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'infos' | 'contrat' | 'offres'>('infos')
  // Contract
  const [contractSigned, setContractSigned] = useState(false)
  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null)
  const [contractSignedBy, setContractSignedBy] = useState<string | null>(null)
  const [contractSignatureData, setContractSignatureData] = useState<string | null>(null)
  const [contractCorrections, setContractCorrections] = useState<Partial<Company>>({})
  const [signingContract, setSigningContract] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)
  const [partnershipVariant, setPartnershipVariant] = useState<PartnershipVariant>('A')
  const [templateHtml, setTemplateHtml] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetch(`/api/portal/employer/${token}`).then(r => r.json())
      .then((d: Data & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setForm({ ...d.access.companies })
        setContractCorrections({ name: d.access.companies.name, nib: d.access.companies.nib ?? '', npwp: d.access.companies.npwp ?? '', siret: d.access.companies.siret ?? '', address_street: d.access.companies.address_street ?? '' })
        if (d.access.sponsor_contract_signed_at) {
          setContractSigned(true)
          setContractSignedAt(d.access.sponsor_contract_signed_at)
          setContractSignedBy(d.access.sponsor_contract_signed_by ?? null)
          setContractSignatureData(d.access.sponsor_contract_signature_data ?? null)
        }
        setLoading(false)
      }).catch(() => { setError('Network error'); setLoading(false) })
  }, [token])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const r = await fetch(`/api/portal/employer/${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 4000) }
    setSaving(false)
  }

  const loadTemplate = useCallback(async (variant: PartnershipVariant) => {
    setTemplateLoading(true); setTemplateHtml(null)
    try {
      const r = await fetch(`/api/templates/${PARTNERSHIP_TEMPLATES[variant].id}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true, portalToken: token }),
      })
      if (r.ok) setTemplateHtml(await r.text())
    } catch { /* ignore */ }
    setTemplateLoading(false)
  }, [token])

  function handleVariantChange(v: PartnershipVariant) {
    setPartnershipVariant(v)
    if (showPreview) void loadTemplate(v)
  }

  async function handleSignContract(sigData: string) {
    setSigningContract(true); setContractError(null)
    try {
      const r = await fetch(`/api/portal/employer/${token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign_contract', signature_data: sigData, company_corrections: contractCorrections, partnership_variant: partnershipVariant }),
      })
      if (!r.ok) throw new Error('Signing failed')
      const acc = data?.access
      setContractSigned(true)
      setContractSignedAt(new Date().toISOString())
      setContractSignedBy([acc?.contacts?.first_name, acc?.contacts?.last_name].filter(Boolean).join(' ') || 'Director')
      setContractSignatureData(sigData)
    } catch (err) { setContractError(err instanceof Error ? err.message : 'Error') }
    finally { setSigningContract(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" /></div>
  if (error || !data) return <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center"><div className="text-center"><p className="text-5xl mb-4">🔗</p><p className="font-bold text-[#1a1918]">Invalid link</p><p className="text-sm text-zinc-400 mt-1">{error}</p></div></div>

  const co = data.access.companies
  const ct = data.access.contacts
  const validated = data.access.company_info_validated

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8a96e] flex items-center justify-center"><span className="text-white font-bold text-sm">SI</span></div>
            <div><p className="text-sm font-bold text-[#1a1918]">{co.name}</p><p className="text-xs text-zinc-400">Partner portal</p></div>
          </div>
          <div className="flex items-center gap-2">
            {contractSigned && <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">📝 Agreement signed</span>}
            {validated && <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">✅ Validated</span>}
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex border-t border-zinc-50">
          {(['infos', 'contrat', 'offres'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500'}`}>
              {t === 'infos' ? `Info${validated ? ' ✅' : ''}` : t === 'contrat' ? `Agreement${contractSigned ? ' ✅' : ''}` : `Jobs (${data.jobs.length})`}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {tab === 'infos' && (
          <form onSubmit={save} className="space-y-4">
            {ct && (
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Your Sunny Interns contact</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#c8a96e]/10 flex items-center justify-center"><span className="text-[#c8a96e] font-bold">{(ct.first_name?.[0] ?? '?').toUpperCase()}</span></div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1918]">{ct.first_name} {ct.last_name}</p>
                    {ct.job_title && <p className="text-xs text-zinc-400">{ct.job_title}</p>}
                    {ct.email && <a href={`mailto:${ct.email}`} className="text-xs text-[#c8a96e]">{ct.email}</a>}
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Company</p>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Name *</label><input required value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Website</label><input type="url" value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inp} placeholder="https://…" /></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Description</label><textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} rows={3} /></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Address</label><input value={form.address_street ?? ''} onChange={e => setForm(f => ({ ...f, address_street: e.target.value }))} className={inp} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">Postal code</label><input value={form.address_postal_code ?? ''} onChange={e => setForm(f => ({ ...f, address_postal_code: e.target.value }))} className={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-zinc-600 mb-1">City</label><input value={form.address_city ?? ''} onChange={e => setForm(f => ({ ...f, address_city: e.target.value }))} className={inp} /></div>
              </div>
            </div>
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Legal</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label><input value={form.nib ?? ''} onChange={e => setForm(f => ({ ...f, nib: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label><input value={form.npwp ?? ''} onChange={e => setForm(f => ({ ...f, npwp: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label><input value={form.siret ?? ''} onChange={e => setForm(f => ({ ...f, siret: e.target.value }))} className={inp} /></div>
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full py-4 bg-[#c8a96e] text-white font-bold rounded-2xl hover:bg-[#b8945a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : saved ? '✅ Information saved!' : 'Save my information'}
            </button>
          </form>
        )}

        {tab === 'contrat' && (
          <div className="space-y-4">
            {contractSigned ? (
              <div className="bg-white border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <h2 className="text-lg font-bold text-[#1a1918] mb-1">Partnership Agreement signed</h2>
                {contractSignedAt && <p className="text-sm text-zinc-500 mb-1">Signed on {new Date(contractSignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{contractSignedBy ? ` by ${contractSignedBy}` : ''}</p>}
                {contractSignatureData && <div className="mt-4 flex flex-col items-center gap-2"><p className="text-xs text-zinc-400">Signature:</p>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={contractSignatureData} alt="sig" className="max-h-16 max-w-[200px] object-contain border border-zinc-200 rounded-lg p-2 bg-white" /></div>}
              </div>
            ) : (
              <>
                {/* Step 1 — Variant selector */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Step 1 — Company type</p>
                  <div className="space-y-2">
                    {(Object.entries(PARTNERSHIP_TEMPLATES) as [PartnershipVariant, (typeof PARTNERSHIP_TEMPLATES)[PartnershipVariant]][]).map(([key, t]) => (
                      <label key={key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${partnershipVariant === key ? 'border-[#c8a96e] bg-[#c8a96e]/5' : 'border-zinc-200 hover:border-zinc-300'}`}>
                        <input type="radio" name="variant" value={key} checked={partnershipVariant === key} onChange={() => handleVariantChange(key)} className="mt-0.5 accent-[#c8a96e]" />
                        <div><p className="text-sm font-semibold text-[#1a1918]">Variant {key} — {t.label}</p><p className="text-xs text-zinc-400">{t.desc}</p></div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => { setShowPreview(true); void loadTemplate(partnershipVariant) }} className="mt-4 w-full py-2.5 border border-[#c8a96e] text-[#c8a96e] text-sm font-semibold rounded-xl hover:bg-[#c8a96e]/5 transition-colors">
                    {showPreview ? '↺ Reload preview' : '👁 Preview the agreement'}
                  </button>
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Agreement Preview</p>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full">Variant {partnershipVariant}</span>
                    </div>
                    {templateLoading ? <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">Loading…</div>
                      : templateHtml ? <iframe srcDoc={templateHtml} className="w-full h-[500px]" sandbox="allow-same-origin" title="Partnership Agreement" />
                      : <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">Could not load preview</div>}
                  </div>
                )}

                {/* Step 2 — Company info verification */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Step 2 — Verify company information</p>
                  <p className="text-xs text-zinc-500">These details appear in the agreement.</p>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Company name</label><input value={contractCorrections.name ?? ''} onChange={e => setContractCorrections(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                  <div><label className="block text-xs font-medium text-zinc-600 mb-1">Address</label><input value={contractCorrections.address_street ?? ''} onChange={e => setContractCorrections(f => ({ ...f, address_street: e.target.value }))} className={inp} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label><input value={contractCorrections.nib ?? ''} onChange={e => setContractCorrections(f => ({ ...f, nib: e.target.value }))} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label><input value={contractCorrections.npwp ?? ''} onChange={e => setContractCorrections(f => ({ ...f, npwp: e.target.value }))} className={inp} /></div>
                    <div><label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label><input value={contractCorrections.siret ?? ''} onChange={e => setContractCorrections(f => ({ ...f, siret: e.target.value }))} className={inp} /></div>
                  </div>
                </div>

                {/* Step 3 — Signature */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Step 3 — Sign</p>
                  <p className="text-xs text-zinc-500 mb-4">By signing, {[ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'the director'} confirms agreement to all terms (Variant {partnershipVariant}) + Mission Letter.</p>
                  {contractError && <p className="text-red-600 text-sm mb-3">{contractError}</p>}
                  {signingContract ? <div className="text-center py-6 text-zinc-500 text-sm">Recording signature…</div>
                    : <SignaturePad onSign={(d) => { void handleSignContract(d) }} label={`${[ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'Director'} — ${co.name}`} disabled={signingContract} />}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'offres' && (
          <div className="space-y-3">
            {data.jobs.length === 0 && <div className="text-center py-12"><p className="text-3xl mb-2">📋</p><p className="text-sm text-zinc-400">No active jobs.</p></div>}
            {data.jobs.map(j => (
              <div key={j.id} className="bg-white border border-zinc-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-[#1a1918]">{j.public_title ?? j.title ?? 'Untitled'}</p>
                  <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-100 px-2 py-0.5 rounded-full ml-2">Open</span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-400">
                  {j.wished_duration_months && <span>⏱ {j.wished_duration_months} months</span>}
                  {j.location && <span>📍 {j.location}</span>}
                </div>
                {j.description && <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{j.description}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 py-8 mt-4 border-t border-zinc-100">
        <p>Questions? <a href="mailto:team@bali-interns.com" className="text-[#c8a96e]">team@bali-interns.com</a></p>
        <p className="mt-1">Sunny Interns · Canggu, Bali, Indonesia</p>
      </footer>
    </div>
  )
}
