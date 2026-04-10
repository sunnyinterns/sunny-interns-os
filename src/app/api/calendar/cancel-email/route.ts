import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, intern_name, message, event_id, subject } = await req.json() as {
    to: string
    intern_name?: string
    message: string
    event_id?: string
    subject?: string
  }

  if (!to || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const emailSubject = subject ?? `Votre entretien Bali Interns`

  // Envoyer via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
      <img src="https://bali-interns.com/logo.png" alt="Bali Interns" style="height: 40px; margin-bottom: 24px;" />
      <div style="white-space: pre-line; color: #1a1918; font-size: 15px; line-height: 1.7;">
        ${message.replace(/\n/g, '<br/>')}
      </div>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;" />
      <p style="color: #a1a1aa; font-size: 12px;">Bali Interns · bali-interns.com</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Bali Interns <hello@bali-interns.com>',
      to: [to],
      subject: emailSubject,
      html,
    })
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  // Logger dans activity_feed si on a un event_id avec un case_id
  if (event_id) {
    const { data: calEv } = await supabase
      .from('calendar_events')
      .select('case_id')
      .eq('id', event_id)
      .single()

    if (calEv?.case_id) {
      await supabase.from('activity_feed').insert({
        case_id: calEv.case_id,
        type: 'email_sent',
        title: `Email envoyé : ${emailSubject}`,
        description: `Destinataire : ${to}`,
        source: 'manual',
        status: 'completed',
      }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true })
}
