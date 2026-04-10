import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, source } = (await req.json()) as { email?: string; source?: string }
    if (!email || typeof email !== 'string') return NextResponse.json({ ok: false })

    const normalized = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return NextResponse.json({ ok: false })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await supabase
      .from('interns')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()

    if (existing) return NextResponse.json({ ok: false, reason: 'already_exists' })

    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        email: normalized,
        first_name: '',
        last_name: '',
        source: source ?? 'website_form_unfinished',
        preferred_language: 'fr',
      })
      .select('id')
      .single()

    if (internError || !intern) return NextResponse.json({ ok: false })

    await supabase.from('cases').insert({
      intern_id: intern.id,
      status: 'lead',
      destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
