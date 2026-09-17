import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Postgres date columns reject "" — must be null when the source field is empty
function emptyToNull(v: string | undefined): string | null {
  return v && v.trim() !== '' ? v : null
}

// contacts.id_type has a CHECK constraint: only 'ktp' | 'passport' | 'other' (lowercase)
function normalizeIdType(v: string | undefined): string | null {
  const s = (v ?? '').trim().toLowerCase()
  return s === 'ktp' || s === 'passport' || s === 'other' ? s : null
}

// Called by an Airtable automation (customScript) when "Convention Signée" is checked.
// Creates a minimal, isolated Supabase dossier (status = 'airtable_bridge', invisible to
// every cron job in vercel.json) purely so the existing employer signature portal can run,
// then returns the signing link to include in the email sent to the employer.
export async function POST(request: Request) {
  const body = await request.json() as Record<string, string>

  if (!body.airtableInternRecordId || !body.companyName) {
    return NextResponse.json({ error: 'airtableInternRecordId and companyName are required' }, { status: 400 })
  }

  const sb = serviceClient()

  try {
    // 1. Company (host employer)
    const { data: company, error: companyErr } = await sb.from('companies').insert({
      name: body.companyName,
      legal_type: body.companyLegalType ?? null,
      address_street: body.companyAddress ?? null,
      address_city: body.companyCity ?? null,
      registration_country: body.companyCountry ?? null,
      nib: body.companyNib ?? null,
      npwp: body.companyNpwp ?? null,
      legal_details: {
        director_name: `${body.signatoryFirstName ?? ''} ${body.signatoryLastName ?? ''}`.trim(),
        director_nationality: body.signatoryNationality ?? '',
        director_dob: body.signatoryDob ?? '',
        director_dob_place: body.signatoryPlaceOfBirth ?? '',
        director_id_type: body.signatoryIdType ?? '',
        director_id_number: body.signatoryIdNumber ?? '',
        notary_name: body.companyNotaryName ?? '',
        deed_number: body.companyDeedNumber ?? '',
        deed_date: body.companyDeedDate ?? '',
        ahu_number: body.companyAhuNumber ?? '',
        ahu_date: body.companyAhuDate ?? '',
      },
    }).select().single()
    if (companyErr || !company) throw new Error(`companies: ${companyErr?.message}`)

    // 2. Contact (signatory / director)
    const { data: contact, error: contactErr } = await sb.from('contacts').insert({
      first_name: body.signatoryFirstName ?? '',
      last_name: body.signatoryLastName ?? '',
      email: body.signatoryEmail ?? null,
      job_title: body.signatoryJobTitle ?? null,
      nationality: body.signatoryNationality ?? null,
      date_of_birth: emptyToNull(body.signatoryDob),
      place_of_birth: body.signatoryPlaceOfBirth ?? null,
      id_type: normalizeIdType(body.signatoryIdType),
      id_number: body.signatoryIdNumber ?? null,
      company_id: company.id,
      is_legal_signatory: true,
    }).select().single()
    if (contactErr || !contact) throw new Error(`contacts: ${contactErr?.message}`)

    // 3. Minimal intern (needed only to satisfy cases.intern_id NOT NULL + fill the mission annex)
    const { data: intern, error: internErr } = await sb.from('interns').insert({
      first_name: body.internFirstName || 'À',
      last_name: body.internLastName || 'compléter',
      email: body.internEmail || `bridge-${Date.now()}@placeholder.bali-interns.com`,
    }).select().single()
    if (internErr || !intern) throw new Error(`interns: ${internErr?.message}`)

    // 4. Minimal job + job_submission (so the existing template engine fills the mission annex)
    const { data: destination } = await sb.from('destinations').select('id').limit(1).single()
    const { data: job, error: jobErr } = await sb.from('jobs').insert({
      title: body.jobTitle || 'Stage',
      public_title: body.jobTitle || 'Stage',
      description: body.jobDescription || '',
      company_id: company.id,
    }).select().single()
    if (jobErr || !job) throw new Error(`jobs: ${jobErr?.message}`)

    // 5. Case (status = airtable_bridge → excluded from every cron filter in vercel.json)
    const { data: caseRow, error: caseErr } = await sb.from('cases').insert({
      intern_id: intern.id,
      destination_id: destination?.id,
      status: 'airtable_bridge',
      source: 'airtable_bridge',
    }).select().single()
    if (caseErr || !caseRow) throw new Error(`cases: ${caseErr?.message}`)

    await sb.from('job_submissions').insert({
      case_id: caseRow.id,
      job_id: job.id,
      status: 'retained',
    })

    // 6. Employer portal access = the actual signing link
    const token = crypto.randomUUID()
    const { error: accessErr } = await sb.from('employer_portal_access').insert({
      token,
      company_id: company.id,
      contact_id: contact.id,
      signing_contact_id: contact.id,
      case_id: caseRow.id,
      airtable_company_record_id: body.airtableInternRecordId,
    })
    if (accessErr) throw new Error(`employer_portal_access: ${accessErr.message}`)

    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/employer/${token}`
    return NextResponse.json({ url, token })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
