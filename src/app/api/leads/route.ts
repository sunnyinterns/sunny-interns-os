import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const status = searchParams.get('status')

  let query = admin.from('leads').select('*').order('created_at', { ascending: false }).limit(200)
  if (source) query = query.eq('source', source)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = (await request.json()) as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  if (!email) return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 })

  const { data: existing } = await admin.from('leads').select('id').eq('email', email).maybeSingle()
  if (existing) return NextResponse.json({ error: 'EMAIL_ALREADY_EXISTS' }, { status: 409 })

  const { data, error } = await admin.from('leads').insert({ ...body, email }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
