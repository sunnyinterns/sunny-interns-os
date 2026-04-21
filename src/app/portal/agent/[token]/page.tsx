'use client'

import { useEffect, useState, use } from 'react'

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

  const docs = [
    { label: 'Page identité passeport', url: intern?.passport_page4_url },
    { label: "Photo d'identité", url: intern?.photo_id_url },
    { label: 'Relevé bancaire', url: intern?.bank_statement_url },
    { label: 'Billet retour', url: intern?.return_plane_ticket_url },
    { label: 'Convention de stage', url: c?.convention_url ?? null },
  ]

  return (
    <div className="min-h-screen bg-[#fafaf7] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-[#0d9e75]">✅ Dossier envoyé par Bali Interns</p>
          <p className="text-xs text-zinc-500 mt-1">Destiné à {agentName}</p>
        </div>

        <header className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <p className="text-xs uppercase tracking-wider text-[#c8a96e] font-bold mb-1">Dossier visa</p>
          <h1 className="text-xl font-semibold text-[#1a1918]">{fullName}</h1>
          {c?.visa_types && <p className="text-sm text-zinc-500 mt-1">{c.visa_types.code} — {c.visa_types.name}</p>}
        </header>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Prénom" value={intern?.first_name} />
            <Field label="Nom" value={intern?.last_name} />
            <Field label="Nationalité" value={intern?.nationalities} />
            <Field label="Date de naissance" value={intern?.birth_date} />
            <Field label="N° passeport" value={intern?.passport_number} />
            <Field label="Expiration passeport" value={intern?.passport_expiry} />
            <Field label="Prénom mère" value={intern?.mother_first_name} />
            <Field label="Nom mère" value={intern?.mother_last_name} />
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Stage</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Établissement" value={intern?.school_name} />
            <Field label="Entreprise d'accueil" value={c?.company_name ?? c?.companies?.name} />
            <Field label="Ville du stage" value={c?.internship_city ?? c?.companies?.city} />
            <Field label="Arrivée prévue" value={intern?.desired_start_date} />
            <Field label="Fin de stage" value={intern?.desired_end_date} />
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
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">Télécharger →</a>
                ) : (
                  <span className="text-xs text-zinc-400">Manquant</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Statut + Actions agent */}
        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Statut du dossier</h2>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              a.agent_status === 'received' ? 'bg-green-50 text-green-700' :
              a.agent_status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
              a.agent_status === 'completed' ? 'bg-[#c8a96e]/10 text-[#c8a96e]' :
              a.agent_status === 'issue' ? 'bg-red-50 text-red-600' :
              'bg-zinc-100 text-zinc-500'
            }`}>
              {a.agent_status === 'received' ? '✅ Dossier reçu' :
               a.agent_status === 'in_progress' ? '⏳ En cours de traitement' :
               a.agent_status === 'completed' ? '🎉 Traitement terminé' :
               a.agent_status === 'issue' ? '⚠️ Problème signalé' :
               '📋 En attente de confirmation'}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(!a.agent_status || a.agent_status === 'pending') && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('received')}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 disabled:opacity-50">
                ✅ Marquer comme reçu
              </button>
            )}
            {a.agent_status === 'received' && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('in_progress')}
                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 disabled:opacity-50">
                ⏳ Mettre en cours
              </button>
            )}
            {a.agent_status === 'in_progress' && (
              <button disabled={updatingStatus} onClick={() => void updateStatus('completed')}
                className="text-xs px-3 py-1.5 bg-[#c8a96e]/10 text-[#c8a96e] rounded-lg border border-[#c8a96e]/30 hover:bg-[#c8a96e]/20 disabled:opacity-50">
                🎉 Marquer terminé
              </button>
            )}
            <button disabled={updatingStatus} onClick={() => void updateStatus('issue')}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50">
              ⚠️ Signaler un problème
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-zinc-600 mb-1">Message pour Bali Interns</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Document manquant, information incorrecte, demande complémentaire..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] min-h-[80px]"
            />
            <button disabled={savingComment} onClick={() => void saveComment()}
              className="mt-2 px-4 py-2 bg-[#c8a96e] text-white text-sm rounded-xl disabled:opacity-40 hover:bg-[#b8945a]">
              {savingComment ? 'Envoi…' : 'Envoyer le message'}
            </button>
          </div>
        </section>

        <section className="bg-white border border-zinc-100 rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Contact Bali Interns</h2>
          <p className="text-sm text-zinc-700">📧 team@bali-interns.com</p>
          <p className="text-sm text-zinc-700">💬 WhatsApp: +33 6 43 48 77 36</p>
        </section>

        <footer className="text-center text-xs text-zinc-400 py-6">
          Document confidentiel — Bali Interns · {new Date().toLocaleDateString('fr-FR')}
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
