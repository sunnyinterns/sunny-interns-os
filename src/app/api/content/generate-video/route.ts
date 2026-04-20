import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import path from 'path'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id, format = 'square' } = await req.json() as { job_id: string; format?: string }
  if (!job_id) return NextResponse.json({ error: 'job_id requis' }, { status: 400 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: job, error: jobErr } = await sb
    .from('jobs')
    .select('id, public_title, title, location, wished_duration_months, public_hook, public_perks, cover_image_url, companies(name, logo_url)')
    .eq('id', job_id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })

  try {
    // Import dynamique — évite que Turbopack bundle les binaires esbuild
    const { bundle } = await import('@remotion/bundler')
    const { renderMedia, selectComposition } = await import('@remotion/renderer')
    const { readFileSync, unlinkSync } = await import('fs')

    const jobData = job as {
      id: string; public_title: string | null; title: string
      location: string | null; wished_duration_months: number | null
      public_hook: string | null; public_perks: string[] | null
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
      brandColor: '#F5A623',
    }

    const compositionId = format === 'story' ? 'JobVideoStory' : 'JobVideo'
    const entryPoint = path.resolve('./src/remotion/index.tsx')

    const bundled = await bundle({ entryPoint, webpackOverride: (c) => c })
    const composition = await selectComposition({ serveUrl: bundled, id: compositionId, inputProps })

    const tmpPath = `/tmp/job_${job_id}_${format}_${Date.now()}.mp4`
    await renderMedia({ composition, serveUrl: bundled, codec: 'h264', outputLocation: tmpPath, inputProps })

    const videoBuffer = readFileSync(tmpPath)
    const storagePath = `videos/${job_id}/${format}_${Date.now()}.mp4`

    const { error: uploadErr } = await sb.storage
      .from('brand-assets')
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(storagePath)
    try { unlinkSync(tmpPath) } catch { /* ignore */ }

    return NextResponse.json({ success: true, video_url: urlData.publicUrl, format })
  } catch (e) {
    return NextResponse.json({ error: `Render failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 500 })
  }
}
