import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>
  const token = body.token as string | undefined
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = getAdmin()

  const { data: pkg } = await supabase
    .from('packages')
    .select('id, is_direct_client, is_active')
    .eq('direct_client_form_token', token)
    .eq('is_direct_client', true)
    .eq('is_active', true)
    .maybeSingle()

  if (!pkg) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const internPayload = {
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    email: body.email ?? null,
    whatsapp: body.whatsapp ?? null,
    birth_date: body.birth_date ?? null,
    nationalities: body.nationalities ?? null,
    passport_number: body.passport_number ?? null,
    passport_expiry: body.passport_expiry ?? null,
    mother_first_name: body.mother_first_name ?? null,
    mother_last_name: body.mother_last_name ?? null,
    desired_start_date: body.desired_start_date ?? null,
    ...(body.documents as Record<string, string> ?? {}),
  }

  // Map document keys → intern columns
  const docs = body.documents as Record<string, string> | undefined
  if (docs) {
    if (docs.passport_page4) (internPayload as Record<string, unknown>).passport_page4_url = docs.passport_page4
    if (docs.photo_id) (internPayload as Record<string, unknown>).photo_id_url = docs.photo_id
    if (docs.bank_statement) (internPayload as Record<string, unknown>).bank_statement_url = docs.bank_statement
    if (docs.return_ticket) (internPayload as Record<string, unknown>).return_plane_ticket_url = docs.return_ticket
  }

  const { data: intern, error: internErr } = await supabase
    .from('interns')
    .insert(internPayload)
    .select()
    .single()

  if (internErr || !intern) return NextResponse.json({ error: internErr?.message ?? 'Failed to create intern' }, { status: 500 })

  const { data: newCase, error: caseErr } = await supabase
    .from('cases')
    .insert({
      intern_id: intern.id,
      package_id: pkg.id,
      status: 'visa_docs_sent',
      is_direct_client: true,
    })
    .select()
    .single()

  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 })

  return NextResponse.json({ success: true, case_id: newCase.id })
}
