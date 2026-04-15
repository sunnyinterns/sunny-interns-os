import { createClient as sbClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return sbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = svc()
  const { token } = await params

  const { data: access } = await sb
    .from('employer_portal_access')
    .select('*, companies(*), contacts(id,first_name,last_name,email,whatsapp,job_title), sponsor_contract_signed_at, sponsor_contract_signed_by, sponsor_contract_signature_data')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  if (!access.viewed_at) {
    await sb
      .from('employer_portal_access')
      .update({ viewed_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
      .eq('token', token)
  }

  const { data: jobs } = await sb
    .from('jobs')
    .select('id,title,public_title,status,wished_duration_months,location,description')
    .eq('company_id', access.company_id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  return NextResponse.json({ access, jobs: jobs ?? [] })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sb = svc()
  const { token } = await params
  const body = await request.json() as Record<string, unknown>

  const { data: access } = await sb
    .from('employer_portal_access')
    .select('company_id,contact_id,contacts(first_name,last_name,email)')
    .eq('token', token)
    .single()

  if (!access) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })

  // Handle contract signing
  if (body.action === 'sign_contract') {
    const contact = (access as Record<string, unknown>).contacts as { first_name?: string; last_name?: string; email?: string } | null
    const signedBy = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ')

    // Apply company corrections if provided
    const corrections = body.company_corrections as Record<string, unknown> | null
    if (corrections && Object.keys(corrections).length > 0) {
      const allowedCorrections = ['name', 'address_street', 'nib', 'npwp', 'siret']
      const corrUpd: Record<string, unknown> = {}
      for (const k of allowedCorrections) if (k in corrections) corrUpd[k] = corrections[k]
      if (Object.keys(corrUpd).length) {
        await sb.from('companies').update(corrUpd).eq('id', (access as unknown as Record<string, string>).company_id)
      }
    }

    // Save signature on employer_portal_access
    await sb.from('employer_portal_access').update({
      sponsor_contract_signed_at: new Date().toISOString(),
      sponsor_contract_signed_by: signedBy,
      sponsor_contract_signature_data: body.signature_data as string,
      last_active_at: new Date().toISOString(),
    }).eq('token', token)

    // Notify manager
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Sunny Interns <team@bali-interns.com>',
      to: 'charly@bali-interns.com',
      subject: `✅ Contrat Sponsor signé — ${signedBy}`,
      html: `<p>Le Contrat Sponsor a été signé par <strong>${signedBy}</strong>.</p><p>À vérifier dans le dossier.</p>`,
    })

    return NextResponse.json({ success: true })
  }

  // Default: update company info
  const allowed = ['name', 'description', 'website', 'instagram_url', 'linkedin_url', 'address_street', 'address_postal_code', 'address_city', 'nib', 'npwp', 'siret']
  const upd: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) upd[k] = body[k]

  if (Object.keys(upd).length) {
    upd.info_validated_by_contact = true
    upd.info_validated_at = new Date().toISOString()
    upd.info_validated_contact_id = (access as unknown as Record<string, string>).contact_id
    await sb.from('companies').update(upd).eq('id', (access as unknown as Record<string, string>).company_id)
    await sb
      .from('employer_portal_access')
      .update({ company_info_validated: true, company_info_validated_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
      .eq('token', token)
  }

  return NextResponse.json({ success: true })
}
