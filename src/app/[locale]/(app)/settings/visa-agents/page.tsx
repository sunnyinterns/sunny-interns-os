'use client'

import { useEffect, useState } from 'react'

interface VisaAgent {
  id: string
  name: string
  email: string | null
  whatsapp: string | null
  agent_code: string | null
  avg_processing_days: number | null
  commission_per_case: number | null
  notes: string | null
  is_active: boolean
}

interface AgentStats {
  agent_id: string
  total_cases: number
  success_count: number
  avg_days: number | null
}

const inputCls = 'px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

export default function VisaAgentsSettingsPage() {
  const [agents, setAgents] = useState<VisaAgent[]>([])
  const [stats, setStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<VisaAgent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', agent_code: '', avg_processing_days: '', commission_per_case: '', notes: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/visa-agents')
    setAgents(res.ok ? await res.json() : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function openEdit(agent: VisaAgent) {
    setEditingAgent(agent)
    setForm({
      name: agent.name,
      email: agent.email ?? '',
      whatsapp: agent.whatsapp ?? '',
      agent_code: agent.agent_code ?? '',
      avg_processing_days: agent.avg_processing_days?.toString() ?? '',
      commission_per_case: agent.commission_per_case?.toString() ?? '',
      notes: agent.notes ?? '',
    })
    setShowModal(true)
  }

  function openCreate() {
    setEditingAgent(null)
    setForm({ name: '', email: '', whatsapp: '', agent_code: '', avg_processing_days: '', commission_per_case: '', notes: '' })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = {
      ...form,
      avg_processing_days: form.avg_processing_days ? Number(form.avg_processing_days) : null,
      commission_per_case: form.commission_per_case ? Number(form.commission_per_case) : null,
    }
    if (editingAgent) {
      await fetch(`/api/visa-agents/${editingAgent.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/visa-agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setShowModal(false)
    void load()
  }

  const getStats = (agentId: string) => stats.find(s => s.agent_id === agentId)

  return (
    <div className="min-h-screen bg-[#fafaf7] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1a1918]">Agents Visa</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white hover:bg-[#b8945a] transition-colors">
            + Nouvel agent
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p>Aucun agent visa configuré.</p>
            <button onClick={openCreate} className="mt-2 text-sm text-[#c8a96e] hover:underline">Ajouter FAZZA</button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => {
              const s = getStats(agent.id)
              return (
                <div key={agent.id} className="bg-white border border-zinc-100 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {agent.agent_code && (
                          <span className="font-mono text-xs font-bold text-[#c8a96e] bg-[#c8a96e]/10 px-2 py-0.5 rounded">{agent.agent_code}</span>
                        )}
                        <p className="text-sm font-semibold text-[#1a1918]">{agent.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agent.is_active ? 'bg-green-100 text-[#0d9e75]' : 'bg-zinc-100 text-zinc-500'}`}>
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-2">
                        {agent.email && <span>{agent.email}</span>}
                        {agent.whatsapp && <span>WhatsApp: {agent.whatsapp}</span>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        {agent.avg_processing_days && (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">Délai moyen:</span>
                            <span className="font-semibold text-[#1a1918]">{agent.avg_processing_days}j</span>
                          </div>
                        )}
                        {agent.commission_per_case && (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">Commission:</span>
                            <span className="font-semibold text-[#1a1918]">{agent.commission_per_case}€/dossier</span>
                          </div>
                        )}
                        {s && (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500">Dossiers:</span>
                              <span className="font-semibold text-[#1a1918]">{s.total_cases}</span>
                            </div>
                            {s.total_cases > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-500">Taux succès:</span>
                                <span className="font-semibold text-[#0d9e75]">{Math.round((s.success_count / s.total_cases) * 100)}%</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {agent.notes && <p className="text-xs text-zinc-400 mt-2 italic">{agent.notes}</p>}
                    </div>
                    <button onClick={() => openEdit(agent)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors flex-shrink-0">
                      Modifier
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1a1918]">{editingAgent ? 'Modifier agent' : 'Nouvel agent visa'}</h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl">×</button>
              </div>
              <form onSubmit={handleSave} className="px-6 py-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                    <input required className={inputCls} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Code</label>
                    <input className={inputCls} placeholder="Ex: FAZZA" value={form.agent_code} onChange={e => setForm(p => ({...p, agent_code: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                    <input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                    <input className={inputCls} value={form.whatsapp} onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Délai moyen (j)</label>
                    <input type="number" className={inputCls} value={form.avg_processing_days} onChange={e => setForm(p => ({...p, avg_processing_days: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Commission (€/dossier)</label>
                    <input type="number" className={inputCls} value={form.commission_per_case} onChange={e => setForm(p => ({...p, commission_per_case: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                  <textarea className={inputCls + ' w-full'} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600">Annuler</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50">
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
