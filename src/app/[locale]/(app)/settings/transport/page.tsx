'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TransportProvider {
  id: string
  name: string
  contact_name: string | null
  whatsapp: string | null
  email: string | null
  notes: string | null
  is_default: boolean
  wa_message_template: string | null
}

const DEFAULT_TEMPLATE = `Bonjour,

Je suis Charly de Bali Interns.

Nous avons un nouveau stagiaire à récupérer à l'aéroport de Denpasar :
- Nom : {{intern_name}}
- Date d'arrivée : {{arrival_date}}
- Heure d'arrivée : {{arrival_time}}
- Vol : {{flight_number}} depuis {{departure_city}}
- Adresse de dépose : {{dropoff_address}}

Photo du stagiaire : {{photo_url}}

Merci de confirmer la prise en charge.
Charly`

type EditingProvider = Omit<TransportProvider, 'id'> & { id: string }

export default function TransportSettingsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const [providers, setProviders] = useState<TransportProvider[]>([])
  const [editing, setEditing] = useState<EditingProvider | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/transport')
      .then(r => r.ok ? r.json() as Promise<TransportProvider[]> : Promise.resolve([]))
      .then((d) => { setProviders(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    if (!editing) return
    setSaving(true)
    const isNew = editing.id === 'new'
    const r = await fetch(isNew ? '/api/settings/transport' : `/api/settings/transport/${editing.id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (r.ok) {
      const saved = await r.json() as TransportProvider
      setProviders(prev => isNew ? [...prev, saved] : prev.map(p => p.id === saved.id ? saved : p))
      setEditing(null)
    }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]'

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/settings`} className="text-zinc-400 hover:text-zinc-600 text-sm">&larr; Paramètres</Link>
        <span className="text-zinc-300">/</span>
        <h1 className="text-xl font-bold text-[#1a1918]">Chauffeurs</h1>
      </div>
      <p className="text-sm text-zinc-400 mb-6">Sociétés de chauffeur pour les transferts aéroport. Le chauffeur par défaut est utilisé pour le bouton WhatsApp automatique.</p>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ id: 'new', name: '', contact_name: '', whatsapp: '', email: '', notes: '', is_default: false, wa_message_template: DEFAULT_TEMPLATE })}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-xl"
        >
          + Ajouter un chauffeur
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {providers.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
              Aucun chauffeur configuré
            </div>
          ) : providers.map(p => (
            <div key={p.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#1a1918]">{p.name}</p>
                  {p.is_default && <span className="text-[10px] bg-[#c8a96e]/10 text-[#c8a96e] px-2 py-0.5 rounded-full">Par défaut</span>}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{p.whatsapp ?? ''}{p.contact_name ? ` — ${p.contact_name}` : ''}</p>
              </div>
              <button onClick={() => setEditing(p as EditingProvider)} className="text-xs text-zinc-500 hover:text-zinc-700 px-3 py-1.5 border border-zinc-200 rounded-lg">Modifier</button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire édition */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{editing.id === 'new' ? 'Nouveau chauffeur' : 'Modifier'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                  <input value={editing.name} onChange={e => setEditing(p => p ? {...p, name: e.target.value} : p)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Contact</label>
                  <input value={editing.contact_name ?? ''} onChange={e => setEditing(p => p ? {...p, contact_name: e.target.value} : p)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">WhatsApp</label>
                  <input value={editing.whatsapp ?? ''} onChange={e => setEditing(p => p ? {...p, whatsapp: e.target.value} : p)} className={inputCls} placeholder="+62..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
                  <input value={editing.notes ?? ''} onChange={e => setEditing(p => p ? {...p, notes: e.target.value} : p)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Template message WhatsApp</label>
                  <p className="text-[10px] text-zinc-400 mb-1">Variables: {`{{intern_name}}, {{arrival_date}}, {{arrival_time}}, {{flight_number}}, {{departure_city}}, {{dropoff_address}}, {{photo_url}}`}</p>
                  <textarea
                    value={editing.wa_message_template ?? DEFAULT_TEMPLATE}
                    onChange={e => setEditing(p => p ? {...p, wa_message_template: e.target.value} : p)}
                    className={inputCls}
                    rows={10}
                    style={{ fontFamily: 'monospace', fontSize: '11px' }}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.is_default} onChange={e => setEditing(p => p ? {...p, is_default: e.target.checked} : p)} />
                  <span className="text-sm text-zinc-600">Chauffeur par défaut</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm">Annuler</button>
                <button onClick={() => void save()} disabled={saving || !editing.name} className="flex-1 py-2.5 bg-[#c8a96e] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
