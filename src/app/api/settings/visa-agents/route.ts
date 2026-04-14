import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('visa_agents').select('*').order('company_name', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as Record<string, unknown>
  if (!body.name && body.company_name) body.name = body.company_name
  const { data, error } = await supabase.from('visa_agents').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.is_default === true && data) {
    await supabase.from('visa_agents').update({ is_default: false }).neq('id', data.id)
  }
  return NextResponse.json(data, { status: 201 })
}
