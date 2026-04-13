import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data } = await admin().from('app_settings').select('key, value, label').order('key')
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await req.json() as { key: string; value: string }
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 })
  const { data, error } = await admin().from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
