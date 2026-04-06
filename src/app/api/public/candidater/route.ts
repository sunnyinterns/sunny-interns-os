import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendNewLeadInternal } from '@/lib/email/resend'

const schema = z.object({
  // Step 1 — Identité
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  birth_date: z.string().optional(),
  sexe: z.string().optional(),
  nationality: z.string().optional(),
  // Step 2 — Passeport
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  passport_issue_city: z.string().optional(),
  passport_issue_date: z.string().optional(),
  // Step 3 — École
  school: z.string().optional(),
  intern_level: z.string().optional(),
  diploma_track: z.string().optional(),
  school_contact_name: z.string().optional(),
  school_contact_email: z.string().optional(),
  school_contact_phone: z.string().optional(),
  // Step 4 — Stage
  desired_start_date: z.string().optional(),
  desired_duration: z.string().optional(),
  main_desired_job: z.string().optional(),
  spoken_languages: z.array(z.string()).optional(),
  linkedin_url: z.string().optional(),
  comment: z.string().optional(),
  touchpoint: z.string().optional(),
  // Step 5 — Urgence + RGPD
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  rgpd: z.boolean(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  // Use service role for public submission (no user session)
  const supabase = await createClient()

  // 1. Check email unique
  const { data: existing } = await supabase
    .from('interns')
    .select('id')
    .eq('email', d.email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Un dossier avec cet email existe déjà.' }, { status: 409 })
  }

  // Passport validity check: expiry must be 6+ months after desired start date
  if (d.passport_expiry && d.desired_start_date) {
    const arrival = new Date(d.desired_start_date)
    const expiry = new Date(d.passport_expiry)
    const limit = new Date(arrival)
    limit.setMonth(limit.getMonth() + 6)
    if (expiry < limit) {
      return NextResponse.json(
        { error: 'Attention : ton passeport expire moins de 6 mois après ta date d\'arrivée. Tu dois le renouveler avant de candidater.' },
        { status: 422 }
      )
    }
  }

  try {
    // 2. INSERT intern
    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        first_name: d.first_name,
        last_name: d.last_name,
        email: d.email,
        phone: d.whatsapp,
        nationality: d.nationality,
        birth_date: d.birth_date || null,
        passport_number: d.passport_number || null,
        passport_expiry: d.passport_expiry || null,
        passport_issue_city: d.passport_issue_city || null,
        passport_issue_date: d.passport_issue_date || null,
        intern_level: d.intern_level || null,
        diploma_track: d.diploma_track || null,
        main_desired_job: d.main_desired_job || null,
        spoken_languages: d.spoken_languages || null,
        linkedin_url: d.linkedin_url || null,
        school_contact_name: d.school_contact_name || null,
        school_contact_email: d.school_contact_email || null,
        emergency_contact_name: d.emergency_contact_name || null,
        emergency_contact_phone: d.emergency_contact_phone || null,
        touchpoint: d.touchpoint || null,
      })
      .select()
      .single()

    if (internError) return NextResponse.json({ error: internError.message }, { status: 500 })

    // 3. INSERT case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        first_name: d.first_name,
        last_name: d.last_name,
        status: 'lead',
        arrival_date: d.desired_start_date || null,
        internship_type: 'stage',
        notes: d.comment || null,
      })
      .select()
      .single()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })

    // 4. INSERT activity_feed
    try {
      await supabase.from('activity_feed').insert({
        case_id: newCase.id,
        action_type: 'case_created',
        description: `Candidature publique de ${d.first_name} ${d.last_name}`,
      })
    } catch { /* non-blocking */ }

    // 5. Send email to Charly
    await sendNewLeadInternal({
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      startDate: d.desired_start_date ? new Date(d.desired_start_date).toLocaleDateString('fr-FR') : null,
      duration: d.desired_duration ? `${d.desired_duration} mois` : null,
      passportExpiry: d.passport_expiry || null,
      startDateValue: d.desired_start_date || null,
      desiredJob: d.main_desired_job || null,
      comment: d.comment || null,
      caseId: newCase.id,
    })

    return NextResponse.json({ case_id: newCase.id, intern_id: intern.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
