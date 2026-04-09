import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '30')
  const status = searchParams.get('status') // 'upcoming', 'all', 'cancelled'

  const now = new Date()
  const future = new Date(now.getTime() + days * 86400000)

  let query = supabase
    .from('calendar_events')
    .select('*')
    .order('start_datetime', { ascending: true })

  if (status !== 'all') {
    if (status === 'cancelled') {
      query = query.eq('status', 'cancelled')
    } else {
      query = query.gte('start_datetime', now.toISOString())
      query = query.lte('start_datetime', future.toISOString())
      query = query.eq('status', 'confirmed')
    }
  }

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
