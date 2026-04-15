import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const key = form.get('key') as string | null

  if (!file || !key) return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `brand/${key}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path)

  await supabase
    .from('brand_assets')
    .upsert({ key, url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  return NextResponse.json({ url: publicUrl })
}
