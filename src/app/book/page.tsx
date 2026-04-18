'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface SlotItem {
  start: string
  end: string
  label_fr: string
  label_en: string
  manager_id: string
}
interface DayItem {
  date: string
  label: string
  label_en: string
  slots: SlotItem[]
}
interface EventType {
  title: string
  title_en: string
  description: string
  description_en: string
  duration_minutes: number
  booking_button_text: string
  booking_button_text_en: string
}

type Step = 'loading' | 'pick' | 'form' | 'confirmed' | 'error'

function BookingForm() {
  const searchParams = useSearchParams()
  const lang = (searchParams.get('lang') ?? 'fr') as 'fr' | 'en'
  const prefillFirstName = searchParams.get('first_name') ?? ''
  const prefillLastName = searchParams.get('last_name') ?? ''
  const prefillEmail = searchParams.get('email') ?? ''
  const prefillPhone = searchParams.get('phone') ?? ''
  const caseId = searchParams.get('case_id') ?? ''

  const t = {
    title: lang === 'fr' ? 'Réserver un appel' : 'Book a call',
    subtitle: lang === 'fr' ? 'Choisis un créneau' : 'Choose a time slot',
    noSlots: lang === 'fr' ? 'Aucun créneau disponible pour le moment. Réessaie dans quelques heures.' : 'No slots available right now. Try again in a few hours.',
    loading: lang === 'fr' ? 'Chargement des créneaux…' : 'Loading available slots…',
    back: lang === 'fr' ? '← Retour' : '← Back',
    firstName: lang === 'fr' ? 'Prénom' : 'First name',
    lastName: lang === 'fr' ? 'Nom' : 'Last name',
    email: lang === 'fr' ? 'Email' : 'Email',
    phone: lang === 'fr' ? 'WhatsApp / Téléphone' : 'WhatsApp / Phone',
    message: lang === 'fr' ? 'Message (optionnel)' : 'Message (optional)',
    confirm: lang === 'fr' ? 'Confirmer la réservation' : 'Confirm booking',
    confirming: lang === 'fr' ? 'Confirmation…' : 'Confirming…',
    confirmedTitle: lang === 'fr' ? '🎉 Entretien confirmé !' : '🎉 Call confirmed!',
    meetBtn: lang === 'fr' ? '📹 Rejoindre Google Meet' : '📹 Join Google Meet',
    addCal: lang === 'fr' ? '📅 Ajouter à Google Calendar' : '📅 Add to Google Calendar',
    slot: lang === 'fr' ? 'Créneau sélectionné' : 'Selected slot',
    timezone: lang === 'fr' ? 'Heures affichées en heure de France (Paris) et Bali' : 'Times shown in France (Paris) and Bali time',
  }

  const [step, setStep] = useState<Step>('loading')
  const [days, setDays] = useState<DayItem[]>([])
  const [et, setEt] = useState<EventType | null>(null)
  const [selectedDay, setSelectedDay] = useState<DayItem | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null)
  const [error, setError] = useState('')
  const [firstName, setFirstName] = useState(prefillFirstName)
  const [lastName, setLastName] = useState(prefillLastName)
  const [email, setEmail] = useState(prefillEmail)
  const [phone, setPhone] = useState(prefillPhone)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<{ meet_link: string; start: string } | null>(null)

  useEffect(() => {
    fetch('/api/scheduling/slots')
      .then(r => r.ok ? r.json() : Promise.reject('fetch failed'))
      .then((data: { days: DayItem[]; event_type: EventType }) => {
        setDays(data.days ?? [])
        setEt(data.event_type)
        setStep(data.days?.length ? 'pick' : 'error')
      })
      .catch(() => setStep('error'))
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot || !firstName || !email) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/scheduling/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: selectedSlot.start,
          end: selectedSlot.end,
          manager_id: selectedSlot.manager_id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || undefined,
          message: message || undefined,
          lang,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
          prefill_case_id: caseId || undefined,
          source: caseId ? 'apply_form' : 'direct_link',
        }),
      })
      if (!r.ok) throw new Error('confirm failed')
      const data = await r.json() as { meet_link: string; start: string }
      setBooking(data)
      setStep('confirmed')
    } catch {
      setError(lang === 'fr' ? 'Erreur lors de la confirmation. Réessaie.' : 'Confirmation error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [selectedSlot, firstName, lastName, email, phone, message, lang, caseId])

  // Shared header
  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ background: '#111110', padding: '8px 16px', borderRadius: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png" alt="Bali Interns" style={{ height: 24 }} />
        </div>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1a1918', margin: '0 0 6px' }}>
        {et ? (lang === 'fr' ? et.title : et.title_en) : t.title}
      </h1>
      {et && <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{lang === 'fr' ? et.description : et.description_en}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>⏱ {et?.duration_minutes ?? 45} min</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>📹 Google Meet</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>🆓 Gratuit</span>
      </div>
    </div>
  )

  if (step === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf7' }}>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>{t.loading}</p>
    </div>
  )

  if (step === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafaf7', padding: 24 }}>
      <Header />
      <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>{t.noSlots}</p>
      <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>team@bali-interns.com</p>
    </div>
  )

  if (step === 'confirmed' && booking) return (
    <div style={{ minHeight: '100vh', background: '#fafaf7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <Header />
        <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 16, padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>🎉</p>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1a1918', margin: '0 0 8px' }}>{t.confirmedTitle}</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
            {lang === 'fr' ? `Un email de confirmation a été envoyé à ${email}` : `A confirmation email was sent to ${email}`}
          </p>
          <div style={{ background: '#fdf8f0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 4px', fontWeight: 500 }}>{t.slot}</p>
            <p style={{ fontSize: 15, color: '#1a1918', margin: 0, fontWeight: 500 }}>
              {selectedSlot ? (lang === 'fr' ? selectedSlot.label_fr : selectedSlot.label_en) : ''}
            </p>
          </div>
          {booking.meet_link && (
            <a href={booking.meet_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', background: '#1a73e8', color: 'white', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14, marginBottom: 10 }}>
              {t.meetBtn}
            </a>
          )}
          <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(et?.title ?? 'Bali Interns')}&dates=${booking.start.replace(/[-:]/g, '').split('.')[0]}Z/${booking.start.replace(/[-:]/g, '').split('.')[0]}Z`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#f3f4f6', color: '#374151', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontSize: 13 }}>
            {t.addCal}
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf7', padding: '24px 16px' }}>
      <div style={{ maxWidth: step === 'form' ? 460 : 640, margin: '0 auto' }}>
        <Header />

        {/* STEP: pick slot */}
        {step === 'pick' && (
          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>{t.timezone}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {days.map(day => (
                <div key={day.date}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8, textTransform: 'capitalize' }}>
                    {lang === 'fr' ? day.label : day.label_en}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {day.slots.map(slot => (
                      <button key={slot.start}
                        onClick={() => { setSelectedDay(day); setSelectedSlot(slot); setStep('form') }}
                        style={{ padding: '10px 14px', background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#1a1918', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#c8a96e')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                        {lang === 'fr' ? slot.label_fr : slot.label_en}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: form */}
        {step === 'form' && selectedSlot && (
          <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: 16, padding: 24 }}>
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0, marginBottom: 16 }}>{t.back}</button>

            {/* Selected slot recap */}
            <div style={{ background: '#fdf8f0', borderRadius: 10, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: '#c8a96e', fontWeight: 500, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.slot}</p>
              <p style={{ fontSize: 14, color: '#1a1918', margin: 0, fontWeight: 500 }}>{lang === 'fr' ? selectedSlot.label_fr : selectedSlot.label_en}</p>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.firstName} *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.lastName} *</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.email} *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.phone}</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.message}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
              <button onClick={() => { void handleConfirm() }} disabled={submitting || !firstName || !email}
                style={{ width: '100%', padding: '14px', background: !firstName || !email ? '#e5e7eb' : '#c8a96e', color: !firstName || !email ? '#9ca3af' : 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: !firstName || !email ? 'not-allowed' : 'pointer' }}>
                {submitting ? t.confirming : (et ? (lang === 'fr' ? et.booking_button_text : et.booking_button_text_en) : t.confirm)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf7' }}><p style={{ color: '#9ca3af' }}>Chargement…</p></div>}>
      <BookingForm />
    </Suspense>
  )
}
