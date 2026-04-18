'use client'
import { useEffect, useState, useCallback } from 'react'

interface SlotItem { start: string; end: string; label_fr: string; label_en: string; manager_id: string }
interface DayItem { date: string; label: string; label_en: string; slots: SlotItem[] }
interface EventType { title: string; title_en: string; duration_minutes: number; booking_button_text: string; booking_button_text_en: string }
interface Props { firstName: string; lastName: string; email: string; phone?: string; lang: 'fr' | 'en'; caseId?: string; onConfirmed?: (meetLink: string, start: string) => void }
type Step = 'loading' | 'pick' | 'confirm' | 'done' | 'error'

export function NativeBookingEmbed({ firstName, lastName, email, phone, lang, caseId, onConfirmed }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [days, setDays] = useState<DayItem[]>([])
  const [et, setEt] = useState<EventType | null>(null)
  const [selected, setSelected] = useState<SlotItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [meetLink, setMeetLink] = useState('')
  const [err, setErr] = useState('')
  const fr = lang === 'fr'

  useEffect(() => {
    fetch('/api/scheduling/slots')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { days: DayItem[]; event_type: EventType }) => { setDays(d.days ?? []); setEt(d.event_type); setStep(d.days?.length ? 'pick' : 'error') })
      .catch(() => setStep('error'))
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selected) return
    setSubmitting(true); setErr('')
    try {
      const r = await fetch('/api/scheduling/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: selected.start, end: selected.end, manager_id: selected.manager_id, first_name: firstName, last_name: lastName, email, phone: phone || undefined, lang, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris', prefill_case_id: caseId || undefined, source: 'apply_form' }),
      })
      if (!r.ok) throw new Error()
      const data = await r.json() as { meet_link: string; start: string }
      setMeetLink(data.meet_link); setStep('done'); onConfirmed?.(data.meet_link, data.start)
    } catch { setErr(fr ? 'Erreur lors de la confirmation. Réessaie.' : 'Confirmation failed. Please try again.') }
    finally { setSubmitting(false) }
  }, [selected, firstName, lastName, email, phone, lang, caseId, fr, onConfirmed])

  if (step === 'loading') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c8a96e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#8a7d6d', margin: 0 }}>{fr ? 'Chargement des créneaux…' : 'Loading slots…'}</p>
    </div>
  )

  if (step === 'error') return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>{fr ? 'Aucun créneau disponible pour le moment. Contacte-nous :' : 'No slots available right now. Contact us:'}</p>
      <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e', fontWeight: 500 }}>team@bali-interns.com</a>
    </div>
  )

  if (step === 'done') return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 24, margin: '0 0 10px' }}>🎉</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#065f46', margin: '0 0 6px' }}>{fr ? 'Entretien confirmé !' : 'Call confirmed!'}</p>
      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 16px' }}>{fr ? `Confirmation envoyée à ${email}` : `Confirmation sent to ${email}`}</p>
      {selected && <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1918', margin: '0 0 16px', background: 'white', padding: '10px 16px', borderRadius: 10 }}>📅 {fr ? selected.label_fr : selected.label_en}</p>}
      {meetLink && <a href={meetLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#1a73e8', color: 'white', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>📹 {fr ? 'Rejoindre Google Meet' : 'Join Google Meet'}</a>}
    </div>
  )

  if (step === 'confirm' && selected) return (
    <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 16, padding: 20 }}>
      <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0, marginBottom: 14 }}>{fr ? '← Autre créneau' : '← Change slot'}</button>
      <div style={{ background: '#fdf8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#c8a96e', fontWeight: 500, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fr ? 'Créneau sélectionné' : 'Selected slot'}</p>
        <p style={{ fontSize: 15, color: '#1a1918', fontWeight: 500, margin: 0 }}>{fr ? selected.label_fr : selected.label_en}</p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>{et?.duration_minutes ?? 45} min · Google Meet</p>
      </div>
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>{fr ? 'Confirmation pour :' : 'Confirming for:'}</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1918', margin: 0 }}>{firstName} {lastName}</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{email}</p>
      </div>
      {err && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{err}</p>}
      <button onClick={() => { void handleConfirm() }} disabled={submitting}
        style={{ width: '100%', padding: 14, background: submitting ? '#e5e7eb' : '#c8a96e', color: submitting ? '#9ca3af' : 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer' }}>
        {submitting ? (fr ? 'Confirmation…' : 'Confirming…') : (et ? (fr ? et.booking_button_text : et.booking_button_text_en) : (fr ? 'Confirmer le rendez-vous' : 'Confirm booking'))}
      </button>
    </div>
  )

  return (
    <div>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, textAlign: 'center' }}>{fr ? '⏰ Heure France (Paris) et Bali' : '⏰ France (Paris) and Bali time'}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 480, overflowY: 'auto' }}>
        {days.map(day => (
          <div key={day.date}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8, textTransform: 'capitalize' }}>{fr ? day.label : day.label_en}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {day.slots.map(slot => (
                <button key={slot.start} onClick={() => { setSelected(slot); setStep('confirm') }}
                  style={{ width: '100%', padding: '11px 14px', background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#1a1918' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8a96e'; e.currentTarget.style.background = '#fdf8f0' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}>
                  {fr ? slot.label_fr : slot.label_en}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
