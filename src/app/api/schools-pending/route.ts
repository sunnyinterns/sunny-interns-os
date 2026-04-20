import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('schools_pending')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
