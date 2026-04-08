import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendNewLeadInternal } from '@/lib/email/resend'

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  nationalities: z.array(z.string()).optional(),
  sexe: z.string().optional(),
  birth_date: z.string().optional(),
  passport_expiry: z.string().optional(),
  linkedin_url: z.string().optional(),
  cv_url: z.string().optional(),
  spoken_languages: z.array(z.string()).optional(),
  desired_duration: z.string().optional(),
  desired_start_date: z.string().optional(),
  desired_end_date: z.string().nullable().optional(),
  main_desired_job: z.string().optional(),
  stage_ideal: z.string().optional(),
  commitment_price_accepted: z.boolean().optional(),
  commitment_budget_accepted: z.boolean().optional(),
  commitment_terms_accepted: z.boolean().optional(),
  touchpoint: z.string().optional(),
  referred_by_code: z.string().nullable().optional(),
  rdv_slot_start: z.string().nullable().optional(),
  rgpd: z.boolean(),
  // Legacy fields
  nationality: z.string().optional(),
  passport_number: z.string().optional(),
  passport_issue_city: z.string().optional(),
  passport_issue_date: z.string().optional(),
  school: z.string().optional(),
  intern_level: z.string().optional(),
  diploma_track: z.string().optional(),
  school_contact_name: z.string().optional(),
  school_contact_email: z.string().optional(),
  school_contact_phone: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  comment: z.string().optional(),
})

// Use service role for public submission
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const supabase = getServiceClient()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  // 1. Check email unique
  const { data: existing } = await supabase
    .from('interns')
    .select('id')
    .eq('email', d.email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Un dossier avec cet email existe déjà.' }, { status: 409 })
  }

  // 2. Validate affiliate code if provided
  let affiliateInternId: string | null = null
  if (d.referred_by_code) {
    const { data: affCode } = await supabase
      .from('affiliate_codes')
      .select('id, intern_id')
      .eq('code', d.referred_by_code)
      .eq('is_active', true)
      .maybeSingle()
    if (affCode) affiliateInternId = affCode.intern_id
  }

  try {
    // 3. INSERT intern
    const nationality = d.nationalities?.join(', ') ?? d.nationality ?? null
    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        phone: d.whatsapp ?? null,
        nationality,
        birth_date: d.birth_date || null,
        sexe: d.sexe || null,
        passport_expiry: d.passport_expiry || null,
        passport_number: d.passport_number || null,
        passport_issue_city: d.passport_issue_city || null,
        passport_issue_date: d.passport_issue_date || null,
        intern_level: d.intern_level || null,
        diploma_track: d.diploma_track || null,
        school: d.school || null,
        main_desired_job: d.main_desired_job || null,
        spoken_languages: d.spoken_languages ?? null,
        linkedin_url: d.linkedin_url || null,
        cv_url: d.cv_url || null,
        school_contact_name: d.school_contact_name || null,
        school_contact_email: d.school_contact_email || null,
        school_contact_phone: d.school_contact_phone || null,
        emergency_contact_name: d.emergency_contact_name || null,
        emergency_contact_phone: d.emergency_contact_phone || null,
        touchpoint: d.touchpoint || null,
        referred_by_code: d.referred_by_code || null,
        stage_ideal: d.stage_ideal || null,
        desired_duration: d.desired_duration || null,
        desired_end_date: d.desired_end_date || null,
        affiliate_id: affiliateInternId || null,
      })
      .select()
      .single()

    if (internError) return NextResponse.json({ error: internError.message }, { status: 500 })

    // 4. INSERT case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        status: d.rdv_slot_start ? 'rdv_booked' : 'lead',
        desired_start_date: d.desired_start_date || null,
        internship_type: 'stage',
        notes: d.comment || null,
        commitment_price_accepted: d.commitment_price_accepted ?? false,
        commitment_budget_accepted: d.commitment_budget_accepted ?? false,
        commitment_terms_accepted: d.commitment_terms_accepted ?? false,
        commitment_accepted_at: d.commitment_price_accepted ? new Date().toISOString() : null,
        commitment_ip: d.commitment_price_accepted ? ip : null,
        referred_by_code: d.referred_by_code || null,
        rdv_start_at: d.rdv_slot_start || null,
      })
      .select()
      .single()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })

    // 5. If affiliate code valid, increment referred count
    if (d.referred_by_code && affiliateInternId) {
      await supabase
        .from('affiliate_codes')
        .update({ total_referred: supabase.rpc('increment', { row_id: d.referred_by_code }) })
        .eq('code', d.referred_by_code)
    }

    // 6. Generate affiliate code for this new intern
    const code = `${d.first_name.toUpperCase().slice(0, 5)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    await supabase
      .from('affiliate_codes')
      .insert({ code, intern_id: intern.id, case_id: newCase.id })
      .select()
      .single()

    // 7. Activity feed
    await supabase.from('activity_feed').insert({
      case_id: newCase.id,
      action_type: 'case_created',
      description: `Candidature de ${d.first_name} ${d.last_name}${d.rdv_slot_start ? ' — RDV planifié' : ''}`,
    })

    // 8. Send internal email
    await sendNewLeadInternal({
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      startDate: d.desired_start_date ? new Date(d.desired_start_date).toLocaleDateString('fr-FR') : null,
      duration: d.desired_duration ? `${d.desired_duration} mois` : null,
      passportExpiry: d.passport_expiry || null,
      startDateValue: d.desired_start_date || null,
      desiredJob: d.main_desired_job || null,
      comment: d.stage_ideal || d.comment || null,
      caseId: newCase.id,
    })

    return NextResponse.json({
      case_id: newCase.id,
      intern_id: intern.id,
      portal_token: newCase.portal_token ?? null,
    }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
