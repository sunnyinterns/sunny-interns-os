import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { subject: string; body_html: string; to: string }

  if (!body.to || !body.subject || !body.body_html) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = getAdmin()
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'Bali Interns <team@bali-interns.com>',
    to: body.to,
    subject: body.subject,
    html: body.body_html,
  })

  // Clear the pending flag + log
  const { data: flagRow } = await admin.from('cases').select('alert_sent_flags').eq('id', id).single()
  const flags = (flagRow?.alert_sent_flags ?? {}) as Record<string, unknown>
  delete flags.pending_thank_you_email
  delete flags.thank_you_disqualification_reason

  await admin.from('cases').update({
    alert_sent_flags: { ...flags, thank_you_sent_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'email_sent',
    title: 'Thank you email sent',
    description: `Sent to ${body.to} — subject: ${body.subject}`,
    source: 'manual',
    status: 'completed',
  }).then(() => null, () => null)

  return NextResponse.json({ success: true })
}
