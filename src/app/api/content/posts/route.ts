import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'

// GET — lister les posts (avec filtres optionnels)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get('job_id')
  const platform = searchParams.get('platform')
  const status = searchParams.get('status')

  let q = sb.from('social_posts').select(`
    id, job_id, platform, lang, tone, content, hashtags,
    image_url, image_prompt, status, published_at, created_at,
    jobs(id, title, public_title, companies(id, name))
  `).order('created_at', { ascending: false }).limit(50)

  if (job_id) q = q.eq('job_id', job_id)
  if (platform) q = q.eq('platform', platform)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — sauvegarder un post généré
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json() as {
    job_id?: string; platform: string; lang?: string; tone?: string
    content: string; hashtags?: string[]; image_url?: string; image_prompt?: string; status?: string
  }

  const { data, error } = await sb.from('social_posts').insert({
    job_id: body.job_id ?? null,
    platform: body.platform,
    lang: body.lang ?? 'fr',
    tone: body.tone ?? null,
    content: body.content,
    hashtags: body.hashtags ?? [],
    image_url: body.image_url ?? null,
    image_prompt: body.image_prompt ?? null,
    status: body.status ?? 'draft',
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — changer le statut d'un post
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { id, status, content, hashtags } = await req.json() as { id: string; status?: string; content?: string; hashtags?: string[] }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) { patch.status = status; if (status === 'published') patch.published_at = new Date().toISOString() }
  if (content !== undefined) patch.content = content
  if (hashtags !== undefined) patch.hashtags = hashtags

  const { data, error } = await sb.from('social_posts').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
