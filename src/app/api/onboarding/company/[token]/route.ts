import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('companies')
    .select('name, onboarding_completed_at')
    .eq('onboarding_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getServiceClient()

  const body = await request.json() as Record<string, unknown>

  // Verify token
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('onboarding_token', token)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {
    onboarding_completed_at: new Date().toISOString(),
    company_type: body.company_type,
    registration_country: body.registration_country,
    domiciliation: body.domiciliation,
    website: body.website,
    npwp: body.npwp || null,
    nib: body.nib || null,
    legal_registration_number: body.legal_registration_number || body.siret || null,
    hr_contact_title: body.hr_contact_title || null,
    hr_contact_whatsapp: body.hr_whatsapp || null,
  }

  // Update company name if provided
  if (body.name) updates.name = body.name

  const { error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', company.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create or update HR contact
  if (body.hr_email) {
    await supabase.from('contacts').upsert({
      first_name: body.hr_first_name as string,
      last_name: body.hr_last_name as string,
      email: body.hr_email as string,
      whatsapp: (body.hr_whatsapp as string) || null,
      job_title: (body.hr_contact_title as string) || null,
      company_id: company.id,
      contact_type: 'employer',
    }, { onConflict: 'email' })
  }

  return NextResponse.json({ success: true })
}
