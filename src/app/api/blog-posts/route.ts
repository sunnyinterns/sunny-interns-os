import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  let query = supabase
    .from('blog_posts')
    .select('id, slug, title_en, title_fr, category, tags, status, featured, published_at, updated_at, cover_image_url, author_name, reading_time_min')
    .order('updated_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (category && category !== 'all') query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>

  const insert: Record<string, unknown> = {
    slug: body.slug,
    title_en: body.title_en,
    title_fr: body.title_fr ?? null,
    body_en: body.body_en ?? '',
    body_fr: body.body_fr ?? null,
    excerpt_en: body.excerpt_en ?? null,
    excerpt_fr: body.excerpt_fr ?? null,
    seo_title_en: body.seo_title_en ?? null,
    seo_title_fr: body.seo_title_fr ?? null,
    seo_desc_en: body.seo_desc_en ?? null,
    seo_desc_fr: body.seo_desc_fr ?? null,
    category: body.category ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    cover_image_url: body.cover_image_url ?? null,
    author_name: body.author_name ?? user.email ?? 'Bali Interns',
    author_id: user.id,
    status: body.status ?? 'draft',
    featured: Boolean(body.featured ?? false),
    reading_time_min: body.reading_time_min ? Number(body.reading_time_min) : null,
    published_at: body.status === 'published' ? (body.published_at ?? new Date().toISOString()) : null,
  }

  const { data, error } = await supabase.from('blog_posts').insert(insert).select().single()
  if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
