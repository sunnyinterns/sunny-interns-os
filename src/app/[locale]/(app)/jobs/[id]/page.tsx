'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
}

interface JobSubmission {
  id: string
  status: string
  cv_sent?: boolean | null
  intern_interested?: boolean | null
  cases?: {
    id: string
    interns?: { first_name: string; last_name: string } | null
  } | null
}

interface JobDetail {
  id: string
  title?: string | null
  public_title?: string | null
  description?: string | null
  public_description?: string | null
  wished_start_date?: string | null
  wished_duration_months?: number | null
  is_remote?: boolean | null
  status?: string | null
  notes?: string | null
  companies?: { id: string; name: string; contact_name?: string | null; contact_email?: string | null; contact_whatsapp?: string | null } | null
  contacts?: Contact | null
  job_departments?: { id: string; name: string } | null
  job_submissions?: JobSubmission[]
}

interface QualifiedCase {
  id: string
  interns?: { first_name: string; last_name: string } | null
  status: string
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche stagiaire' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Pourvu' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Annulé' },
}

const SUB_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  proposed: { bg: '#f3f4f6', color: '#374151', label: 'Proposé' },
  sent: { bg: '#fef3c7', color: '#92400e', label: 'CV envoyé' },
  submitted: { bg: '#fef3c7', color: '#92400e', label: 'Soumis' },
  interview: { bg: '#dbeafe', color: '#1e40af', label: 'Entretien' },
  retained: { bg: '#d1fae5', color: '#065f46', label: 'Retenu' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Annulé' },
}

