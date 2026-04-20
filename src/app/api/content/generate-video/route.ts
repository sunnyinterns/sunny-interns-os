import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import path from 'path'

export const maxDuration = 300 // 5 min — génération vidéo longue

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id, format = 'square' } = await req.json() as {
    job_id: string
    format?: 'square' | 'story' | 'landscape'
  }
  if (!job_id) return NextResponse.json({ error: 'job_id requis' }, { status: 400 })

  // Récupérer les données du job
  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: job, error: jobErr } = await sb
    .from('jobs')
    .select('id, public_title, title, location, wished_duration_months, public_hook, public_vibe, public_perks, cover_image_url, companies(name, logo_url)')
    .eq('id', job_id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })

  // Importer Remotion dynamiquement (pas disponible dans le browser)
  const { bundle } = await import('@remotion/bundler')
  const { renderMedia, selectComposition } = await import('@remotion/renderer')

  const compositionId = format === 'story' ? 'JobVideoStory' : 'JobVideo'
  const entryPoint = path.resolve('./src/remotion/index.tsx')

  const jobData = job as {
    id: string
    public_title: string | null
    title: string
    location: string | null
    wished_duration_months: number | null
    public_hook: string | null
    public_vibe: string | null
    public_perks: string[] | null
    cover_image_url: string | null
    companies?: { name: string; logo_url: string | null } | null
  }

  const inputProps = {
    title: jobData.public_title ?? jobData.title,
    company: jobData.companies?.name ?? '',
    location: jobData.location ?? 'Bali, Indonésie',
    duration: jobData.wished_duration_months ? `${jobData.wished_duration_months} mois` : '',
    hook: jobData.public_hook ?? '',
    perks: jobData.public_perks?.filter(Boolean) ?? [],
    coverImageUrl: jobData.cover_image_url ?? undefined,
    logoUrl: jobData.companies && 'logo_url' in jobData.companies
      ? (jobData.companies as { logo_url: string | null }).logo_url ?? undefined
      : undefined,
    brandColor: '#F5A623',
  }

  try {
    // Bundle Remotion
    const bundled = await bundle({ entryPoint, webpackOverride: (config) => config })

    // Sélectionner la composition
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps,
    })

    // Render en MP4
    const tmpPath = `/tmp/job_${job_id}_${format}_${Date.now()}.mp4`
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: tmpPath,
      inputProps,
    })

    // Upload vers Supabase Storage
    const { readFileSync } = await import('fs')
    const videoBuffer = readFileSync(tmpPath)
    const storagePath = `videos/${job_id}/${format}_${Date.now()}.mp4`

    const { error: uploadErr } = await sb.storage
      .from('brand-assets')
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(storagePath)

    // Sauvegarder dans social_posts
    await sb.from('social_posts').insert({
      job_id,
      platform: format === 'story' ? 'instagram' : 'linkedin',
      lang: 'fr',
      content: inputProps.hook || inputProps.title,
      hashtags: [],
      image_url: urlData.publicUrl,
      image_prompt: `video_${compositionId}`,
      status: 'draft',
      created_by: user.id,
    })

    // Nettoyer le fichier tmp
    const { unlinkSync } = await import('fs')
    try { unlinkSync(tmpPath) } catch { /* ignore */ }

    return NextResponse.json({ success: true, video_url: urlData.publicUrl, format })

  } catch (e) {
    console.error('Remotion render error:', e)
    return NextResponse.json({ error: `Render failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 500 })
  }
}
