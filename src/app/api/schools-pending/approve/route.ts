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
    const { id } = await request.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const supabase = getServiceClient()

    // Get pending school
    const { data: pending, error: fetchErr } = await supabase
      .from('schools_pending')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !pending) {
      return NextResponse.json({ error: 'École non trouvée' }, { status: 404 })
    }

    // Insert into schools
    const { data: school, error: insertErr } = await supabase
      .from('schools')
      .insert({
        name: pending.name,
        city: pending.city,
        country: pending.country,
        website: pending.website,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Update pending status
    await supabase
      .from('schools_pending')
      .update({ status: 'approved', merged_into_school_id: school.id })
      .eq('id', id)

    return NextResponse.json({ school_id: school.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
