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
  const storagePath = `logos/${key}.${ext}`
  const bytes = await file.arrayBuffer()

  // Upload dans Storage — upsert écrase le fichier existant
  const { error: uploadError } = await sb.storage
    .from('brand-assets')
    .upload(storagePath, bytes, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
    })

  if (uploadError) {
    console.error('[brand-assets upload]', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // URL avec cache-buster UNIQUE à chaque upload → force le refresh navigateur
  const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(storagePath)
  const v = Date.now()
  const publicUrl = `${urlData.publicUrl}?v=${v}`

  // Upsert avec onConflict sur la clé — fonctionne même si la ligne n'existe pas
  const { error: upsertErr } = await sb
    .from('brand_assets')
    .upsert(
      {
        key,
        url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (upsertErr) {
    console.error('[brand-assets upsert]', upsertErr.message)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  console.log(`[brand-assets upload] ✅ ${key} → ${storagePath}?v=${v}`)
  return NextResponse.json({ url: publicUrl, key, path: storagePath })
}
