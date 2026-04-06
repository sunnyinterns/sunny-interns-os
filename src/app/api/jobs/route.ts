import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'all'

  try {
    let query = supabase
      .from('jobs')
      .select('*, companies(id, name), job_contacts(id, name, email)')
      .order('created_at', { ascending: false })

    if (status === 'open') query = query.eq('status', 'open')
    else if (status === 'staffed') query = query.eq('status', 'staffed')
    else if (status === 'ending_soon') {
      const soon = new Date()
      soon.setDate(soon.getDate() + 14)
      query = query.eq('status', 'open').lte('end_date', soon.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 }) // graceful fallback
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as Record<string, unknown>
    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...body, status: 'open', created_by: user.id })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
