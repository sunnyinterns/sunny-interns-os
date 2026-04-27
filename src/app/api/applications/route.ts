import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ALLOWED_ORIGINS = ["https://bali-interns-website.vercel.app","https://bali-interns.com","https://www.bali-interns.com","http://localhost:3001","http://localhost:3000"];
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

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
  school_country: z.string().nullable().optional(),
  nationalities: z.array(z.string()).optional(),
  birth_date: z.string().nullable().optional().transform(v => v || null),
  passport_expiry: z.string().nullable().optional().transform(v => v || null),
  linkedin_url: z.string().nullable().optional(),
  cv_url: z.string().nullable().optional(),
  local_cv_url: z.string().nullable().optional(),
  spoken_languages: z.array(z.string()).optional(),
  desired_jobs: z.array(z.string()).optional(),
  custom_jobs: z.array(z.string()).optional(),
  duration: z.string().nullable().optional(),
  start_date: z.string().nullable().optional().transform(v => v || null),
  stage_ideal: z.string().nullable().optional(),
  school_name: z.string().nullable().optional(),
  school_id: z.string().nullable().optional(),
  touchpoint: z.string().nullable().optional(),
  touchpoints: z.array(z.string()).optional(),
  referred_by_code: z.string().nullable().optional(),
  commitment_price_accepted: z.boolean().optional(),
  commitment_budget_accepted: z.boolean().optional(),
  commitment_terms_accepted: z.boolean().optional(),
  rdv_slot: z.string().nullable().optional().transform(v => v || null),
  school_not_found: z.boolean().optional(),
  school_custom_name: z.string().nullable().optional(),
  extra_docs_urls: z.array(z.string()).optional(),
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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

    // Résoudre les UUIDs des job types en labels lisibles (EN)
    const desiredJobUUIDs = [...(d.desired_jobs ?? []), ...(d.custom_jobs ?? [])].filter(Boolean)
    const resolvedJobLabels: string[] = []
    if (desiredJobUUIDs.length > 0) {
      const { data: jobTypes } = await supabase.from('job_types')
        .select('id, name_en, name').in('id', desiredJobUUIDs)
      const jobMap = new Map((jobTypes ?? []).map((j: Record<string,string>) => [j.id, j.name_en ?? j.name]))
      for (const uuid of desiredJobUUIDs) {
        resolvedJobLabels.push(jobMap.get(uuid) ?? uuid) // fallback à l'UUID si pas trouvé
      }
    }

    // Fetcher le manager actif (priorité 1) pour assigned_manager_name
    const { data: activeManager } = await supabase.from('scheduling_managers')
      .select('name').eq('is_active', true).order('priority', { ascending: true }).limit(1).maybeSingle()
    const assignedManagerName = String(activeManager?.name ?? 'Charly Gestede')
    const durationMonths = d.duration ? parseInt(d.duration) : null
    const allJobs = desiredJobUUIDs // UUIDs gardés pour le matching intern
    // desired_sectors stocke les labels lisibles (EN) pour affichage dans l'OS

    // School pending si le candidat a tapé une école introuvable
    if (d.school_not_found && d.school_custom_name?.trim()) {
      await supabase.from('schools_pending').insert({
        name: d.school_custom_name.trim(),
        submitted_by_email: d.email,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      }).then(() => null, () => null)
    }

    const internFields = {
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      whatsapp: d.whatsapp,
      nationality: d.nationalities?.[0] ?? null,
      nationalities: d.nationalities ?? [],
      school_name: d.school_name ?? null,
      school_country: d.school_country ?? null,
      desired_start_date: d.start_date || null,
      desired_duration_months: durationMonths,
      desired_jobs: allJobs,
      birth_date: d.birth_date || null,
      passport_expiry: d.passport_expiry || null,
      linkedin_url: d.linkedin_url ?? null,
      cv_url: d.cv_url?.trim() || null,
      local_cv_url: d.local_cv_url?.trim() || null,
      spoken_languages: d.spoken_languages ?? [],
      main_desired_job: allJobs[0] ?? null,
      stage_ideal: d.stage_ideal ?? null,
      touchpoint: d.touchpoints?.join(', ') ?? d.touchpoint ?? null,
      touchpoints: d.touchpoints ?? [],
      referred_by_code: d.referred_by_code ?? null,
      extra_docs_urls: d.extra_docs_urls?.filter(Boolean) ?? null,
      commitment_price_accepted: d.commitment_price_accepted ?? true,
      commitment_budget_accepted: d.commitment_budget_accepted ?? true,
      commitment_terms_accepted: d.commitment_terms_accepted ?? true,
      commitment_accepted_at: new Date().toISOString(),
      commitment_ip: ip,
      preferred_language: 'en',
      source: 'apply_form',
      updated_at: new Date().toISOString(),
    }

    // Vérifier si email existe (lead incomplet via capture-email)
    const { data: existingIntern } = await supabase
      .from('interns')
      .select('id, first_name')
      .eq('email', d.email)
      .maybeSingle()

    let internId: string
    let caseId: string
    let portalToken: string

    if (existingIntern) {
      // Si dossier complet (first_name rempli) → 409
      if (existingIntern.first_name && existingIntern.first_name.trim() !== '') {
        return NextResponse.json({ error: 'Cet email est déjà utilisé / This email is already linked to an application.' }, { status: 409 })
      }

      // Lead incomplet → UPDATE intern avec toutes les données
      const { data: updated, error: upErr } = await supabase
        .from('interns')
        .update(internFields)
        .eq('id', existingIntern.id)
        .select('id')
        .single()
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      internId = updated.id

      // Mettre à jour le case existant
      const { data: existingCase } = await supabase
        .from('cases')
        .select('id, portal_token')
        .eq('intern_id', internId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingCase) {
        await supabase.from('cases').update({
          status: 'lead',
          desired_start_date: d.start_date || null,
          desired_duration_months: durationMonths,
          desired_sectors: resolvedJobLabels,
          school_id: d.school_id ?? null,
          intern_first_meeting_date: d.rdv_slot ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', existingCase.id)
        caseId = existingCase.id
        portalToken = existingCase.portal_token ?? crypto.randomUUID()
      } else {
        // Créer un case si pas encore
        const { data: dest } = await supabase.from('destinations').select('id').eq('is_active', true).limit(1).maybeSingle()
        portalToken = crypto.randomUUID()
        const { data: nc, error: ncErr } = await supabase.from('cases').insert({
          intern_id: internId,
          destination_id: dest?.id ?? 'fc9ece85-e5d5-41d2-9142-79054244bbce',
          status: 'lead',
          desired_start_date: d.start_date || null,
          desired_duration_months: durationMonths,
          desired_sectors: resolvedJobLabels,
          school_id: d.school_id ?? null,
          portal_token: portalToken,
          assigned_manager_name: assignedManagerName,
          intern_first_meeting_date: d.rdv_slot ?? null,
        }).select('id').single()
        if (ncErr) return NextResponse.json({ error: ncErr.message }, { status: 500 })
        caseId = nc.id
      }
    } else {
      // Nouveau candidat → INSERT intern
      const { data: newIntern, error: internErr } = await supabase
        .from('interns')
        .insert({ ...internFields })
        .select('id')
        .single()
      if (internErr) return NextResponse.json({ error: internErr.message }, { status: 500 })
      internId = newIntern.id

      // Créer le case
      const { data: dest } = await supabase.from('destinations').select('id').eq('is_active', true).limit(1).maybeSingle()
      portalToken = crypto.randomUUID()
      const { data: nc, error: ncErr } = await supabase.from('cases').insert({
        intern_id: internId,
        destination_id: dest?.id ?? 'fc9ece85-e5d5-41d2-9142-79054244bbce',
        status: 'lead',
        desired_start_date: d.start_date || null,
        desired_duration_months: durationMonths,
        desired_sectors: resolvedJobLabels,
        school_id: d.school_id ?? null,
        portal_token: portalToken,
        assigned_manager_name: assignedManagerName,
        intern_first_meeting_date: d.rdv_slot ?? null,
      }).select('id').single()
      if (ncErr) return NextResponse.json({ error: ncErr.message }, { status: 500 })
      caseId = nc.id
    }

    // Case créé en status 'lead'. Il passera en 'rdv_booked' via /api/scheduling/confirm une fois le RDV pris.

    // Log activity_feed
    await supabase.from('activity_feed').insert({
      case_id: caseId,
      type: 'case_created',
      title: `${d.first_name} ${d.last_name} a terminé sa candidature`,
      description: `${d.first_name} ${d.last_name} (${d.email}) a complété le formulaire de candidature et pris son RDV de qualification.`,
      priority: 'normal',
      status: 'completed',
      source: 'automation',
      metadata: {
        email: d.email,
        school: d.school_country,
        desired_jobs: allJobs,
        touchpoint: d.touchpoints?.join(', ') ?? d.touchpoint,
      },
    }).then(() => null, () => null)

    // Notification admin
    await supabase.from('admin_notifications').insert({
      type: 'new_application',
      title: `Nouvelle candidature — ${d.first_name} ${d.last_name}`,
      message: `${d.first_name} ${d.last_name} (${d.email}) vient de candidater`,
      link: `/fr/cases/${caseId}`,
      metadata: { case_id: caseId, intern_id: internId },
    }).then(() => null, () => null)

    // Email interne Charly
    try {
      const { sendNewLeadInternal } = await import('@/lib/email/resend')
      void sendNewLeadInternal({
        firstName: d.first_name,
        lastName: d.last_name,
        email: d.email,
        startDate: d.start_date ? new Date(d.start_date).toLocaleDateString('fr-FR') : null,
        passportExpiry: d.passport_expiry ?? null,
        startDateValue: d.start_date ?? null,
        caseId,
      })
    } catch { /* Resend not configured */ }

    // Email confirmation candidat via template apply_confirmation_en (EN)
    try {
      const { sendApplyConfirmationEN } = await import('@/lib/email/resend')
      await sendApplyConfirmationEN({
        internEmail: d.email,
        firstName: d.first_name,
        portalToken,
      })
    } catch (emailErr) { console.error('[applications] confirmation email error:', emailErr) }

    return NextResponse.json({
      success: true,
      portal_token: portalToken,
      case_id: caseId,
      intern_id: internId,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, { status: 500 })
  }
}

