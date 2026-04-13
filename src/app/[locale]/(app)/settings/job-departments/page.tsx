'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface JobDepartment {
  id: string
  name: string
  slug: string
  categories: string[]
  is_active: boolean
  jobs_count: number
}

export default function JobDepartmentsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [departments, setDepartments] = useState<JobDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategories, setFormCategories] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/job-departments')
    if (res.ok) {
      const data = await res.json() as JobDepartment[]
      setDepartments(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function startEdit(dept: JobDepartment) {
    setEditingId(dept.id)
    setFormName(dept.name)
    setFormCategories((dept.categories ?? []).join(', '))
    setShowForm(true)
  }

  function startCreate() {
    setEditingId(null)
    setFormName('')
    setFormCategories('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setFormName('')
    setFormCategories('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true)

    const categories = formCategories
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    if (editingId) {
      const res = await fetch(`/api/job-departments/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, categories }),
      })
      if (res.ok) {
        showToast('Departement modifie')
        cancelForm()
        void load()
      } else {
        showToast('Erreur lors de la modification')
      }
    } else {
      const res = await fetch('/api/job-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, categories }),
      })
      if (res.ok) {
        showToast('Departement cree')
        cancelForm()
        void load()
      } else {
        showToast('Erreur lors de la creation')
      }
    }
    setSaving(false)
  }

  async function toggleActive(dept: JobDepartment) {
    const res = await fetch(`/api/job-departments/${dept.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !dept.is_active }),
    })
    if (res.ok) void load()
  }

  async function deleteDept(dept: JobDepartment) {
    if (!confirm(`Supprimer le departement "${dept.name}" ?`)) return
    const res = await fetch(`/api/job-departments/${dept.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Departement supprime')
      void load()
    } else {
      const data = await res.json() as { error?: string }
      showToast(data.error ?? 'Erreur lors de la suppression')
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/${locale}/settings`} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors mb-1 block">
            &larr; Retour aux parametres
          </Link>
          <h1 className="text-xl font-bold text-[#1a1918]">Metiers & Departements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gerez les secteurs d&apos;activite et metiers disponibles pour les offres</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8945a] transition-colors"
        >
          + Nouveau metier
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white border border-[#c8a96e]/30 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">
            {editingId ? 'Modifier le departement' : 'Nouveau departement'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom du departement *</label>
              <input
                className={inputCls}
                placeholder="Ex: Marketing Digital"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Categories / metiers <span className="text-zinc-400">(separes par des virgules)</span>
              </label>
              <input
                className={inputCls}
                placeholder="Ex: Community Manager, SEO, Content Creator"
                value={formCategories}
                onChange={e => setFormCategories(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !formName.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#c8a96e] text-white disabled:opacity-50 hover:bg-[#b8945a] transition-colors"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Creer'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-[#1a1918] mb-1">Aucun departement</p>
          <p className="text-sm text-zinc-400">Creez votre premier departement pour categoriser vos offres</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map(dept => (
            <div
              key={dept.id}
              className={`bg-white border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all ${
                dept.is_active ? 'border-zinc-100' : 'border-zinc-100 opacity-50'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c8a96e] font-bold text-sm">{dept.name.charAt(0).toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-[#1a1918]">{dept.name}</p>
                  {!dept.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">Inactif</span>
                  )}
                  <span className="text-xs text-zinc-400">{dept.jobs_count} job{dept.jobs_count !== 1 ? 's' : ''}</span>
                </div>
                {dept.categories && dept.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dept.categories.map(cat => (
                      <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{cat}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => void toggleActive(dept)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${dept.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'}`}
                  title={dept.is_active ? 'Desactiver' : 'Activer'}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${dept.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <button
                  onClick={() => startEdit(dept)}
                  className="p-1.5 text-zinc-400 hover:text-[#c8a96e] transition-colors rounded-lg hover:bg-zinc-50"
                  title="Modifier"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {dept.jobs_count === 0 && (
                  <button
                    onClick={() => void deleteDept(dept)}
                    className="p-1.5 text-zinc-400 hover:text-[#dc2626] transition-colors rounded-lg hover:bg-red-50"
                    title="Supprimer"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
