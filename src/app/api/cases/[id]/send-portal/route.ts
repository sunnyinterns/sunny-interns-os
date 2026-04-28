import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeKitShort } from '@/lib/email/resend'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: c } = await supabase
    .from('cases')
    .select('id, portal_token, temp_password, interns(first_name, last_name, email)')
    .eq('id', id)
    .single()

  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const intern = c.interns as { first_name?: string; last_name?: string; email?: string } | null
  if (!intern?.email) return NextResponse.json({ error: 'No intern email' }, { status: 400 })

  await sendWelcomeKitShort({
    internEmail: intern.email,
    prenom: intern.first_name ?? 'Candidate',
    portalToken: c.portal_token ?? undefined,
  })

  await supabase.from('cases').update({
    portal_sent_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}
