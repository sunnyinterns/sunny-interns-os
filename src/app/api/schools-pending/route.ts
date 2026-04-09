import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name: string
      city?: string
      country?: string
      website?: string
      submitted_by_email?: string
    }

    if (!body.name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Create pending school
    const { data: school, error: schoolError } = await supabase
      .from('schools_pending')
      .insert({
        name: body.name,
        city: body.city ?? null,
        country: body.country ?? null,
        website: body.website ?? null,
        submitted_by_email: body.submitted_by_email ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (schoolError) {
      return NextResponse.json({ error: schoolError.message }, { status: 500 })
    }

    // Create admin notification
    await supabase.from('admin_notifications').insert({
      type: 'school_pending',
      title: 'Nouvelle école à valider',
      message: `École soumise: ${body.name}`,
      link: '/fr/settings/schools',
      metadata: { school_pending_id: school.id, school_name: body.name },
    })

    return NextResponse.json({ id: school.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
