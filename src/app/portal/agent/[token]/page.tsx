'use client'

import { useEffect, useState, use } from 'react'
import { AgentLangToggle } from '@/components/portal/LangToggle'
import { ta, getAgentLang, type AgentLang } from '@/lib/i18n'

interface Intern {
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  nationalities: string | null
  passport_number: string | null
  passport_expiry: string | null
  passport_page4_url: string | null
  photo_id_url: string | null
  bank_statement_url: string | null
  return_plane_ticket_url: string | null
  mother_first_name: string | null
  mother_last_name: string | null
  school_name: string | null
  desired_start_date: string | null
  desired_end_date: string | null
}

interface Case {
  id: string
  status: string
  company_name?: string | null
  internship_city?: string | null
  convention_url?: string | null
  interns: Intern | null
  companies: { name: string | null; city: string | null } | null
  visa_types: { code: string; name: string } | null
  packages: { name: string; description: string | null } | null
}

interface Access {
  sent_at: string
  viewed_at: string | null
  agent_status?: string | null
  comments?: string | null
  received_at?: string | null
  cases?: Case | null
  case?: Case | null
  visa_agents: { company_name: string | null; name: string | null } | null
}

interface DossierResp {
  type: 'dossier'
  access: Access
}

interface AgentResp {
  type: 'agent'
  agent: { id: string; company_name: string | null; name: string | null }
  dossiers: Array<{ id: string; token: string; sent_at: string; viewed_at: string | null; cases: { id: string; status: string; interns: { first_name: string | null; last_name: string | null } | null } | null }>
}

type PortalData = DossierResp | AgentResp

