import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/[token]/reset-password
// Called from the intern login page ("Forgot password")
// Generates a new temp password and triggers qualification email resend
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = getAdmin()

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, portal_token, portal_password_hash, interns(first_name, email)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; email?: string } | null
  if (!intern?.email) return NextResponse.json({ error: 'No intern email' }, { status: 400 })

  // Generate new temp password
  const adjectives = ['Bali', 'Surf', 'Rice', 'Palm', 'Reef', 'Wave', 'Jade', 'Kuta']
  const numbers = Math.floor(1000 + Math.random() * 9000)
  const newPassword = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${numbers}`

  await admin.from('cases').update({
    portal_password_hash: newPassword,
    updated_at: new Date().toISOString(),
  }).eq('id', (caseRow as Record<string, unknown>).id as string)

  // Send email with new password
  try {
    const { data: tmpl } = await admin
      .from('email_templates')
      .select('subject, body_html')
      .eq('slug', 'qualification_email')
      .eq('is_active', true)
      .single()

    if (tmpl?.subject && tmpl?.body_html) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
      const portalUrl = `${appUrl}/portal/${token}`
      let subject = (tmpl.subject as string).replace(/{{first_name}}/g, intern.first_name ?? 'there')
      let html = (tmpl.body_html as string)
        .replace(/{{first_name}}/g, intern.first_name ?? 'there')
        .replace(/{{temp_password}}/g, newPassword)
        .replace(/{{portal_url}}/g, portalUrl)
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Bali Interns <team@bali-interns.com>',
        to: intern.email,
        subject: `[New password] ${subject}`,
        html,
      })
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, message: 'A new password has been sent to your email.' })
}
