'use client'
import { useEffect, useState } from 'react'

interface EventType {
  id: string; slug: string; title: string; title_en: string
  description: string; description_en: string
  duration_minutes: number; buffer_before_minutes: number; buffer_after_minutes: number
  min_notice_hours: number; max_future_days: number; daily_limit: number | null
  booking_button_text: string; booking_button_text_en: string; is_active: boolean
}
interface Manager {
  id: string; name: string; email: string; calendar_id: string
  is_active: boolean; priority: number; work_days: number[]
  work_start_hour: number; work_end_hour: number; timezone: string
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const inp = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white'
const lbl = 'block text-xs font-medium text-zinc-500 mb-1'

const SLUG_META: Record<string, { icon: string; label: string; color: string }> = {
  entretien: { icon: '🎓', label: 'Candidats', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  employeur: { icon: '🏢', label: 'Employeurs', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ecole:     { icon: '🎒', label: 'Écoles',     color: 'text-green-600 bg-green-50 border-green-200' },
}

export default function SchedulingSettingsPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [activeSlug, setActiveSlug] = useState('entretien')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bookingUrl, setBookingUrl] = useState('')

  useEffect(() => {
    setBookingUrl(window.location.origin + '/book')
    fetch('/api/scheduling/settings')
      .then(r => r.ok ? r.json() : null)
      .then((d: { event_types: EventType[]; managers: Manager[] } | null) => {
        if (d) {
          setEventTypes(d.event_types ?? [])
          setManagers(d.managers ?? [])
          if (d.event_types?.length) setActiveSlug(d.event_types[0].slug)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const et = eventTypes.find(e => e.slug === activeSlug) ?? null

  function updateEt(patch: Partial<EventType>) {
    setEventTypes(prev => prev.map(e => e.slug === activeSlug ? { ...e, ...patch } : e))
  }

  function toggleWorkDay(mgr: Manager, day: number) {
    setManagers(prev => prev.map(m => m.id === mgr.id
      ? { ...m, work_days: m.work_days.includes(day) ? m.work_days.filter(d => d !== day) : [...m.work_days, day].sort() }
      : m))
  }

  async function save() {
    setSaving(true)
    try {
      for (const e of eventTypes) {
        await fetch('/api/scheduling/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: e, managers }),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-sm text-zinc-400">Chargement…</div>
  if (!eventTypes.length) return <div className="p-8 text-sm text-red-500">Erreur de chargement</div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Scheduling</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Prise de RDV native Google Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/fr/book" target="_blank" className="text-xs text-zinc-400 hover:text-zinc-600 underline">Voir la page publique</a>
          <button onClick={() => { void save() }} disabled={saving}
            className="px-4 py-2 bg-[#1a1918] text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors hover:bg-zinc-800">
            {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-medium text-amber-700 mb-2">LIEN DE RÉSERVATION — {(SLUG_META[activeSlug] ?? { label: activeSlug }).label.toUpperCase()}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white px-3 py-2 rounded-xl border border-zinc-100 text-zinc-600 truncate">
            {bookingUrl}?event={activeSlug}
          </code>
          <button onClick={() => { void navigator.clipboard.writeText(bookingUrl + '?event=' + activeSlug) }}
            className="text-xs px-3 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 shrink-0">Copier</button>
        </div>
        <p className="text-xs text-amber-600 mt-1.5">Chaque audience a sa propre URL de réservation.</p>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          {eventTypes.map(e => {
            const meta = SLUG_META[e.slug] ?? { icon: '📅', label: e.slug, color: 'text-zinc-600 bg-zinc-50 border-zinc-200' }
            const isActive = e.slug === activeSlug
            return (
              <button key={e.slug} onClick={() => setActiveSlug(e.slug)}
                className={'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ' + (isActive ? meta.color + ' shadow-sm' : 'text-zinc-400 bg-white border-zinc-200 hover:border-zinc-300')}>
                <span>{meta.icon}</span><span>{meta.label}</span>
                {!e.is_active && <span className="text-xs opacity-50">(off)</span>}
              </button>
            )
          })}
        </div>

        {et && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <p className="text-sm font-medium text-[#1a1918]">Activer ce type de RDV</p>
                <p className="text-xs text-zinc-400">Si désactivé, ce lien ne sera plus accessible</p>
              </div>
              <button onClick={() => updateEt({ is_active: !et.is_active })}
                className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (et.is_active ? 'bg-[#c8a96e]' : 'bg-zinc-200')}>
                <span className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ' + (et.is_active ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Titre affiché (FR)</label><input className={inp} value={et.title} onChange={e => updateEt({ title: e.target.value })} /></div>
              <div><label className={lbl}>Titre affiché (EN)</label><input className={inp} value={et.title_en} onChange={e => updateEt({ title_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Description (FR)</label><textarea className={inp + ' resize-none'} rows={3} value={et.description} onChange={e => updateEt({ description: e.target.value })} /></div>
              <div><label className={lbl}>Description (EN)</label><textarea className={inp + ' resize-none'} rows={3} value={et.description_en} onChange={e => updateEt({ description_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Durée (min)</label><input type="number" className={inp} value={et.duration_minutes} onChange={e => updateEt({ duration_minutes: +e.target.value })} /></div>
              <div><label className={lbl}>Buffer avant (min)</label><input type="number" className={inp} value={et.buffer_before_minutes} onChange={e => updateEt({ buffer_before_minutes: +e.target.value })} /></div>
              <div><label className={lbl}>Buffer après (min)</label><input type="number" className={inp} value={et.buffer_after_minutes} onChange={e => updateEt({ buffer_after_minutes: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Notice minimum (h)</label><input type="number" className={inp} value={et.min_notice_hours} onChange={e => updateEt({ min_notice_hours: +e.target.value })} /></div>
              <div><label className={lbl}>Fenêtre max (jours)</label><input type="number" className={inp} value={et.max_future_days} onChange={e => updateEt({ max_future_days: +e.target.value })} /></div>
              <div><label className={lbl}>Limite / jour</label><input type="number" className={inp} value={et.daily_limit ?? ''} placeholder="Illimité" onChange={e => updateEt({ daily_limit: e.target.value === '' ? null : +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Bouton réservation (FR)</label><input className={inp} value={et.booking_button_text} onChange={e => updateEt({ booking_button_text: e.target.value })} /></div>
              <div><label className={lbl}>Bouton réservation (EN)</label><input className={inp} value={et.booking_button_text_en} onChange={e => updateEt({ booking_button_text_en: e.target.value })} /></div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[#1a1918]">Managers & disponibilités</h2>
          <p className="text-xs text-zinc-400">Round-robin par priorité · Freebusy Google Calendar en temps réel</p>
        </div>
        <div className="space-y-3">
          {managers.map(mgr => (
            <div key={mgr.id} className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">{mgr.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1918]">{mgr.name}</p>
                    <p className="text-xs text-zinc-400">{mgr.email} · Priorité {mgr.priority}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (mgr.is_active ? 'bg-green-50 text-green-600' : 'bg-zinc-100 text-zinc-400')}>
                    {mgr.is_active ? '● Actif' : '○ Inactif'}
                  </span>
                  <button onClick={() => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, is_active: !m.is_active } : m))}
                    className={'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' + (mgr.is_active ? 'bg-[#c8a96e]' : 'bg-zinc-200')}>
                    <span className={'inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm ' + (mgr.is_active ? 'translate-x-5' : 'translate-x-1')} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Timezone</label>
                  <input className={inp} value={mgr.timezone} onChange={e => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, timezone: e.target.value } : m))} /></div>
                <div><label className={lbl}>Début (h)</label>
                  <input type="number" min={0} max={23} className={inp} value={mgr.work_start_hour} onChange={e => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, work_start_hour: +e.target.value } : m))} /></div>
                <div><label className={lbl}>Fin (h)</label>
                  <input type="number" min={0} max={23} className={inp} value={mgr.work_end_hour} onChange={e => setManagers(prev => prev.map(m => m.id === mgr.id ? { ...m, work_end_hour: +e.target.value } : m))} /></div>
              </div>
              <div>
                <label className={lbl}>Jours travaillés</label>
                <div className="flex gap-1.5 mt-1">
                  {DAY_LABELS.map((label, idx) => (
                    <button key={idx} onClick={() => toggleWorkDay(mgr, idx)}
                      className={'w-9 h-9 rounded-lg text-xs font-medium transition-all border ' + (mgr.work_days.includes(idx) ? 'bg-[#1a1918] text-white border-[#1a1918]' : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300')}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