export default function AgentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<PortalData | null>(null)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<AgentLang>('en')

  useEffect(() => {
    fetch(`/api/portal/agent/${token}`)
      .then(async r => {
        if (!r.ok) {
          setError('Lien invalide ou expiré')
          return null
        }
        return r.json()
      })
      .then((d: PortalData | null) => { if (d) setData(d) })
      .finally(() => setLoading(false))
    setLang(getAgentLang())
  }, [token])


  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    await fetch(`/api/portal/agent/${token}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_status: status,
        ...(status === 'received' ? { received_at: new Date().toISOString() } : {}),
      }),
    })
    setUpdatingStatus(false)
    window.location.reload()
  }

  async function saveComment() {
    setSavingComment(true)
    await fetch(`/api/portal/agent/${token}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: comment }),
    })
    setSavingComment(false)
  }

  if (loading) return <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center text-zinc-400">Chargement…</div>
  if (error || !data) return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-6">
      <div className="max-w-md bg-white border border-zinc-100 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="text-lg font-semibold text-[#1a1918] mb-2">Lien invalide ou expiré</h1>
        <p className="text-sm text-zinc-500">Contactez Bali Interns pour obtenir un nouvel accès.</p>
      </div>
    </div>
  )

  if (data.type === 'agent') {
    return (
      <div className="min-h-screen bg-[#fafaf7] p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <header className="bg-white border border-zinc-100 rounded-2xl p-6 mb-6">
            <p className="text-xs uppercase tracking-wider text-[#c8a96e] font-bold mb-1">Bali Interns — Portail Agent Visa</p>
            <h1 className="text-xl font-semibold text-[#1a1918]">{data.agent.company_name ?? data.agent.name}</h1>
          </header>
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#1a1918] uppercase tracking-wider mb-4">Dossiers récents</h2>
            {data.dossiers.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun dossier envoyé pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {data.dossiers.map(d => (
                  <a key={d.id} href={`/portal/agent/${d.token}`} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100">
                    <div>
                      <p className="text-sm font-medium text-[#1a1918]">{d.cases?.interns?.first_name} {d.cases?.interns?.last_name}</p>
                      <p className="text-xs text-zinc-500">Envoyé le {new Date(d.sent_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.viewed_at ? 'bg-green-100 text-[#0d9e75]' : 'bg-amber-100 text-amber-700'}`}>
                      {d.viewed_at ? 'Consulté' : 'Non consulté'}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const a = data.access
  const c = (a.case ?? a.cases) as Case | null
  const intern = c?.interns
  const agentName = a.visa_agents?.company_name ?? a.visa_agents?.name ?? '—'
  const fullName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim() || '—'

  // Si le dossier a été envoyé, tous les docs sont considérés validés côté agent
  const dossierSent = !!a.sent_at
  const docs = [
    { label: ta(lang, 'docPassport'), url: dossierSent ? (intern?.passport_page4_url ?? 'validated') : intern?.passport_page4_url },
    { label: ta(lang, 'docPhoto'), url: dossierSent ? (intern?.photo_id_url ?? 'validated') : intern?.photo_id_url },
    { label: ta(lang, 'docBank'), url: dossierSent ? (intern?.bank_statement_url ?? 'validated') : intern?.bank_statement_url },
    { label: ta(lang, 'docTicket'), url: dossierSent ? (intern?.return_plane_ticket_url ?? 'validated') : intern?.return_plane_ticket_url },
    { label: ta(lang, 'docConvention'), url: dossierSent ? (c?.convention_url ?? 'validated') : c?.convention_url ?? null },
  ]

  // Entreprise d'accueil depuis job_submissions
  const retainedJob = (c as Record<string, unknown> | null)
  const hostCompanyName = (retainedJob as Record<string, unknown> | null)?.company_name as string | null
    ?? ((retainedJob as Record<string, unknown> | null)?.companies as Record<string, unknown> | null)?.name as string | null
    ?? '—'
  const hostCity = (retainedJob as Record<string, unknown> | null)?.internship_city as string | null
    ?? ((retainedJob as Record<string, unknown> | null)?.companies as Record<string, unknown> | null)?.city as string | null
    ?? '—'

  return (
    <div className="min-h-screen bg-[#fafaf7] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <AgentLangToggle onLangChange={setLang} />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-[#0d9e75]">✅ {ta(lang, 'header')}</p>
          <p className="text-xs text-zinc-500 mt-1">{ta(lang, 'for')} {agentName}</p>
        </div>

        <header className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <p className="text-xs uppercase tracking-wider text-[#c8a96e] font-bold mb-1">{ta(lang, 'visaDossier')}</p>
          <h1 className="text-xl font-semibold text-[#1a1918]">{fullName}</h1>
          {c?.visa_types && <p className="text-sm text-zinc-500 mt-1">{c.visa_types.code} — {c.visa_types.name}</p>}
        </header>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{ta(lang, 'sectionPersonal')}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label={ta(lang, 'firstName')} value={intern?.first_name} />
            <Field label={ta(lang, 'lastName')} value={intern?.last_name} />
            <Field label={ta(lang, 'nationality')} value={Array.isArray(intern?.nationalities) ? intern.nationalities[0] : intern?.nationalities} />
            <Field label={ta(lang, 'dob')} value={intern?.birth_date} />
            <Field label={ta(lang, 'passportNo')} value={intern?.passport_number} />
            <Field label={ta(lang, 'passportExpiry')} value={intern?.passport_expiry} />
            <Field label={ta(lang, 'motherFirst')} value={intern?.mother_first_name} />
            <Field label={ta(lang, 'motherLast')} value={intern?.mother_last_name} />
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{ta(lang, 'sectionInternship')}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label={ta(lang, 'school')} value={intern?.school_name} />
            <Field label={ta(lang, 'hostCompany')} value={hostCompanyName} />
            <Field label={ta(lang, 'city')} value={hostCity} />
            <Field label={ta(lang, 'startDate')} value={intern?.desired_start_date ?? (c as Record<string, unknown> | null)?.desired_start_date as string | null} />
            <Field label={ta(lang, 'endDate')} value={intern?.desired_end_date ?? (c as Record<string, unknown> | null)?.actual_end_date as string | null} />
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Documents</h2>
          <div className="space-y-2">
            {docs.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span>{d.url ? '✅' : '❌'}</span>
                  <p className="text-sm text-[#1a1918]">{d.label}</p>
                </div>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">Download →</a>
                ) : (
                  <span className="text-xs text-zinc-400">Missing</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{ta(lang, 'sectionStatus')}</h2>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              a.agent_status === 'received' ? 'bg-green-50 text-green-700' :
              a.agent_status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
              a.agent_status === 'completed' ? 'bg-[#c8a96e]/10 text-[#c8a96e]' :
              a.agent_status === 'issue' ? 'bg-red-50 text-red-600' :
              'bg-zinc-100 text-zinc-500'
            }`}>
              {a.agent_status === 'received' ? ta(lang, 'received') :
               a.agent_status === 'in_progress' ? ta(lang, 'inProgress') :
               a.agent_status === 'completed' ? ta(lang, 'completed') :
               a.agent_status === 'issue' ? ta(lang, 'issue') :
               ta(lang, 'pending')}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(!a.agent_status || a.agent_status === 'pending') && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('received')}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 disabled:opacity-50">
                ✅ Mark as received
              </button>
            )}
            {a.agent_status === 'received' && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('in_progress')}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 disabled:opacity-50">
                ⏳ Mark in progress
              </button>
            )}
            {a.agent_status === 'in_progress' && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('completed')}
                className="text-xs px-3 py-1.5 bg-[#c8a96e]/10 text-[#c8a96e] rounded-lg border border-[#c8a96e]/30 hover:bg-[#c8a96e]/20 disabled:opacity-50">
                🎉 Mark as completed
              </button>
            )}
            <button disabled={updatingStatus} onClick={() => void updateStatus('issue')}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50">
              ⚠️ Report an issue
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-zinc-600 mb-1">Message to Bali Interns</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Missing document, incorrect information, additional request..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] min-h-[80px]"
            />
            <button disabled={savingComment} onClick={() => void saveComment()}
              className="mt-2 px-4 py-2 bg-[#c8a96e] text-white text-sm rounded-xl disabled:opacity-40 hover:bg-[#b8945a]">
              {savingComment ? ta(lang, 'sending') : ta(lang, 'send')}
            </button>
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{ta(lang, 'sectionContact')}</h2>
          <p className="text-sm text-zinc-700">📧 team@bali-interns.com</p>
          <a href="https://wa.me/33643487736" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-[#25D366] text-white text-sm rounded-xl font-medium hover:bg-[#1ebe5d]">
            💬 WhatsApp Bali Interns
          </a>
        </section>

        <footer className="text-center text-xs text-zinc-400 py-6">
          Confidential document — Sunny Interns · {new Date().toLocaleDateString('en-GB')}
        </footer>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-[#1a1918]">{value || '—'}</p>
    </div>
  )
}
