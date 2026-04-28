import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { token } = await params
  const body = await req.json() as { note?: string }

  const { data: c } = await sb
    .from('cases')
    .select('id, interns(first_name, last_name, email), payment_amount')
    .eq('portal_token', token)
    .single()

  if (!c) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const update: Record<string, unknown> = {
    payment_notified_by_intern_at: new Date().toISOString(),
  }
  if (body.note) update.payment_notified_by_intern_note = body.note

  await sb.from('cases').update(update).eq('portal_token', token)

  const intern = c.interns as { first_name?: string; last_name?: string; email?: string } | null
  const name = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')

  await resend.emails.send({
    from: 'Bali Interns <team@bali-interns.com>',
    to: 'charly@bali-interns.com',
    subject: `💰 Payment notified — ${name}`,
    html: `<p><strong>${name}</strong> has notified a payment.</p>` +
      (body.note ? `<p>Note: ${body.note}</p>` : '') +
      `<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'}/fr/cases/${c.id}">Verify and validate in the case →</a></p>`,
  })

  return NextResponse.json({ success: true })
}