const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string | boolean | number | null>>({})
  const [saving, setSaving] = useState(false)
  const [qualifiedCases, setQualifiedCases] = useState<QualifiedCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function load() {
    if (!id) return
    const res = await fetch(`/api/jobs/${id}`)
    if (res.ok) {
      const data = await res.json() as JobDetail
      setJob(data)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  useEffect(() => {
    fetch('/api/cases?status=qualification_done')
      .then(r => r.ok ? r.json() as Promise<QualifiedCase[]> : [])
      .then(d => setQualifiedCases(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  async function patchJob(patch: Record<string, unknown>) {
    if (!job) return
    setSaving(true)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { void load(); setEditing({}) }
    else showToast('Erreur lors de la sauvegarde')
    setSaving(false)
  }

  async function addCandidate() {
    if (!selectedCaseId || !job) return
    setAddingCandidate(true)
    const res = await fetch('/api/job-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: selectedCaseId, job_id: job.id }),
    })
    if (res.ok) { void load(); setSelectedCaseId(''); showToast('Candidat ajouté') }
    else showToast('Erreur lors de l\'ajout')
    setAddingCandidate(false)
  }

  async function updateSubmission(subId: string, status: string) {
    const res = await fetch(`/api/job-submissions/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { void load(); showToast(status === 'retained' ? 'Candidat retenu !' : 'Refusé') }
  }

  async function markStaffed() {
    await patchJob({ status: 'staffed' })
    showToast('Job marqué comme pourvu')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-[#dc2626]">Job introuvable</div>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE[job.status ?? 'open'] ?? STATUS_BADGE.open
  const displayTitle = job.public_title ?? job.title ?? 'Job sans titre'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toastMsg}
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push(`/${locale}/jobs`)} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 transition-colors">
        ← Retour aux jobs
      </button>

      {/* Header */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1a1918]">{displayTitle}</h1>
            {job.title && job.title !== displayTitle && (
              <p className="text-xs text-zinc-400 mt-0.5">Titre interne : {job.title}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
              {job.job_departments?.name && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-[#c8a96e] font-medium">{job.job_departments.name}</span>
              )}
              {job.is_remote && (
                <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">Remote</span>
              )}
            </div>
          </div>
          {job.companies?.name && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/15 flex items-center justify-center text-sm font-bold text-[#c8a96e] flex-shrink-0">
                {job.companies.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-[#1a1918]">{job.companies.name}</p>
            </div>
          )}
        </div>

        {/* Infos éditables inline */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Date démarrage</p>
            {editing.wished_start_date !== undefined ? (
              <div className="flex gap-1">
                <input type="date" className="flex-1 px-2 py-1 text-sm border border-[#c8a96e] rounded-lg" defaultValue={job.wished_start_date?.slice(0,10) ?? ''} onBlur={e => void patchJob({ wished_start_date: e.target.value || null })} autoFocus />
                <button onClick={() => setEditing({})} className="text-xs px-1 text-zinc-400">×</button>
              </div>
            ) : (
              <button onClick={() => setEditing(p => ({...p, wished_start_date: true}))} className="text-sm text-[#1a1918] hover:text-[#c8a96e] transition-colors">
                {job.wished_start_date ? new Date(job.wished_start_date).toLocaleDateString('fr-FR') : <span className="text-zinc-300 italic text-xs">Cliquer pour définir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Durée souhaitée</p>
            <button onClick={() => {
              const v = window.prompt('Durée en mois (1-6)', String(job.wished_duration_months ?? 4))
              if (v && !isNaN(Number(v))) void patchJob({ wished_duration_months: Number(v) })
            }} className="text-sm text-[#1a1918] hover:text-[#c8a96e] transition-colors">
              {job.wished_duration_months ? `${job.wished_duration_months} mois` : <span className="text-zinc-300 italic text-xs">Cliquer pour définir</span>}
            </button>
          </div>
        </div>

        {job.description && (
          <div className="mt-4 pt-3 border-t border-zinc-50">
            <p className="text-xs text-zinc-400 mb-1">Description interne</p>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {job.notes && (
          <div className="mt-3 pt-3 border-t border-zinc-50">
            <p className="text-xs text-zinc-400 mb-1">Notes internes</p>
            <p className="text-sm text-zinc-600 italic">{job.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-50 flex-wrap">
          {job.status === 'open' && (
            <button onClick={() => void markStaffed()} disabled={saving} className="px-3 py-1.5 text-sm font-medium bg-[#0d9e75] text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              ✓ Marquer comme pourvu
            </button>
          )}
          {job.status !== 'open' && (
            <button onClick={() => void patchJob({ status: 'open' })} disabled={saving} className="px-3 py-1.5 text-sm font-medium bg-zinc-100 text-[#1a1918] rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors">
              Rouvrir
            </button>
          )}
        </div>
      </div>

      {/* Section Contact employeur */}
      {job.contacts && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Contact employeur</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#1a1918]">{job.contacts.first_name} {job.contacts.last_name ?? ''}</p>
              {job.contacts.job_title && <p className="text-xs text-zinc-500 mt-0.5">{job.contacts.job_title}</p>}
              <div className="mt-2 space-y-1">
                {job.contacts.email && (
                  <a href={`mailto:${job.contacts.email}`} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-[#c8a96e] transition-colors">
                    <span>✉</span> {job.contacts.email}
                  </a>
                )}
                {job.contacts.whatsapp && (
                  <a href={`https://wa.me/${job.contacts.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-[#0d9e75] transition-colors">
                    <span>💬</span> {job.contacts.whatsapp}
                  </a>
                )}
              </div>
            </div>
            <Link href={`/${locale}/contacts/${job.contacts.id}`} className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors flex-shrink-0">
              Voir fiche →
            </Link>
          </div>
        </div>
      )}

      {/* Fallback: contact depuis companies si pas de contacts table */}
      {!job.contacts && job.companies?.contact_email && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Contact employeur</h2>
          <p className="text-sm font-medium">{job.companies.contact_name ?? ''}</p>
          <div className="mt-2 space-y-1">
            {job.companies.contact_email && (
              <a href={`mailto:${job.companies.contact_email}`}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-[#c8a96e] transition-colors">
                <span>✉</span> {job.companies.contact_email}
              </a>
            )}
            {job.companies.contact_whatsapp && (
              <a href={`https://wa.me/${job.companies.contact_whatsapp.replace(/\D/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-[#0d9e75] transition-colors">
                <span>💬</span> {job.companies.contact_whatsapp}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Section Candidats proposés */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#1a1918] mb-3">
          Candidats proposés <span className="text-zinc-400 font-normal">({(job.job_submissions ?? []).length})</span>
        </h2>

        {(job.job_submissions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Aucun candidat proposé pour ce job.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Candidat</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Statut</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Réponse candidat</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">CV envoyé</th>
                  <th className="text-left text-xs font-medium text-zinc-400 pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(job.job_submissions ?? []).map(sub => {
                  const subBadge = SUB_STATUS[sub.status] ?? { bg: '#f3f4f6', color: '#374151', label: sub.status }
                  const internName = sub.cases?.interns
                    ? `${sub.cases.interns.first_name} ${sub.cases.interns.last_name}`
                    : 'Candidat inconnu'
                  return (
                    <tr key={sub.id}>
                      <td className="py-2 pr-3">
                        {sub.cases?.id ? (
                          <Link href={`/${locale}/cases/${sub.cases.id}`} className="font-medium text-[#1a1918] hover:text-[#c8a96e] transition-colors">
                            {internName}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">{internName}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: subBadge.bg, color: subBadge.color }}>
                          {subBadge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {sub.intern_interested === true && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-[#0d9e75] font-medium">Intéressé !</span>}
                        {sub.intern_interested === false && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">Pas intéressé</span>}
                        {sub.intern_interested === null || sub.intern_interested === undefined ? <span className="text-xs text-zinc-300">—</span> : null}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs ${sub.cv_sent ? 'text-[#0d9e75]' : 'text-zinc-300'}`}>{sub.cv_sent ? '✓' : '—'}</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {sub.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => void updateSubmission(sub.id, 'retained')}
                                className="text-xs px-2 py-1 bg-green-100 text-[#0d9e75] rounded-lg hover:bg-green-200 font-medium transition-colors"
                              >
                                Retenu
                              </button>
                              <button
                                onClick={() => void updateSubmission(sub.id, 'rejected')}
                                className="text-xs px-2 py-1 bg-red-50 text-[#dc2626] rounded-lg hover:bg-red-100 font-medium transition-colors"
                              >
                                Refusé
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Ajouter un candidat */}
        <div className="mt-4 pt-4 border-t border-zinc-50">
          <p className="text-xs font-medium text-zinc-500 mb-2">Ajouter un candidat (qualification_done)</p>
          <div className="flex gap-2">
            <select
              value={selectedCaseId}
              onChange={e => setSelectedCaseId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            >
              <option value="">— Sélectionner un candidat —</option>
              {qualifiedCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : c.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => void addCandidate()}
              disabled={!selectedCaseId || addingCandidate}
              className="px-3 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
            >
              {addingCandidate ? 'Ajout…' : 'Proposer'}
            </button>
          </div>
        </div>
      </div>

      {/* Description publique */}
      {job.public_description && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-2">Description publique</h2>
          <p className="text-sm text-zinc-600 whitespace-pre-wrap">{job.public_description}</p>
        </div>
      )}
    </div>
  )
}
