import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const key = form.get('key') as string | null

  if (!file || !key) return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  // Path fixe par key — pas de timestamp, on écrase toujours le même fichier
  const storagePath = `logos/${key}.${ext}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await sb.storage
    .from('brand-assets')
    .upload(storagePath, bytes, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
    })

  if (uploadError) {
    console.error('[brand-assets upload]', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // URL avec cache-buster pour forcer le rafraîchissement navigateur
  const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(storagePath)
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  // Update brand_assets — UPDATE puis INSERT si absent
  const { error: updateErr } = await sb
    .from('brand_assets')
    .update({ url: publicUrl, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (updateErr) {
    // Fallback : essayer upsert
    await sb.from('brand_assets').upsert({ key, url: publicUrl }, { onConflict: 'key' })
  }

  console.log(`[brand-assets upload] ✅ ${key} → ${storagePath}`)
  return NextResponse.json({ url: publicUrl, key, path: storagePath })
}
