import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await request.json() as { email?: string; password?: string }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, portal_token, portal_temp_password, portal_activated_at, interns!inner(email)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }

  const intern = (caseRow as Record<string, unknown>).interns as { email: string } | null
  if (!intern || intern.email.toLowerCase() !== body.email.toLowerCase()) {
    return NextResponse.json({ error: 'Email incorrect' }, { status: 401 })
  }

  if ((caseRow as Record<string, unknown>).portal_temp_password !== body.password) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  // Mark as activated on first login
  if (!(caseRow as Record<string, unknown>).portal_activated_at) {
    await admin
      .from('cases')
      .update({ portal_activated_at: new Date().toISOString() })
      .eq('id', (caseRow as Record<string, unknown>).id as string)
  }

  return NextResponse.json({ success: true, caseId: (caseRow as Record<string, unknown>).id })
}
