'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SignaturePad } from '@/components/portal/SignaturePad'

type Company = {
  id: string
  name: string
  description: string | null
  website: string | null
  nib: string | null
  npwp: string | null
  siret: string | null
  address_street: string | null
  address_postal_code: string | null
  address_city: string | null
  info_validated_by_contact: boolean | null
}
type Contact = { first_name: string | null; last_name: string | null; job_title: string | null; email: string | null }
type Job = { id: string; public_title: string | null; title: string | null; wished_duration_months: number | null; location: string | null; description: string | null }
type ContractData = {
  sponsor_contract_signed_at?: string | null
  sponsor_contract_signed_by?: string | null
  sponsor_contract_signature_data?: string | null
}
type Data = {
  access: { company_info_validated: boolean | null; companies: Company; contacts: Contact | null } & ContractData
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

  // Contrat state
  const [contractSigned, setContractSigned] = useState(false)
  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null)
  const [contractSignedBy, setContractSignedBy] = useState<string | null>(null)
  const [contractSignatureData, setContractSignatureData] = useState<string | null>(null)
  const [contractCorrections, setContractCorrections] = useState<Partial<Company>>({})
  const [signingContract, setSigningContract] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/portal/employer/${token}`)
      .then(r => r.json())
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
      })
      .catch(() => { setError('Erreur réseau'); setLoading(false) })
  }, [token])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const r = await fetch(`/api/portal/employer/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 4000) }
    setSaving(false)
  }

  async function handleSignContract(signatureData: string) {
    setSigningContract(true)
    setContractError(null)
    try {
      const r = await fetch(`/api/portal/employer/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign_contract',
          signature_data: signatureData,
          company_corrections: contractCorrections,
        }),
      })
      if (!r.ok) throw new Error('Erreur lors de la signature')
      const ct = data?.access.contacts
      const signedBy = [ct?.first_name, ct?.last_name].filter(Boolean).join(' ') || 'Inconnu'
      setContractSigned(true)
      setContractSignedAt(new Date().toISOString())
      setContractSignedBy(signedBy)
      setContractSignatureData(signatureData)
    } catch (err) {
      setContractError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSigningContract(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🔗</p>
        <p className="font-bold text-[#1a1918]">Lien invalide</p>
        <p className="text-sm text-zinc-400 mt-1">{error}</p>
      </div>
    </div>
  )

  const co = data.access.companies
  const ct = data.access.contacts
  const validated = data.access.company_info_validated

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8a96e] flex items-center justify-center">
              <span className="text-white font-bold text-sm">SI</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1918]">{co.name}</p>
              <p className="text-xs text-zinc-400">Espace partenaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contractSigned && (
              <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">📝 Contrat signé</span>
            )}
            {validated && (
              <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-200 px-2.5 py-1 rounded-full">✅ Validé</span>
            )}
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex border-t border-zinc-50">
          {(['infos', 'contrat', 'offres'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500'}`}
            >
              {t === 'infos' ? `Informations${validated ? ' ✅' : ''}` : t === 'contrat' ? `Contrat${contractSigned ? ' ✅' : ''}` : `Offres (${data.jobs.length})`}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {tab === 'infos' && (
          <form onSubmit={save} className="space-y-4">
            {ct && (
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Votre contact Sunny Interns</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#c8a96e]/10 flex items-center justify-center">
                    <span className="text-[#c8a96e] font-bold">{(ct.first_name?.[0] ?? '?').toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1918]">{ct.first_name} {ct.last_name}</p>
                    {ct.job_title && <p className="text-xs text-zinc-400">{ct.job_title}</p>}
                    {ct.email && <a href={`mailto:${ct.email}`} className="text-xs text-[#c8a96e]">{ct.email}</a>}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Votre société</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                <input required value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Site web</label>
                <input type="url" value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inp} placeholder="https://…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse</label>
                  <input value={form.address_street ?? ''} onChange={e => setForm(f => ({ ...f, address_street: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Code postal</label>
                  <input value={form.address_postal_code ?? ''} onChange={e => setForm(f => ({ ...f, address_postal_code: e.target.value }))} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                  <input value={form.address_city ?? ''} onChange={e => setForm(f => ({ ...f, address_city: e.target.value }))} className={inp} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Légal</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                  <input value={form.nib ?? ''} onChange={e => setForm(f => ({ ...f, nib: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                  <input value={form.npwp ?? ''} onChange={e => setForm(f => ({ ...f, npwp: e.target.value }))} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label>
                  <input value={form.siret ?? ''} onChange={e => setForm(f => ({ ...f, siret: e.target.value }))} className={inp} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-[#c8a96e] text-white font-bold rounded-2xl hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement…' : saved ? '✅ Informations validées !' : 'Valider mes informations'}
            </button>
            <p className="text-center text-xs text-zinc-400 pb-2">En soumettant, vous confirmez l&apos;exactitude des informations.</p>
          </form>
        )}

        {tab === 'contrat' && (
          <div className="space-y-4">
            {contractSigned ? (
              <div className="bg-white border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <h2 className="text-lg font-bold text-[#1a1918] mb-1">Contrat Sponsor signé</h2>
                {contractSignedAt && (
                  <p className="text-sm text-zinc-500 mb-1">
                    Signé le {new Date(contractSignedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {contractSignedBy ? ` par ${contractSignedBy}` : ''}
                  </p>
                )}
                {contractSignatureData && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-xs text-zinc-400">Signature :</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={contractSignatureData} alt="signature" className="max-h-16 max-w-[200px] object-contain border border-zinc-200 rounded-lg p-2 bg-white" />
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Texte du contrat */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Contrat Sponsor — Sunny Interns</p>
                  <div className="text-sm text-zinc-700 leading-relaxed space-y-3">
                    <p>Entre <strong>Bali Interns</strong> (ci-après &quot;Sunny Interns&quot;) et <strong>{co.name}</strong> (ci-après &quot;l&apos;Entreprise&quot;),</p>
                    <p>Il est convenu ce qui suit :</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>L&apos;Entreprise accepte d&apos;accueillir un stagiaire mis à disposition par Sunny Interns pour une durée convenue.</li>
                      <li>L&apos;Entreprise s&apos;engage à fournir un encadrement professionnel et des missions en adéquation avec le profil du stagiaire.</li>
                      <li>L&apos;Entreprise s&apos;engage à informer Sunny Interns de toute difficulté ou incident dans les 48 heures.</li>
                      <li>Sunny Interns assure le suivi du stagiaire tout au long du stage et reste l&apos;interlocuteur principal.</li>
                      <li>Les conditions de rémunération, si applicable, sont définies dans la convention de stage.</li>
                    </ul>
                    <p className="text-xs text-zinc-400 mt-4">En signant ce contrat, l&apos;Entreprise confirme avoir lu et accepté les termes ci-dessus.</p>
                  </div>
                </div>

                {/* Corrections entreprise */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vérifier les informations entreprise</p>
                  <p className="text-xs text-zinc-500">Ces informations apparaîtront dans le contrat. Corrigez si nécessaire.</p>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de la société</label>
                    <input
                      value={contractCorrections.name ?? ''}
                      onChange={e => setContractCorrections(f => ({ ...f, name: e.target.value }))}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse</label>
                    <input
                      value={contractCorrections.address_street ?? ''}
                      onChange={e => setContractCorrections(f => ({ ...f, address_street: e.target.value }))}
                      className={inp}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">NIB</label>
                      <input value={contractCorrections.nib ?? ''} onChange={e => setContractCorrections(f => ({ ...f, nib: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">NPWP</label>
                      <input value={contractCorrections.npwp ?? ''} onChange={e => setContractCorrections(f => ({ ...f, npwp: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">SIRET</label>
                      <input value={contractCorrections.siret ?? ''} onChange={e => setContractCorrections(f => ({ ...f, siret: e.target.value }))} className={inp} />
                    </div>
                  </div>
                </div>

                {/* Signature */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Signature du contrat</p>
                  {contractError && <p className="text-red-600 text-sm mb-3">{contractError}</p>}
                  {signingContract ? (
                    <div className="text-center py-6 text-zinc-500 text-sm">Signature en cours…</div>
                  ) : (
                    <SignaturePad
                      onSign={(data) => { void handleSignContract(data) }}
                      label={`Signature — ${ct?.first_name ?? ''} ${ct?.last_name ?? ''}`}
                      disabled={signingContract}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'offres' && (
          <div className="space-y-3">
            {data.jobs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm text-zinc-400">Aucune offre active.</p>
              </div>
            )}
            {data.jobs.map(j => (
              <div key={j.id} className="bg-white border border-zinc-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-[#1a1918]">{j.public_title ?? j.title ?? 'Sans titre'}</p>
                  <span className="text-xs bg-green-50 text-[#0d9e75] border border-green-100 px-2 py-0.5 rounded-full ml-2">Ouverte</span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-400">
                  {j.wished_duration_months && <span>⏱ {j.wished_duration_months} mois</span>}
                  {j.location && <span>📍 {j.location}</span>}
                </div>
                {j.description && <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{j.description}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 py-8 mt-4 border-t border-zinc-100">
        <p>Questions ? <a href="mailto:team@bali-interns.com" className="text-[#c8a96e]">team@bali-interns.com</a></p>
        <p className="mt-1">Sunny Interns · Canggu, Bali, Indonesia</p>
      </footer>
    </div>
  )
}
