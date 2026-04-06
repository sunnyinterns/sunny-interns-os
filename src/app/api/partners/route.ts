import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/partners?destination=bali&type=pre_arrival
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('destination')
  const type = searchParams.get('type')

  // Public endpoint for verify page (no auth required for GET)
  try {
    let query = supabase
      .from('partners')
      .select('id, name, logo_url, offer_short, partner_type, category, is_active, destination_id')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (type) query = query.eq('partner_type', type)
    if (destination) query = query.ilike('destination_id', `%${destination}%`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/partners — admin only
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as Record<string, unknown>
    const { data, error } = await supabase
      .from('partners')
      .insert({
        name: body.name,
        logo_url: body.logo_url ?? null,
        offer_short: body.offer_short ?? null,
        partner_type: body.partner_type ?? 'on_site',
        category: body.category ?? null,
        destination_id: body.destination_id ?? 'bali',
        is_active: body.is_active ?? true,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
