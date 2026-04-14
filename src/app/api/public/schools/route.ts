import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const country = request.nextUrl.searchParams.get('country') ?? ''
  if (q.length < 2 && !country) return NextResponse.json([])

  const supabase = getServiceClient()
  let query = supabase
    .from('schools')
    .select('id, name, city, country')
    .order('name')

  if (q.length >= 2) query = query.ilike('name', `%${q}%`)
  if (country) query = query.ilike('country', `%${country}%`)

  const { data, error } = await query.limit(15)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
