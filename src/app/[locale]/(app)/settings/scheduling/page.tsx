'use client'
import { useEffect, useState } from 'react'

interface EventType {
  id: string
  slug: string
  title: string
  title_en: string
  description: string
  description_en: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_hours: number
  max_future_days: number
  daily_limit: number | null
  booking_button_text: string
  booking_button_text_en: string
  is_active: boolean
}

interface Manager {
  id: string
  name: string
  email: string
  calendar_id: string
  is_active: boolean
  priority: number
  work_days: number[]
  work_start_hour: number
  work_end_hour: number
  timezone: string
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white'
const lbl = 'block text-xs font-medium text-zinc-500 mb-1'

export default function SchedulingSettingsPage() {
  const [et, setEt] = useState<EventType | null>(null)
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bookingUrl, setBookingUrl] = useState('')

  useEffect(() => {
    setBookingUrl(window.location.origin + '/book')
    fetch('/api/scheduling/settings')
      .then(r => r.ok ? r.json() : null)
      .then((d: { event_type: EventType; managers: Manager[] } | null) => {
        if (d) { setEt(d.event_type); setManagers(d.managers) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    if (!et) return
    setSaving(true)
    try {
      await fetch('/api/scheduling/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: et, managers }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  function updateEt(patch: Partial<EventType>) { setEt(p => p ? { ...p, ...patch } : p) }

  function toggleWorkDay(mgr: Manager, day: number) {
    setManagers(prev => prev.map(m => m.id === mgr.id
      ? { ...m, work_days: m.work_days.includes(day) ? m.work_days.filter(d => d !== day) : [...m.work_days, day].sort() }
      : m
    ))
  }

  if (loading) return <div className="p-8 text-sm text-zinc-400">Chargement…</div>
  if (!et) return <div className="p-8 text-sm text-red-500">Erreur de chargement des paramètres</div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Scheduling</h1>
          <p className="text-sm text-zinc-400">Prise de RDV native Google Calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/book" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
            ↗ Voir la page publique
          </a>
          <button onClick={() => { void save() }} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-[#1a1918] text-[#c8a96e] rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors">
            {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Booking URL */}
      <div className="bg-[#c8a96e]/10 border border-[#c8a96e]/30 rounded-2xl p-4">
        <p className="text-xs font-semibold text-[#c8a96e] uppercase tracking-wider mb-2">Lien de réservation public</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white px-3 py-2 rounded-xl border border-zinc-100 text-zinc-600 truncate">{bookingUrl}</code>
          <button onClick={() => navigator.clipboard.writeText(bookingUrl)}
            className="text-xs px-3 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50">Copier</button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Ce lien est utilisé à la fin du formulaire /apply · Disponible en FR et EN</p>
      </div>

      {/* Event Type */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-[#1a1918]">Type d'événement</p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={lbl}>Titre (FR)</label>
            <input className={inp} value={et.title} onChange={e => updateEt({ title: e.target.value })} />
          </div>
          <div>
            <label className={lbl}>Titre (EN)</label>
            <input className={inp} value={et.title_en} onChange={e => updateEt({ title_en: e.target.value })} />
          </div>
          <div>
            <label className={lbl}>Description (FR)</label>
            <textarea className={inp} rows={2} value={et.description} onChange={e => updateEt({ description: e.target.value })} style={{ resize: 'none' }} />
          </div>
          <div>
            <label className={lbl}>Description (EN)</label>
            <textarea className={inp} rows={2} value={et.description_en} onChange={e => updateEt({ description_en: e.target.value })} style={{ resize: 'none' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Durée (min)</label>
            <input type="number" className={inp} value={et.duration_minutes} onChange={e => updateEt({ duration_minutes: parseInt(e.target.value) })} min={15} max={120} step={15} />
          </div>
          <div>
            <label className={lbl}>Buffer avant (min)</label>
            <input type="number" className={inp} value={et.buffer_before_minutes} onChange={e => updateEt({ buffer_before_minutes: parseInt(e.target.value) })} min={0} max={60} step={5} />
          </div>
          <div>
            <label className={lbl}>Buffer après (min)</label>
            <input type="number" className={inp} value={et.buffer_after_minutes} onChange={e => updateEt({ buffer_after_minutes: parseInt(e.target.value) })} min={0} max={60} step={5} />
          </div>
          <div>
            <label className={lbl}>Notice minimum (h)</label>
            <input type="number" className={inp} value={et.min_notice_hours} onChange={e => updateEt({ min_notice_hours: parseInt(e.target.value) })} min={1} max={72} />
          </div>
          <div>
            <label className={lbl}>Fenêtre max (jours)</label>
            <input type="number" className={inp} value={et.max_future_days} onChange={e => updateEt({ max_future_days: parseInt(e.target.value) })} min={7} max={90} />
          </div>
          <div>
            <label className={lbl}>Limite / jour</label>
            <input type="number" className={inp} value={et.daily_limit ?? ''} onChange={e => updateEt({ daily_limit: e.target.value ? parseInt(e.target.value) : null })} min={1} max={20} placeholder="Illimité" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Bouton réservation (FR)</label>
            <input className={inp} value={et.booking_button_text} onChange={e => updateEt({ booking_button_text: e.target.value })} />
          </div>
          <div>
            <label className={lbl}>Bouton réservation (EN)</label>
            <input className={inp} value={et.booking_button_text_en} onChange={e => updateEt({ booking_button_text_en: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Managers */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1a1918]">Managers & disponibilités</p>
          <p className="text-xs text-zinc-400">Round-robin par ordre de priorité</p>
        </div>

        {managers.map(mgr => (
          <div key={mgr.id} className="border border-zinc-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
                  {mgr.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1918]">{mgr.name}</p>
                  <p className="text-xs text-zinc-400">{mgr.email} · {mgr.calendar_id}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-500">{mgr.is_active ? 'Actif' : 'Inactif'}</span>
                <div className={`w-9 h-5 rounded-full transition-colors ${mgr.is_active ? 'bg-[#0d9e75]' : 'bg-zinc-200'}`}
                  onClick={() => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, is_active: !m.is_active } : m))}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${mgr.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>

            <div>
              <label className={lbl}>Jours de travail</label>
              <div className="flex gap-2">
                {DAY_LABELS.map((day, i) => (
                  <button key={i} onClick={() => toggleWorkDay(mgr, i)}
                    className={`w-9 h-8 text-xs font-medium rounded-lg border transition-colors ${mgr.work_days.includes(i) ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'bg-white text-zinc-400 border-zinc-200'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Début journée (heure Bali)</label>
                <input type="number" className={inp} value={mgr.work_start_hour} min={6} max={12}
                  onChange={e => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, work_start_hour: parseInt(e.target.value) } : m))} />
              </div>
              <div>
                <label className={lbl}>Fin journée (heure Bali)</label>
                <input type="number" className={inp} value={mgr.work_end_hour} min={14} max={22}
                  onChange={e => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, work_end_hour: parseInt(e.target.value) } : m))} />
              </div>
            </div>

            <div className="text-xs text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2">
              Calendrier connecté via <code>GOOGLE_REFRESH_TOKEN</code> env var · Disponibilités calculées en temps réel via Google Calendar freebusy API
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
