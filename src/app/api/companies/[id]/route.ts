import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Colonnes autorisées dans le PATCH (évite d'envoyer des champs inconnus à Supabase)
const ALLOWED_COLUMNS = new Set([
  'name','destination','sector','industry','website','logo_url','company_type','type',
  'internship_city','city','google_maps_url','registration_country','legal_type',
  'nib','npwp','vat_number','registration_number','siret','tax_id','state_of_incorporation',
  'instagram_url','tiktok_url','linkedin_url','facebook_url','notes_internal','description',
  'company_size','is_employer','is_partner','is_supplier','address_street','address_postal_code',
  'address_city','legal_address','sponsor_company_id','partner_timing','partner_category',
  'partner_deal','partner_visible_from','is_active','collaboration_status',
  'collaboration_ended_at','collaboration_ended_by','info_validated_by_contact',
  'info_validated_at','info_validated_contact_id','onboarding_token',
  'onboarding_completed_at','onboarding_form_sent_at','can_host_directly',
])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        contacts!company_id(id, first_name, last_name, job_title, email, whatsapp, phone, linkedin_url, gender, left_company, left_company_at),
        jobs(id, title, public_title, status, location, created_at)
      `)
      .eq('id', id)
      .single()
    if (error) throw error

    // Stagiaires via job_submissions → jobs → company_id
    const { data: jobIds } = await supabase.from('jobs').select('id').eq('company_id', id)
    let stagiaires: { id: string; status: string; intern: { first_name: string; last_name: string } | null }[] = []
    if (jobIds && jobIds.length > 0) {
      const ids = jobIds.map((j: { id: string }) => j.id)
      const { data: submissions } = await supabase
        .from('job_submissions')
        .select('case_id, cases(id, status, interns(first_name, last_name))')
        .in('job_id', ids)
      if (submissions) {
        const seen = new Set<string>()
        for (const s of (submissions as unknown) as Array<{ case_id: string; cases: { id: string; status: string; interns: { first_name: string; last_name: string } | null } | null }>) {
          if (s.cases && !seen.has(s.case_id)) {
            seen.add(s.case_id)
            stagiaires.push({ id: s.cases.id, status: s.cases.status, intern: s.cases.interns ?? null })
          }
        }
      }
    }

    return NextResponse.json({ ...data, stagiaires })
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[GET /api/companies/[id]]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json() as Record<string, unknown>
    // Filtrer uniquement les colonnes autorisées
    const safeBody: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_COLUMNS.has(k)) safeBody[k] = v
    }
    safeBody.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('companies')
      .update(safeBody)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('[PATCH /api/companies/[id]] Supabase error:', error)
      throw error
    }
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e)
    console.error('[PATCH /api/companies/[id]]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', id)
      .eq('status', 'open')
      .limit(1)
    if (activeJobs && activeJobs.length > 0) {
      return NextResponse.json({ error: 'HAS_ACTIVE_JOBS' }, { status: 409 })
    }
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : JSON.stringify(e) }, { status: 500 })
  }
}
