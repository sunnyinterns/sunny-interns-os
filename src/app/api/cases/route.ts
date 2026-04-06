import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const assignedTo = searchParams.get('assigned_to')
  const month = searchParams.get('month') // YYYY-MM
  const email = searchParams.get('email')

  // Email check for duplicate detection (intern-check alternative)
  if (email) {
    try {
      const { data } = await supabase
        .from('interns')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      return NextResponse.json({ exists: !!data })
    } catch {
      return NextResponse.json({ exists: false })
    }
  }

  try {
    let query = supabase
      .from('cases')
      .select(`
        id, first_name, last_name, status, arrival_date, return_date,
        created_at, updated_at, assigned_to,
        interns ( id, email, phone, avatar_url ),
        jobs ( id, title, company_id )
      `)
      .order('arrival_date', { ascending: true })

    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (month) {
      const start = `${month}-01`
      const end = `${month}-31`
      query = query.gte('arrival_date', start).lte('arrival_date', end)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  try {
    // 1. Check email uniqueness
    const { data: existing } = await supabase
      .from('interns')
      .select('id')
      .eq('email', body.email)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

    // 2. Create intern
    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        nationality: body.nationality,
        birth_date: body.birth_date,
        passport_number: body.passport_number,
        passport_expiry: body.passport_expiry,
      })
      .select()
      .single()

    if (internError) return NextResponse.json({ error: internError.message }, { status: 500 })

    // 3. Create case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        status: 'lead',
        arrival_date: body.start_date,
        destination: body.destination,
        dropoff_address: body.dropoff_address,
        internship_type: body.internship_type,
        notes: body.notes,
        assigned_to: user.id,
      })
      .select()
      .single()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })

    // 4. Log activity
    try {
      await supabase.from('activity_feed').insert({
        case_id: newCase.id,
        action_type: 'case_created',
        description: `Dossier créé pour ${body.first_name} ${body.last_name}`,
        created_by: user.id,
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json(newCase, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
