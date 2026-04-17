import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const formData = await request.formData()
  const file = formData.get('file') as File
  const key = formData.get('key') as string
  if (!file || !key) return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `fonts/${key}.${ext}`
  const { error } = await sb.storage.from('brand-assets').upload(path, file, { upsert: true, contentType: file.type || 'font/woff2' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(path)
  await sb.from('font_assets').update({ url: urlData.publicUrl, file_name: file.name, updated_at: new Date().toISOString() }).eq('key', key)

  return NextResponse.json({ url: urlData.publicUrl, file_name: file.name })
}
