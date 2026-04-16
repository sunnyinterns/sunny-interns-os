'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { SignaturePad } from '@/components/portal/SignaturePad'

type Company = {
  id: string; name: string; description: string | null; website: string | null
  nib: string | null; npwp: string | null; siret: string | null
  address_street: string | null; address_postal_code: string | null; address_city: string | null
  info_validated_by_contact: boolean | null
}
type Contact = { first_name: string | null; last_name: string | null; job_title: string | null; email: string | null }
type CaseInfo = { id: string; status: string; interns?: { first_name: string; last_name: string } | null }
type Data = {
  access: {
    company_info_validated: boolean | null
    companies: Company
    contacts: Contact | null
    sponsor_contract_signed_at?: string | null
    sponsor_contract_signed_by?: string | null
    sponsor_contract_signature_data?: string | null
  }
  case: CaseInfo | null
  variant: 'A' | 'B' | 'C'
  template_id: string
  agreement_unlocked: boolean
  contract_signed: boolean
}

const VARIANT_LABELS = {
  A: 'Foreign Company / Foreign Director',
  B: 'Indonesian Company / Foreign Director',
  C: 'Indonesian Company / Indonesian Director',
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
  const [tab, setTab] = useState<'infos' | 'agreement'>('infos')
  // Agreement state
  const [signingContract, setSigningContract] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)
  const [contractSigned, setContractSigned] = useState(false)
  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null)
  const [contractSignedBy, setContractSignedBy] = useState<string | null>(null)
  const [contractSignatureData, setContractSignatureData] = useState<string | null>(null)
  const [templateHtml, setTemplateHtml] = useState<string | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/portal/employer/${token}`).then(r => r.json())
      .then((d: Data & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setForm({ ...d.access.companies })
        setContractSigned(d.contract_signed)
        if (d.access.sponsor_contract_signed_at) {
          setContractSignedAt(d.access.sponsor_contract_signed_at)
          setContractSignedBy(d.access.sponsor_contract_signed_by ?? null)
          setContractSignatureData(d.access.sponsor_contract_signature_data ?? null)
        }
        setLoading(false)
      }).catch(() => { setError('Network error'); setLoading(false) })
  }, [token])

  const loadTemplate = useCallback(async (templateId: string, caseId: string | null) => {
    setTemplateLoading(true)
    setTemplateHtml(null)
    try {
      const r = await fetch(`/api/templates/${templateId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true, caseId }),
      })
      if (r.ok) setTemplateHtml(await r.text())
    } catch { /* ignore */ }
    setTemplateLoading(false)
  }, [])

  // Auto-load template when agreement tab opens
  useEffect(() => {
    if (tab === 'agreement' && data?.agreement_unlocked && !templateHtml && !contractSigned) {
      void loadTemplate(data.template_id, data.case?.id ?? null)
    }
  }, [tab, data, templateHtml, contractSigned, loadTemplate])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch(`/api/portal/employer/${token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
    // Refresh to get updated agreement_unlocked state
    const r = await fetch(`/api/portal/employer/${token}`)
    if (r.ok) {
      const d = await r.json() as Data
      setData(d)
    }
    setSaving(false)
  }

  async function handleSign(sigData: string) {
    setSigningContract(true); setContractError(null)
    try {
      const r = await fetch(`/api/portal/employer/${token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign_contract', signature_data: sigData }),
      })
      if (!r.ok) throw new Error('Signing failed')
      const ct = data?.access.contacts
      setContractSigned(true)
      setContractSignedAt(new Date().toISOString())
      setContractSignedBy([ct?.first_name, ct?.last_name].filter(Boolean).join(' '))
      setContractSignatureData(sigData)
    } catch (err) { setContractError(err instanceof Error ? err.message : 'Error') }
    finally { setSigningContract(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error || !data) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="text-center"><p className="text-5xl mb-4">🔗</p><p className="font-bold text-[#1a1918]">Invalid link</p><p className="text-sm text-zinc-400 mt-1">{error}</p></div>
    </div>
  )

  const co = data.access.companies
  const ct = data.access.contacts
  const intern = data.case?.interns
  const internName = intern ? `${intern.first_name} ${intern.last_name}` : null

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8a96e] flex items-center justify-center"><span className="text-white font-bold text-sm">SI</span></div>
            <div>
              <p className="text-sm font-bold text-[#1a1918]">{co.name}</p>
              <p className="text-xs text-zinc-400">
                Partner portal{internName ? ` · ${internName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contractSigned && <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">✅ Agreement signed</span>}
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex border-t border-zinc-50">
          <button onClick={() => setTab('infos')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'infos' ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500'}`}>
            Information{data.access.company_info_validated ? ' ✅' : ''}
          </button>
          {/* Agreement tab — only shown when company info validated */}
          {data.agreement_unlocked ? (
            <button onClick={() => setTab('agreement')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'agreement' ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500'}`}>
              Agreement{contractSigned ? ' ✅' : ''}
            </button>
          ) : (
            <div className="px-5 py-3 text-sm text-zinc-300 flex items-center gap-1.5 cursor-not-allowed" title="Complete your company information first">
              🔒 Agreement
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── INFO TAB ── */}
        {tab === 'infos' && (
          <form onSubmit={save} className="space-y-4">
            {/* Context banner */}
            {internName && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">🎓</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1918]">Internship placement — {internName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Please fill in your company details below. Once validated, you will be able to sign the Partnership Agreement for this intern.
                  </p>
                </div>
              </div>
            )}

            {/* Contact */}
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

            {/* Company */}
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
              {saving ? 'Saving…' : saved ? '✅ Saved — Agreement tab is now unlocked' : 'Save & unlock Agreement'}
            </button>
          </form>
        )}

        {/* ── AGREEMENT TAB ── */}
        {tab === 'agreement' && data.agreement_unlocked && (
          <div className="space-y-4">

            {/* Variant info banner (read-only, no choice) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-[#1a1918]">Partnership Agreement — Variant {data.variant}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{VARIANT_LABELS[data.variant]}</p>
                {internName && <p className="text-xs text-[#c8a96e] mt-1 font-medium">Intern: {internName}</p>}
              </div>
            </div>

            {contractSigned ? (
              <div className="bg-white border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <h2 className="text-lg font-bold text-[#1a1918] mb-1">Partnership Agreement signed</h2>
                {contractSignedAt && <p className="text-sm text-zinc-500 mb-1">Signed on {new Date(contractSignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{contractSignedBy ? ` by ${contractSignedBy}` : ''}</p>}
                {contractSignatureData && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-xs text-zinc-400">Signature:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={contractSignatureData} alt="sig" className="max-h-16 max-w-[200px] object-contain border border-zinc-200 rounded-lg p-2 bg-white" />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Document preview — auto-loaded */}
                <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Partnership Agreement + Mission Letter</p>
                    <button onClick={() => void loadTemplate(data.template_id, data.case?.id ?? null)}
                      className="text-xs text-[#c8a96e] hover:underline">↺ Reload</button>
                  </div>
                  {templateLoading ? (
                    <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Loading document…</div>
                  ) : templateHtml ? (
                    <iframe srcDoc={templateHtml} className="w-full h-[600px]" sandbox="allow-same-origin" title="Partnership Agreement" />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Could not load preview</div>
                  )}
                </div>

                {/* Signature */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Sign the agreement</p>
                  <p className="text-xs text-zinc-500 mb-4">
                    By signing, <strong>{[ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'the director'}</strong> confirms they have read and agreed to all terms of the Partnership Agreement and the attached Mission Letter{internName ? ` for intern ${internName}` : ''}.
                  </p>
                  {contractError && <p className="text-red-600 text-sm mb-3">{contractError}</p>}
                  {signingContract ? (
                    <div className="text-center py-6 text-zinc-500 text-sm">Recording signature…</div>
                  ) : (
                    <SignaturePad
                      onSign={(d) => { void handleSign(d) }}
                      label={`${[ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'Director'} — ${co.name}`}
                      disabled={signingContract}
                    />
                  )}
                </div>
              </>
            )}
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
