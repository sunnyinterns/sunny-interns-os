'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface FlightData {
  flight_number?: string | null
  flight_departure_city?: string | null
  flight_arrival_time_local?: string | null
  billet_avion?: boolean | null
}

export default function BilletPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''

  const [data, setData] = useState<FlightData | null>(null)
  const [loading, setLoading] = useState(true)

  const [flightNumber, setFlightNumber] = useState('')
  const [departureCity, setDepartureCity] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')

  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.ok ? r.json() as Promise<FlightData> : null)
      .then(d => {
        if (d) {
          setData(d)
          setFlightNumber(d.flight_number ?? '')
          setDepartureCity(d.flight_departure_city ?? '')
          setArrivalTime(d.flight_arrival_time_local ?? '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  async function handleUpload(file: File) {
    if (file.size > 20 * 1024 * 1024) { setError('File too large (max 20MB)'); return }
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('token', token)
      fd.append('field', 'billet_url')
      fd.append('type', 'billet')
      const res = await fetch(`/api/portal/${token}/billet-upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const d = await res.json() as { url: string }
      setUploadedUrl(d.url)
      setTicketUrl(d.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload error')
    } finally { setUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!flightNumber || !arrivalDate) { setError('Flight number and arrival date are required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/billet`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightNumber, departureCity,
          dateArrivee: arrivalDate,
          heureArrivee: arrivalTime,
          billetUrl: ticketUrl,
          dropoffAddress,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none',
    background: 'white', color: '#1A1A1A',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
  }

  if (loading) return <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: 48 }}>Loading…</p>

  if (saved) return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Flight details saved!</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Our team has been notified and will organise your airport pickup.</p>
      <Link href={`/portal/${token}`} style={{ color: '#FFCC00', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to my portal</Link>
    </div>
  )

  return (
    <div>
      <Link href={`/portal/${token}`} style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← Back
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: '0 0 4px' }}>✈️ My flight to Bali</h1>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Share your flight details so we can organise your airport pickup.</p>

      {/* Already saved indicator */}
      {data?.billet_avion && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #0d9e75', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#065f46', margin: 0 }}>Flight details saved</p>
            <p style={{ fontSize: 12, color: '#166534', margin: 0 }}>You can update them below if anything changes.</p>
          </div>
        </div>
      )}

      <form onSubmit={e => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Flight document upload */}
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '16px' }}>
          <label style={{ ...lbl, marginBottom: 4 }}>Flight document (optional)</label>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>Upload your e-ticket PDF or screenshot — helps our team prepare your pickup.</p>

          {uploadedUrl || ticketUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📎</span>
              <a href={uploadedUrl ?? ticketUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#FFCC00', fontWeight: 600, textDecoration: 'none', flex: 1 }}>
                View uploaded ticket
              </a>
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Replace
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width: '100%', padding: '12px', border: '2px dashed #e5e7eb', borderRadius: 10, background: '#fafaf9', fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontWeight: 500 }}>
              {uploading ? '⏳ Uploading…' : '📎 Upload flight ticket (PDF or image)'}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f) }} />
        </div>

        {/* Flight number */}
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
          <label style={lbl}>Flight number <span style={{ color: '#dc2626' }}>*</span></label>
          <input required style={inp} placeholder="e.g. SQ321" value={flightNumber}
            onChange={e => setFlightNumber(e.target.value)} />
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>The flight number of your last leg arriving in Bali (DPS).</p>
        </div>

        {/* Arrival date + time */}
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Arrival date in Bali <span style={{ color: '#dc2626' }}>*</span></label>
              <input required type="date" style={inp} value={arrivalDate}
                onChange={e => setArrivalDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Local arrival time</label>
              <input type="text" style={inp} placeholder="e.g. 14:35" value={arrivalTime}
                onChange={e => setArrivalTime(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Departure city */}
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
          <label style={lbl}>Departure city (last leg)</label>
          <input style={inp} placeholder="e.g. Singapore (SIN)" value={departureCity}
            onChange={e => setDepartureCity(e.target.value)} />
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>The city where you board your last flight before Bali.</p>
        </div>

        {/* Drop-off address */}
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
          <label style={{ ...lbl, marginBottom: 4 }}>Drop-off address <span style={{ color: '#dc2626' }}>*</span></label>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Where should the driver take you? Give us your guesthouse name + area, or a precise address.</p>
          <input
            required
            style={inp}
            placeholder="e.g. Bali Eco Stay, Jl. Pantai Berawa, Canggu"
            value={dropoffAddress}
            onChange={e => setDropoffAddress(e.target.value)}
          />
        </div>

        {/* Pickup info */}
        <div style={{ background: '#fffbf0', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: '0 0 4px' }}>🚗 Airport pickup included</p>
          <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>Your driver will meet you at Ngurah Rai Airport (DPS). We&apos;ll share their contact 24h before your arrival.</p>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626', padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={saving}
          style={{ width: '100%', padding: 14, background: '#FFCC00', color: '#1A1A1A', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : '✅ Save my flight details'}
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
          Questions? <a href="mailto:team@bali-interns.com" style={{ color: '#FFCC00' }}>team@bali-interns.com</a>
        </p>
      </form>
    </div>
  )
}
