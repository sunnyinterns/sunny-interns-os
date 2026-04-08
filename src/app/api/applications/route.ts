import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logActivity } from '@/lib/activity-logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const applicationSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(1),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  passport_expiry: z.string().optional(),
  linkedin_url: z.string().nullable().optional(),
  cv_url: z.string().optional(),
  spoken_languages: z.array(z.string()).optional(),
  desired_jobs: z.array(z.string()).optional(),
  duration: z.string().optional(),
  start_date: z.string().optional(),
  stage_ideal: z.string().optional(),
  touchpoint: z.string().optional(),
  referred_by_code: z.string().nullable().optional(),
  commitment_price_accepted: z.boolean().optional(),
  commitment_budget_accepted: z.boolean().optional(),
  commitment_terms_accepted: z.boolean().optional(),
  rdv_slot: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = applicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data
    const supabase = getServiceClient()

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('interns')
      .select('id')
      .eq('email', d.email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    // Parse duration months
    const durationMatch = d.duration?.match(/^(\d+)/)
    const durationMonths = durationMatch ? parseInt(durationMatch[1]) : null

    // Get commitment IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

    // Create intern
    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        whatsapp: d.whatsapp,
        sexe: d.gender ?? null,
        nationality: d.nationality ?? null,
        birth_date: d.birth_date ?? null,
        passport_expiry: d.passport_expiry ?? null,
        linkedin_url: d.linkedin_url ?? null,
        cv_url: d.cv_url ?? null,
        spoken_languages: d.spoken_languages ?? [],
        main_desired_job: d.desired_jobs?.[0] ?? null,
        stage_ideal: d.stage_ideal ?? null,
        touchpoint: d.touchpoint ?? null,
        referred_by_code: d.referred_by_code ?? null,
        commitment_price_accepted: d.commitment_price_accepted ?? false,
        commitment_budget_accepted: d.commitment_budget_accepted ?? false,
        commitment_terms_accepted: d.commitment_terms_accepted ?? false,
        commitment_accepted_at: new Date().toISOString(),
        commitment_ip: ip,
        preferred_language: 'fr',
      })
      .select('id')
      .single()

    if (internError) {
      return NextResponse.json({ error: internError.message }, { status: 500 })
    }

    // Get default destination (Bali)
    const { data: dest } = await supabase
      .from('destinations')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    // Generate portal token
    const portalToken = crypto.randomUUID()

    // Create case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        destination_id: dest?.id ?? 'fc9ece85-e5d5-41d2-9142-79054244bbce',
        status: 'lead',
        desired_start_date: d.start_date ?? null,
        desired_duration_months: durationMonths,
        desired_sectors: d.desired_jobs ?? [],
        portal_token: portalToken,
        assigned_manager_name: 'Charly Gestede',
        intern_first_meeting_date: d.rdv_slot ?? null,
      })
      .select('id')
      .single()

    if (caseError) {
      return NextResponse.json({ error: caseError.message }, { status: 500 })
    }

    // If referred_by_code, verify affiliate code exists
    if (d.referred_by_code) {
      await supabase
        .from('affiliate_codes')
        .select('id')
        .eq('code', d.referred_by_code)
        .maybeSingle()
        .then(({ data: aff }) => {
          if (aff) {
            // Update intern with affiliate reference — already stored via referred_by_code
          }
        })
    }

    // Log activity
    await logActivity({
      caseId: newCase.id,
      type: 'case_created' as 'status_changed',
      title: `Nouveau dossier créé — ${d.first_name} ${d.last_name}`,
      description: `${d.first_name} ${d.last_name} a soumis sa candidature via /apply`,
      source: 'candidature',
    })

    // Email confirmation (log if Resend not configured)
    try {
      const { sendNewLeadInternal } = await import('@/lib/email/resend')
      void sendNewLeadInternal({
        firstName: d.first_name,
        lastName: d.last_name,
        email: d.email,
        startDate: d.start_date ? new Date(d.start_date).toLocaleDateString('fr-FR') : null,
        passportExpiry: d.passport_expiry ?? null,
        startDateValue: d.start_date ?? null,
        caseId: newCase.id,
      })
    } catch {
      // Resend not configured — skip email
    }

    return NextResponse.json({
      success: true,
      portal_token: portalToken,
      case_id: newCase.id,
      intern_id: intern.id,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, { status: 500 })
  }
}
