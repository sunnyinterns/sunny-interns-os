'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui/Toast'

interface AppUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'superuser' | 'account_manager'
  is_active: boolean
  avatar_color: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  superuser: 'Superuser',
  account_manager: 'Account Manager',
}
const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626',
  superuser: '#c8a96e',
  account_manager: '#3b82f6',
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'account_manager' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    checkAdmin()
    loadUsers()
  }, [])

  async function checkAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const res = await fetch('/api/users')
    if (!res.ok) return
    const data = await res.json() as AppUser[]
    const me = data.find(u => u.email === user.email)
    setIsAdmin(me?.role === 'admin')
  }

  async function loadUsers() {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json() as AppUser[]
      setUsers(data)
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.email || !form.full_name) return
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ email: '', full_name: '', role: 'account_manager' })
      setToast({ message: 'Utilisateur ajouté', type: 'success' })
      await loadUsers()
    } else {
      const err = await res.json() as { error: string }
      setToast({ message: err.error || 'Erreur', type: 'error' })
    }
    setSaving(false)
  }

  async function toggleActive(user: AppUser) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    await loadUsers()
  }

  if (!isAdmin && !loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-[#dc2626]">Accès réservé aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Utilisateurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestion de l&apos;équipe</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#c8a96e] text-white rounded-lg text-sm font-semibold hover:bg-[#b89a5e] transition-colors"
        >
          + Ajouter un utilisateur
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Nom</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Actif</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-[#1a1918]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: u.avatar_color || '#c8a96e' }}
                      >
                        {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {u.full_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: ROLE_COLORS[u.role] || '#6b7280' }}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { void toggleActive(u) }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${u.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${u.is_active ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/fr/pipeline?manager=${encodeURIComponent(u.full_name)}`}
                      className="text-xs text-[#c8a96e] hover:underline"
                    >
                      Voir ses dossiers
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-[#1a1918] mb-4">Ajouter un utilisateur</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  placeholder="prenom@bali-interns.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                  placeholder="Prénom Nom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                >
                  <option value="admin">Admin</option>
                  <option value="superuser">Superuser</option>
                  <option value="account_manager">Account Manager</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700">
                Annuler
              </button>
              <button
                onClick={() => { void handleAdd() }}
                disabled={saving || !form.email || !form.full_name}
                className="px-4 py-2 bg-[#c8a96e] text-white rounded-lg text-sm font-semibold hover:bg-[#b89a5e] disabled:opacity-50"
              >
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
