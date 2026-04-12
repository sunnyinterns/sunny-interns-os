import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type Body = {
  email?: string
  source?: string
  sub_source?: string
  form_step?: number
  first_name?: string
  last_name?: string
  desired_jobs?: string[]
  desired_start_date?: string
  school_country?: string
  spoken_languages?: string[]
  touchpoint?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { email, source = 'website_form_unfinished', form_step, ...rest } = body

    if (!email || typeof email !== 'string') return NextResponse.json({ ok: false })
    const normalized = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return NextResponse.json({ ok: false })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Si déjà candidat complet, ne rien faire
    const { data: existingIntern } = await supabase
      .from('interns')
      .select('id, first_name')
      .eq('email', normalized)
      .maybeSingle()

    if (existingIntern?.first_name) {
      return NextResponse.json({ ok: false, reason: 'already_candidate' })
    }

    // Filtrer les champs undefined pour ne pas écraser avec null
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (form_step !== undefined) updateFields.form_step = form_step
    if (rest.first_name) updateFields.first_name = rest.first_name
    if (rest.last_name) updateFields.last_name = rest.last_name
    if (rest.desired_jobs?.length) updateFields.desired_jobs = rest.desired_jobs
    if (rest.desired_start_date) updateFields.desired_start_date = rest.desired_start_date
    if (rest.school_country) updateFields.school_country = rest.school_country
    if (rest.spoken_languages?.length) updateFields.spoken_languages = rest.spoken_languages
    if (rest.touchpoint) updateFields.touchpoint = rest.touchpoint
    if (rest.sub_source) updateFields.sub_source = rest.sub_source

    // UPSERT atomique — évite les race conditions du mobile qui envoie plusieurs requêtes simultanées
    const { data: lead, error } = await supabase
      .from('leads')
      .upsert(
        {
          email: normalized,
          source,
          status: 'new',
          abandon_reason: 'form_abandoned',
          ...updateFields,
        },
        {
          onConflict: 'email,source',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[capture-email] upsert error:', error)
      return NextResponse.json({ ok: false, error: error.message })
    }

    return NextResponse.json({ ok: true, lead_id: lead?.id, action: 'upserted' })
  } catch (e) {
    console.error('[capture-email]', e)
    return NextResponse.json({ ok: false })
  }
}
