'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const PRESET_COLORS: { label: string; value: string }[] = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Cyan', value: '#06b6d4' },
]

const DESTINATIONS = ['Bali', 'Bangkok', 'Autres']

interface CreateGroupModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('Bali')
  const [departureMonth, setDepartureMonth] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0].value)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/intern-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          destination,
          departure_month: departureMonth || null,
          color,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1a1918]">Créer un groupe de départ</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-[#dc2626] bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nom du groupe *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Groupe Juillet 2025"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Destination</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            >
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Mois de départ</label>
            <input
              type="month"
              value={departureMonth}
              onChange={(e) => setDepartureMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Couleur</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c.value,
                    outline: color === c.value ? `3px solid ${c.value}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] resize-none"
              placeholder="Notes optionnelles…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving || !name.trim()}>
              {saving ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
