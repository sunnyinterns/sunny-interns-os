'use client'

import { useState, useEffect } from 'react'

interface EmailDraftPanelProps {
  caseId: string
  to: string
  templateSlug: string
  templateVars: Record<string, string>
  label: string           // ex: "Thank you email"
  onSent?: () => void
}

export function EmailDraftPanel({ caseId, to, templateSlug, templateVars, label, onSent }: EmailDraftPanelProps) {
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyText, setBodyText] = useState('') // editable plain text version
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch template from DB and pre-fill
    fetch(`/api/email-templates/by-slug/${templateSlug}`)
      .then(r => r.ok ? r.json() as Promise<{ subject: string; body_html: string }> : null)
      .then(tmpl => {
        if (!tmpl) return
        let s = tmpl.subject
        let h = tmpl.body_html
        for (const [k, v] of Object.entries(templateVars)) {
          const re = new RegExp(`{{${k}}}`, 'g')
          s = s.replace(re, v)
          h = h.replace(re, v)
        }
        setSubject(s)
        setBodyHtml(h)
        // Plain text for editing — strip HTML tags
        setBodyText(h.replace(/<[^>]+>/g, '').replace(/\n\n+/g, '\n\n').trim())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [templateSlug, JSON.stringify(templateVars)])

  // Rebuild HTML from edited plain text
  function buildHtml(text: string): string {
    return text
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n')
  }

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      const finalHtml = buildHtml(bodyText)
      const res = await fetch(`/api/cases/${caseId}/send-thank-you`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body_html: finalHtml }),
      })
      if (!res.ok) throw new Error('Send failed')
      setSent(true)
      onSent?.()
    } catch {
      setError('Failed to send — try again')
    } finally {
      setSending(false)
    }
  }

  if (sent) return (
    <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
      ✅ {label} sent to {to}
    </div>
  )

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#fafaf9', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>✉️</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A' }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>To: {to}</span>
      </div>

      {loading ? (
        <div style={{ padding: '20px', fontSize: '12px', color: '#9ca3af' }}>Loading template…</div>
      ) : (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Subject */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#1A1A1A', background: 'white', boxSizing: 'border-box' }}
            />
          </div>

          {/* Body — editable plain text */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
              Message
            </label>
            <textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              rows={8}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#1A1A1A', background: 'white', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {error && <p style={{ fontSize: '12px', color: '#dc2626' }}>{error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSend}
              disabled={sending || !subject || !bodyText}
              style={{
                padding: '8px 16px', background: '#1A1A1A', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending…' : `Send ${label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
