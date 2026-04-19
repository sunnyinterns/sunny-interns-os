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
  const { data, error } = await admin()
    .from('website_content')
    .select('*')
    .order('section_key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { section_key, value } = body
  if (!section_key) return NextResponse.json({ error: 'section_key required' }, { status: 400 })

  const { error } = await admin()
    .from('website_content')
    .update({ value, updated_at: new Date().toISOString(), updated_by: user.email })
    .eq('section_key', section_key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { section_key, content_type, value, locale, label, description } = body
  if (!section_key || !content_type) return NextResponse.json({ error: 'section_key + content_type required' }, { status: 400 })

  const { error } = await admin()
    .from('website_content')
    .upsert({
      section_key,
      content_type,
      value: value || '',
      locale: locale || 'all',
      label: label || section_key,
      description: description || '',
      updated_at: new Date().toISOString(),
      updated_by: user.email,
    }, { onConflict: 'section_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
