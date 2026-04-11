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

    if (existingIntern && existingIntern.first_name && existingIntern.first_name.length > 0) {
      return NextResponse.json({ ok: false, reason: 'already_candidate' })
    }

    // Lead existant ? update
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, form_step')
      .eq('email', normalized)
      .maybeSingle()

    if (existingLead) {
      await supabase
        .from('leads')
        .update({
          form_step: form_step ?? existingLead.form_step,
          ...rest,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
      return NextResponse.json({ ok: true, lead_id: existingLead.id, action: 'updated' })
    }

    // Nouveau lead
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        email: normalized,
        source,
        form_step: form_step ?? 0,
        abandon_reason: 'form_abandoned',
        status: 'new',
        ...rest,
      })
      .select('id')
      .single()

    return NextResponse.json({ ok: true, lead_id: lead?.id, action: 'created' })
  } catch (e) {
    console.error('[capture-email]', e)
    return NextResponse.json({ ok: false })
  }
}
