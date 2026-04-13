import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendQualificationEmail } from '@/lib/email/resend'
import { logActivity } from '@/lib/activity-logger'

function generatePassword(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, portal_token, portal_temp_password, qualification_notes_for_intern, qualification_notes, interns(first_name, last_name, email)')
    .eq('id', id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; email?: string } | null
  if (!intern?.email) return NextResponse.json({ error: 'No intern email' }, { status: 400 })

  let portalToken = (caseRow as Record<string, unknown>).portal_token as string | null
  let tempPassword = (caseRow as Record<string, unknown>).portal_temp_password as string | null

  // Generate if missing
  if (!portalToken) portalToken = crypto.randomUUID()
  if (!tempPassword) tempPassword = generatePassword()

  await admin.from('cases').update({
    portal_token: portalToken,
    portal_temp_password: tempPassword,
  }).eq('id', id)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  const qualNotes = (caseRow as Record<string, unknown>).qualification_notes_for_intern as string
    ?? (caseRow as Record<string, unknown>).qualification_notes as string
    ?? ''

  await sendQualificationEmail({
    internEmail: intern.email,
    prenom: intern.first_name ?? 'Stagiaire',
    nom: intern.last_name ?? '',
    portalToken,
    tempPassword,
    qualificationNotes: qualNotes,
    portalUrl: `${appUrl}/portal/${portalToken}/login`,
  })

  await logActivity({
    caseId: id,
    type: 'email_sent',
    title: 'Email qualification envoyé',
    description: `Email de qualification avec accès portail envoyé à ${intern.email}`,
    metadata: { email_type: 'qualification', to: intern.email },
  })

  return NextResponse.json({ success: true })
}
