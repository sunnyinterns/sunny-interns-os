import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const sb = svc()
  const { token } = await params
  const body = await request.json() as Record<string, unknown>

  // Verify token
  const { data: access } = await sb
    .from('employer_portal_access')
    .select('company_id')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  const companyId = (access as Record<string, unknown>).company_id as string

  const { data: contact, error } = await sb
    .from('contacts')
    .insert({
      company_id: companyId,
      first_name: body.first_name as string,
      last_name: body.last_name as string,
      job_title: body.job_title as string ?? null,
      email: body.email as string ?? null,
      whatsapp: body.whatsapp as string ?? null,
      nationality: body.nationality as string ?? null,
      date_of_birth: body.date_of_birth as string ?? null,
      place_of_birth: body.place_of_birth as string ?? null,
      id_type: body.id_type as string ?? null,
      id_number: body.id_number as string ?? null,
      is_legal_signatory: true,
    })
    .select('id, first_name, last_name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(contact)
}
