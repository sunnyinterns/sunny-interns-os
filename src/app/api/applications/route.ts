import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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
    const durationMonths = d.duration ? parseInt(d.duration) : null
    const allJobs = [...(d.desired_jobs ?? []), ...(d.custom_jobs ?? [])]

    // School pending si introuvable
    const dExt = d as unknown as Record<string,unknown>
    if (dExt.school_not_found && dExt.school_custom_name) {
      await supabase.from('schools_pending').insert({
        name: String(dExt.school_custom_name ?? ''),
        submitted_by_email: d.email,
      }).then(() => null, () => null)
    }

    const internFields = {
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      whatsapp: d.whatsapp,
      nationality: d.nationalities?.[0] ?? null,
      nationalities: d.nationalities ?? [],
      school_country: d.school_country ?? null,
      birth_date: d.birth_date || null,
      passport_expiry: d.passport_expiry || null,
      linkedin_url: d.linkedin_url ?? null,
      cv_url: d.cv_url ?? null,
      local_cv_url: d.local_cv_url ?? null,
      spoken_languages: d.spoken_languages ?? [],
      main_desired_job: allJobs[0] ?? null,
      stage_ideal: d.stage_ideal ?? null,
      touchpoint: d.touchpoints?.join(', ') ?? d.touchpoint ?? null,
      touchpoints: d.touchpoints ?? [],
      referred_by_code: d.referred_by_code ?? null,
      commitment_price_accepted: d.commitment_price_accepted ?? true,
      commitment_budget_accepted: d.commitment_budget_accepted ?? true,
      commitment_terms_accepted: d.commitment_terms_accepted ?? true,
      commitment_accepted_at: new Date().toISOString(),
      commitment_ip: ip,
      preferred_language: 'fr',
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
          desired_start_date: d.start_date || null,
          desired_duration_months: durationMonths,
          desired_sectors: allJobs,
          school_id: d.school_id ?? null,
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
          desired_sectors: allJobs,
          school_id: d.school_id ?? null,
          portal_token: portalToken,
          assigned_manager_name: 'Charly Gestede',
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
        desired_sectors: allJobs,
        school_id: d.school_id ?? null,
        portal_token: portalToken,
        assigned_manager_name: 'Charly Gestede',
        intern_first_meeting_date: d.rdv_slot ?? null,
      }).select('id').single()
      if (ncErr) return NextResponse.json({ error: ncErr.message }, { status: 500 })
      caseId = nc.id
    }

    // Log activity_feed
    await supabase.from('activity_feed').insert({
      case_id: caseId,
      type: 'case_created',
      title: `${d.first_name} ${d.last_name} a candidaté`,
      description: `Nouvelle candidature de ${d.first_name} ${d.last_name} - ${d.email}`,
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

    // Email confirmation candidat
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Bali Interns <hello@bali-interns.com>',
          to: [d.email],
          subject: `Ta candidature Bali Interns est bien reçue, ${d.first_name} ! 🌴`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px"><h2>Félicitations ${d.first_name} ! 🎉</h2><p>Ta candidature pour un stage à Bali a bien été reçue.</p><p>Tu recevras très bientôt un email de confirmation pour ton entretien de qualification.</p><p style="color:#888;font-size:13px">Questions ? <a href="mailto:team@bali-interns.com" style="color:#c8a96e">team@bali-interns.com</a></p><p>À très vite,<br/><strong>L'équipe Bali Interns 🌴</strong></p></div>`,
        })
      }).catch(() => null)
    }

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

