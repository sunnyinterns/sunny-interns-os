'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Session {
  id: string
  session_label: string
  start_month: string | null
  start_date: string | null
  end_date: string | null
  duration_months: number | null
  expected_students: number | null
  actual_students: number
  notes: string | null
}

interface Program {
  id: string
  program_name: string
  level: string
  duration_months: number | null
  year: number | null
  is_active: boolean
  school_sessions?: Session[]
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

interface School {
  id: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  website: string | null
  phone: string | null
  address: string | null
  google_maps_url: string | null
  is_priority: boolean
  total_staffed_interns: number
  school_programs?: Program[]
  cases?: Case[]
}

type Tab = 'infos' | 'programmes' | 'sessions' | 'stagiaires' | 'enrichment'

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('infos')

  // Program modal
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [savingProgram, setSavingProgram] = useState(false)
  const [programForm, setProgramForm] = useState({ program_name: '', level: 'Bac+3', duration_months: '6', year: new Date().getFullYear() })

  // Session modal
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionProgramId, setSessionProgramId] = useState('')
  const [sessionForm, setSessionForm] = useState({ session_label: '', start_month: 'Janvier', start_date: '', end_date: '', duration_months: '6', expected_students: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/schools/${schoolId}`)
    if (res.ok) setSchool(await res.json())
    setLoading(false)
  }, [schoolId])

  useEffect(() => { void load() }, [load])

  async function handleAddProgram(e: React.FormEvent) {
    e.preventDefault()
    setSavingProgram(true)
    await fetch('/api/school-programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...programForm, school_id: schoolId, duration_months: Number(programForm.duration_months), year: Number(programForm.year) }),
    })
    setShowProgramModal(false)
    setSavingProgram(false)
    void load()
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    setSavingSession(true)
    await fetch('/api/school-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sessionForm,
        school_id: schoolId,
        program_id: sessionProgramId || null,
        duration_months: sessionForm.duration_months ? Number(sessionForm.duration_months) : null,
        expected_students: sessionForm.expected_students ? Number(sessionForm.expected_students) : null,
      }),
    })
    setShowSessionModal(false)
    setSavingSession(false)
    void load()
  }

  // Flatten all sessions across programs
  const allSessions = school?.school_programs?.flatMap(p =>
    (p.school_sessions ?? []).map(s => ({ ...s, program_name: p.program_name, level: p.level }))
  ) ?? []

  const MONTH_ORDER = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const enrichmentSessions = allSessions
    .filter(s => s.expected_students && s.expected_students > 0)
    .sort((a, b) => MONTH_ORDER.indexOf(a.start_month ?? '') - MONTH_ORDER.indexOf(b.start_month ?? ''))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!school) return (
    <div className="p-6 text-center text-zinc-400">
      <p>École introuvable.</p>
      <button onClick={() => router.push('/fr/schools')} className="mt-2 text-sm text-[#c8a96e] underline">Retour</button>
    </div>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'infos', label: 'Infos' },
    { key: 'programmes', label: `Programmes (${school.school_programs?.length ?? 0})` },
    { key: 'sessions', label: `Sessions (${allSessions.length})` },
    { key: 'stagiaires', label: `Stagiaires (${school.cases?.length ?? 0})` },
    { key: 'enrichment', label: 'Lead Enrichment' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.push('/fr/schools')} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 mb-5 transition-colors">
        ← Retour aux écoles
      </button>

      {/* Header */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[#1a1918]">{school.name}</h1>
              {school.is_priority && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#c8a96e]/20 text-[#c8a96e]">Prioritaire</span>
              )}
              {school.category && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">{school.category}</span>
              )}
            </div>
            <p className="text-sm text-zinc-500">{[school.city, school.country].filter(Boolean).join(', ')}</p>
            {school.website && (
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c8a96e] hover:underline mt-1 inline-block">{school.website}</a>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#1a1918]">{school.total_staffed_interns}</p>
            <p className="text-xs text-zinc-500">stagiaires</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-100 mb-5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap', activeTab === tab.key ? 'text-[#c8a96e] border-b-2 border-[#c8a96e]' : 'text-zinc-500 hover:text-[#1a1918]'].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Infos */}
      {activeTab === 'infos' && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-3">
          {[
            { label: 'Nom', value: school.name },
            { label: 'Ville', value: school.city },
            { label: 'Pays', value: school.country },
            { label: 'Catégorie', value: school.category },
            { label: 'Téléphone', value: school.phone },
            { label: 'Adresse', value: school.address },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-28 flex-shrink-0">{label}</span>
              <span className="text-sm text-[#1a1918]">{value}</span>
            </div>
          ) : null)}
          {school.google_maps_url && (
            <a href={school.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c8a96e] hover:underline">Voir sur Google Maps</a>
          )}
        </div>
      )}

      {/* Tab: Programmes */}
      {activeTab === 'programmes' && (
        <div className="space-y-3">
          {school.school_programs?.map(prog => (
            <div key={prog.id} className="bg-white border border-zinc-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{prog.program_name}</p>
                  <p className="text-xs text-zinc-500">{prog.level}{prog.duration_months ? ` · ${prog.duration_months} mois` : ''}{prog.year ? ` · Promo ${prog.year}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prog.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                  {prog.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {prog.school_sessions && prog.school_sessions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {prog.school_sessions.map(s => (
                    <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{s.session_label}{s.expected_students ? ` (${s.expected_students} ét.)` : ''}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowProgramModal(true)}
            className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors"
          >
            + Ajouter un programme
          </button>
        </div>
      )}

      {/* Tab: Sessions */}
      {activeTab === 'sessions' && (
        <div className="space-y-2">
          {allSessions.map(s => (
            <div key={s.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#1a1918]">{s.session_label}</p>
                <p className="text-xs text-zinc-500">{s.program_name} · {s.level}</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                {s.start_month && <p>{s.start_month}</p>}
                {s.duration_months && <p>{s.duration_months} mois</p>}
              </div>
              <div className="text-right text-xs">
                {s.expected_students ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.actual_students}/{s.expected_students} étudiants</span>
                ) : null}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowSessionModal(true)}
            className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors"
          >
            + Ajouter une session
          </button>
        </div>
      )}

      {/* Tab: Stagiaires */}
      {activeTab === 'stagiaires' && (
        <div className="space-y-2">
          {school.cases?.length === 0 && (
            <p className="text-sm text-zinc-400 py-8 text-center">Aucun stagiaire pour cette école.</p>
          )}
          {school.cases?.map(c => (
            <div key={c.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1a1918]">
                {c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : 'Stagiaire inconnu'}
              </p>
              <span className="text-xs text-zinc-500">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Lead Enrichment */}
      {activeTab === 'enrichment' && (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            Identifiez les prochaines sessions de stage pour cibler vos efforts de prospection.
          </div>
          {enrichmentSessions.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Aucune session avec des étudiants attendus. Ajoutez des sessions pour générer des prospects.</p>
          ) : (
            <div className="space-y-2">
              {enrichmentSessions.map(s => (
                <div key={s.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1a1918]">{s.session_label}</p>
                    <p className="text-xs text-zinc-500">{s.program_name} · {s.start_month ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#1a1918]">{s.expected_students} étudiants</span>
                    <span className="text-xs text-zinc-400">attendus</span>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c8a96e] text-white">Prospecter</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={() => {
                const rows = [['École', 'Session', 'Programme', 'Mois', 'Étudiants attendus']]
                enrichmentSessions.forEach(s => rows.push([school.name, s.session_label, s.program_name, s.start_month ?? '', String(s.expected_students ?? '')]))
                const csv = rows.map(r => r.join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `enrichment-${school.name.replace(/\s+/g, '-')}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Exporter CSV
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Program */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowProgramModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouveau programme</h2>
              <button onClick={() => setShowProgramModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAddProgram} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom du programme *</label>
                <input required className={inputCls + ' w-full'} placeholder="Ex: Bachelor 2ème année" value={programForm.program_name} onChange={e => setProgramForm(p => ({...p, program_name: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Niveau</label>
                  <select className={inputCls} value={programForm.level} onChange={e => setProgramForm(p => ({...p, level: e.target.value}))}>
                    <option>Bac+2</option>
                    <option>Bac+3</option>
                    <option>Licence</option>
                    <option>Master 1</option>
                    <option>Master 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Durée (mois)</label>
                  <input type="number" className={inputCls} value={programForm.duration_months} onChange={e => setProgramForm(p => ({...p, duration_months: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowProgramModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={savingProgram} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                  {savingProgram ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Session */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowSessionModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1a1918]">Nouvelle session</h2>
              <button onClick={() => setShowSessionModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAddSession} className="px-6 py-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Libellé *</label>
                <input required className={inputCls + ' w-full'} placeholder="Ex: Janvier-Juillet 2026" value={sessionForm.session_label} onChange={e => setSessionForm(p => ({...p, session_label: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Programme</label>
                <select className={inputCls + ' w-full'} value={sessionProgramId} onChange={e => setSessionProgramId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {school.school_programs?.map(p => <option key={p.id} value={p.id}>{p.program_name} ({p.level})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Mois début</label>
                  <select className={inputCls} value={sessionForm.start_month} onChange={e => setSessionForm(p => ({...p, start_month: e.target.value}))}>
                    {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Durée (mois)</label>
                  <input type="number" className={inputCls} value={sessionForm.duration_months} onChange={e => setSessionForm(p => ({...p, duration_months: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Étudiants attendus</label>
                  <input type="number" className={inputCls} value={sessionForm.expected_students} onChange={e => setSessionForm(p => ({...p, expected_students: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                <button type="submit" disabled={savingSession} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                  {savingSession ? 'Ajout…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
